import { MarkdownRenderer, setIcon } from "obsidian";
import { ViewFilters, ViewLayout, TaskStatus } from "../types";
import type TaskRolesPlugin from "../main";

export class TaskQueryService {
	private plugin: TaskRolesPlugin;

	constructor(plugin: TaskRolesPlugin) {
		this.plugin = plugin;
	}

	private isTasksPluginInstalled(): boolean {
		// Check if the Tasks plugin is installed and enabled
		const pluginManager = (this.plugin.app as any).plugins;
		const tasksPluginName = "obsidian-tasks-plugin";
		const isInstalled = tasksPluginName in pluginManager.manifests;
		if (this.plugin.settings.debug)
			console.log(pluginManager.manifests, tasksPluginName, isInstalled);
		const isEnabled = pluginManager.enabledPlugins.has(tasksPluginName);
		const targetInstance = pluginManager.getPlugin(tasksPluginName);
		const isLoaded = targetInstance !== undefined;
		return isInstalled && isEnabled && isLoaded;
	}

	private displayTasksPluginNotice(
		columnDiv: HTMLElement,
		onRefresh?: () => void
	): void {
		const noticeDiv = columnDiv.createDiv("tasks-plugin-notice");
		noticeDiv.style.padding = "20px";
		noticeDiv.style.textAlign = "center";
		noticeDiv.style.color = "var(--text-muted)";
		noticeDiv.style.border = "2px dashed var(--background-modifier-border)";
		noticeDiv.style.borderRadius = "8px";
		noticeDiv.style.margin = "10px 0";
		noticeDiv.style.backgroundColor = "var(--background-secondary)";

		// Warning icon
		const iconDiv = noticeDiv.createDiv();
		iconDiv.style.marginBottom = "10px";
		const iconSpan = iconDiv.createSpan();
		setIcon(iconSpan, "alert-triangle");
		iconSpan.style.width = "24px";
		iconSpan.style.height = "24px";
		iconSpan.style.color = "var(--text-warning)";

		// Notice text
		const textDiv = noticeDiv.createDiv();
		textDiv.style.fontSize = "14px";
		textDiv.style.lineHeight = "1.4";

		const titleEl = textDiv.createEl("div");
		titleEl.style.fontWeight = "bold";
		titleEl.style.marginBottom = "8px";
		titleEl.style.color = "var(--text-normal)";
		titleEl.textContent = "Tasks Plugin Required";

		const descEl = textDiv.createEl("div");
		descEl.style.marginBottom = "12px";
		descEl.textContent =
			"The Task Center requires the Tasks plugin to be installed and enabled to display task columns.";

		// Instructions
		const instructionsEl = textDiv.createEl("div");
		instructionsEl.style.fontSize = "12px";
		instructionsEl.style.color = "var(--text-muted)";
		instructionsEl.style.marginBottom = "15px";

		// Create instruction text using DOM API instead of innerHTML
		instructionsEl.appendChild(document.createTextNode("Install the "));
		const strongEl = instructionsEl.createEl("strong");
		strongEl.textContent = "Tasks";
		instructionsEl.appendChild(
			document.createTextNode(
				" plugin from Community Plugins and enable it to use this feature."
			)
		);

		// Refresh button if callback provided
		if (onRefresh) {
			const refreshButton = noticeDiv.createEl("button", {
				cls: "mod-cta",
			});
			refreshButton.textContent = "Check Again";
			refreshButton.style.marginTop = "10px";
			refreshButton.style.padding = "6px 12px";
			refreshButton.onclick = onRefresh;
		}
	}

	buildTaskQueryFromFilters(filters: ViewFilters): string {
		const queryLines: string[] = [];

		// Check if we need to use cross product logic for roles + assignees
		const hasRoles = filters.roles && filters.roles.length > 0;
		const hasPeople = filters.people && filters.people.length > 0;
		const hasCompanies = filters.companies && filters.companies.length > 0;
		const hasAssignees = hasPeople || hasCompanies;
		const hasAll = hasRoles && filters.roles!.includes("all");

		if (hasRoles && hasAssignees && !hasAll) {
			// Use cross product logic when both roles and assignees are present
			this.buildCrossProductQuery(filters, queryLines);
		} else {
			// Use separate logic for roles and assignees
			this.buildRoleQuery(filters, queryLines);
			this.buildAssigneeQuery(filters, queryLines);
		}

		// Convert status filters to query syntax
		if (filters.statuses && filters.statuses.length > 0) {
			// In the status view, todo column means not done and not in progress
			// and done column means done and not cancelled.
			if (filters.statuses.length === 1) {
				const status = filters.statuses[0];
				if (status === "todo") {
					queryLines.push("not done");
					queryLines.push(
						"filter by function task.status.type !== 'IN_PROGRESS'"
					); // Exclude in-progress tasks
				} else if (status === "done") {
					queryLines.push("done");
					queryLines.push(
						"filter by function task.status.type !== 'CANCELLED'"
					); // Exclude cancelled tasks
				} else if (status === "in-progress") {
					queryLines.push(
						"filter by function task.status.type === 'IN_PROGRESS'"
					);
				} else if (status === "cancelled") {
					queryLines.push(
						"filter by function task.status.type === 'CANCELLED'"
					);
				} else {
					queryLines.push(
						`filter by function task.status.type === '${(
							status as string
						).toUpperCase()}'`
					);
				}
			} else {
				// For multiple status filters, check if we can use Tasks plugin syntax
				const hasOnlyTodoAndDone = filters.statuses.every(
					(status) => status === "todo" || status === "done"
				);

				if (hasOnlyTodoAndDone) {
					// Check if both todo and done are selected - this covers all tasks
					const hasTodo = filters.statuses.includes(TaskStatus.TODO);
					const hasDone = filters.statuses.includes(TaskStatus.DONE);

					if (hasTodo && hasDone) {
						// In filters, todo should mean not done and not in progress (we can skip the in-progress check here, because it is implied)
						queryLines.push(
							"filter by function task.status.type !== 'IN_PROGRESS'"
						); // Exclude in-progress tasks
						// And done should mean done and not cancelled (we can skip the done check here, because it is implied))
						queryLines.push(
							"filter by function task.status.type !== 'CANCELLED'"
						); // Exclude cancelled tasks
					} else if (hasTodo) {
						queryLines.push("not done");
					} else if (hasDone) {
						queryLines.push("done");
					}
				} else {
					// For mixed statuses, use consistent task.status.type for all statuses
					const statusConditions: string[] = [];
					for (const status of filters.statuses) {
						if (status === "todo") {
							statusConditions.push(
								"task.status.type === 'TODO'"
							);
						} else if (status === "done") {
							statusConditions.push(
								"task.status.type === 'DONE'"
							);
						} else if (status === "in-progress") {
							statusConditions.push(
								"task.status.type === 'IN_PROGRESS'"
							);
						} else if (status === "cancelled") {
							statusConditions.push(
								"task.status.type === 'CANCELLED'"
							);
						} else {
							statusConditions.push(
								`task.status.type === '${(
									status as string
								).toUpperCase()}'`
							);
						}
					}
					queryLines.push(
						`filter by function (${statusConditions.join(" || ")})`
					);
				}
			}
		}

		// Convert priority filters to query syntax
		if (filters.priorities && filters.priorities.length > 0) {
			if (filters.priorities.length === 1) {
				const priority = filters.priorities[0];
				queryLines.push(`priority is ${priority}`);
			} else {
				const priorityQueries = filters.priorities.map((priority) => {
					return `(priority is ${priority})`;
				});
				queryLines.push(`${priorityQueries.join(" OR ")}`);
			}
		}

		// Convert tag filters to query syntax
		if (filters.tags && filters.tags.length > 0) {
			if (filters.tags.length === 1) {
				queryLines.push(`#${filters.tags[0]}`);
			} else {
				const tagQueries = filters.tags.map((tag) => `#${tag}`);
				queryLines.push(`(${tagQueries.join(" OR ")})`);
			}
		}

		// Convert date range filters to query syntax
		if (filters.dateRange && filters.dateType) {
			const { from, to, includeNotSet } = filters.dateRange;
			const dateType = filters.dateType;

			const dateParts: string[] = [];

			// Handle "Include no dates" checkbox
			if (includeNotSet) {
				dateParts.push(`(no ${dateType} date)`);
			}

			// For start date, we say "starts" instead of "start"
			const dateTypeForQuery = dateType === "start" ? "starts" : dateType;

			// Handle date range logic
			if (from && to) {
				// Both dates provided - use after/before format for range
				const fromDate = from.toISOString().split("T")[0];
				const toDate = to.toISOString().split("T")[0];
				dateParts.push(`(${dateTypeForQuery} ${fromDate} ${toDate})`);
			} else if (from) {
				// Only from date provided - use after
				const fromDate = from.toISOString().split("T")[0];
				dateParts.push(`(${dateTypeForQuery} ${fromDate})`);
			} else if (to) {
				// Only to date provided - use before
				const toDate = to.toISOString().split("T")[0];
				dateParts.push(`(${dateTypeForQuery} ${toDate})`);
			}

			if (dateParts.length > 0) {
				// No complex logic needed - just join appropriately
				const joinOperator = " OR ";
				queryLines.push(`${dateParts.join(joinOperator)}`);
				// Handle complex logic for combining no date with date range
				if (0 && includeNotSet && (from || to)) {
					// Separate no date from actual date filters
					const noDateParts = dateParts.filter((part) =>
						part.includes("no ")
					);
					const dateParts2 = dateParts.filter(
						(part) => !part.includes("no ")
					);

					if (dateParts2.length > 1) {
						// Multiple date parts (range) - join with AND, then OR with no date
						queryLines.push(
							`(${noDateParts.join(" OR ")} OR (${dateParts2.join(
								" AND "
							)}))`
						);
					} else if (dateParts2.length === 1) {
						// Single date part - OR with no date
						queryLines.push(
							`(${noDateParts.join(" OR ")} OR ${dateParts2.join(
								" OR "
							)})`
						);
					} else {
						// Only no date parts
						queryLines.push(`(${noDateParts.join(" OR ")})`);
					}
				} else {
				}
			}
		}

		// Convert text search to query syntax
		if (filters.textSearch && filters.textSearch.trim()) {
			queryLines.push(
				`description includes ${filters.textSearch.trim()}`
			);
		}

		// Add result limit
		const resultLimit = this.plugin.settings.resultLimit;
		if (resultLimit && resultLimit > 0) {
			queryLines.push(`limit ${resultLimit}`);
		}

		return queryLines.join("\n");
	}

	buildColumnQueries(
		layout: ViewLayout,
		filters: ViewFilters
	): Array<{
		title: string;
		query: string;
		icon?: string;
		isEmoji?: boolean;
	}> {
		const baseQuery = this.buildTaskQueryFromFilters(filters);
		const columnQueries: Array<{
			title: string;
			query: string;
			icon?: string;
			isEmoji?: boolean;
		}> = [];

		// Determine columns based on current layout
		switch (layout) {
			case ViewLayout.ROLE:
				const visibleRoles = this.plugin.getVisibleRoles();
				for (const role of visibleRoles) {
					const roleQuery = baseQuery
						? `${baseQuery}\ndescription includes ${role.icon}`
						: `description includes ${role.icon}`;
					columnQueries.push({
						title: role.name,
						query: roleQuery,
						icon: role.icon,
						isEmoji: true,
					});
				}
				// Add "No Role" column
				const noRoleConditions = visibleRoles.map(
					(role) => `description does not include ${role.icon}`
				);
				const noRoleQuery = baseQuery
					? `${baseQuery}\n${noRoleConditions.join("\n")}`
					: noRoleConditions.join("\n");
				columnQueries.push({
					title: "No Role",
					query: noRoleQuery,
					icon: "user-x",
					isEmoji: false,
				});
				break;

			case ViewLayout.STATUS:
				const statuses = [
					TaskStatus.TODO,
					TaskStatus.IN_PROGRESS,
					TaskStatus.DONE,
					TaskStatus.CANCELLED,
				];
				for (const status of statuses) {
					let statusQuery: string;
					let statusTitle: string;
					let statusIcon: string;

					switch (status) {
						case TaskStatus.TODO:
							statusQuery = baseQuery
								? `${baseQuery}\nfilter by function task.status.type === 'TODO'`
								: `filter by function task.status.type === 'TODO'`;
							statusTitle = "To Do";
							statusIcon = "circle-dashed";
							break;
						case TaskStatus.IN_PROGRESS:
							statusQuery = baseQuery
								? `${baseQuery}\nfilter by function task.status.type === 'IN_PROGRESS'`
								: `filter by function task.status.type === 'IN_PROGRESS'`;
							statusTitle = "In Progress";
							statusIcon = "loader-circle";
							break;
						case TaskStatus.DONE:
							statusQuery = baseQuery
								? `${baseQuery}\nfilter by function task.status.type === 'DONE'`
								: `filter by function task.status.type === 'DONE'`;
							statusTitle = "Done";
							statusIcon = "circle-check-big";
							break;
						case TaskStatus.CANCELLED:
							statusQuery = baseQuery
								? `${baseQuery}\nfilter by function task.status.type === 'CANCELLED'`
								: `filter by function task.status.type === 'CANCELLED'`;
							statusTitle = "Cancelled";
							statusIcon = "circle-off";
							break;
						default:
							statusQuery = baseQuery || "";
							statusTitle = status;
							statusIcon = "circle";
					}

					columnQueries.push({
						title: statusTitle,
						query: statusQuery,
						icon: statusIcon,
						isEmoji: false,
					});
				}
				break;

			case ViewLayout.DATE:
				// Date-based columns
				const dateColumns = [
					{
						title: "Overdue",
						query: baseQuery
							? `${baseQuery}\ndue before today`
							: "due before today",
						icon: "clock-alert",
						isEmoji: false,
					},
					{
						title: "Today",
						query: baseQuery
							? `${baseQuery}\ndue today`
							: "due today",
						icon: "clock-arrow-down",
						isEmoji: false,
					},
					{
						title: "This Week",
						query: baseQuery
							? `${baseQuery}\ndue this week`
							: "due this week",
						icon: "calendar-arrow-down",
						isEmoji: false,
					},
					{
						title: "Next Week",
						query: baseQuery
							? `${baseQuery}\ndue next week`
							: "due next week",
						icon: "calendar-arrow-up",
						isEmoji: false,
					},
					{
						title: "No Due Date",
						query: baseQuery
							? `${baseQuery}\nno due date`
							: "no due date",
						icon: "calendar",
						isEmoji: false,
					},
				];

				for (const dateColumn of dateColumns) {
					columnQueries.push(dateColumn);
				}
				break;

			default:
				// Single column with all tasks
				columnQueries.push({
					title: "All Tasks",
					query: baseQuery || "",
					icon: "list-todo",
					isEmoji: false,
				});
		}

		return columnQueries;
	}

	async renderQueryColumn(
		container: HTMLElement,
		columnQuery: {
			title: string;
			query: string;
			icon?: string;
			isEmoji?: boolean;
		},
		viewContext: any
	): Promise<void> {
		const columnDiv = container.createDiv("task-roles-column");
		columnDiv.addClass("task-query-column");

		// Column header
		const headerDiv = columnDiv.createDiv("task-roles-column-header");
		const titleEl = headerDiv.createEl("h3", {
			cls: "task-roles-column-title",
		});

		// Add icon if available
		if (columnQuery.icon) {
			if (columnQuery.isEmoji) {
				// Use emoji icon
				const emojiIcon = titleEl.createSpan("column-icon-emoji");
				emojiIcon.setText(columnQuery.icon);
				emojiIcon.style.marginRight = "8px";
				emojiIcon.style.fontSize = "16px";
				emojiIcon.style.lineHeight = "1";
				emojiIcon.style.verticalAlign = "middle";
			} else {
				// Use Obsidian system icon
				const iconSpan = titleEl.createSpan("column-icon");
				setIcon(iconSpan, columnQuery.icon);
				iconSpan.style.marginRight = "8px";
				iconSpan.style.display = "inline-flex";
				iconSpan.style.alignItems = "center";
				iconSpan.style.verticalAlign = "middle";
				iconSpan.style.width = "16px";
				iconSpan.style.height = "16px";
			}
		}

		// Add title text
		const titleText = titleEl.createSpan("column-title-text");
		titleText.setText(columnQuery.title);
		titleText.style.verticalAlign = "middle";

		// Style the title element for better alignment
		titleEl.style.display = "flex";
		titleEl.style.alignItems = "center";
		titleEl.style.gap = "0";

		// Check if Tasks plugin is installed before rendering content
		if (!this.isTasksPluginInstalled()) {
			const refreshCallback =
				viewContext && typeof viewContext.renderAsync === "function"
					? () => viewContext.renderAsync()
					: undefined;
			this.displayTasksPluginNotice(columnDiv, refreshCallback);
			return;
		}

		// Query display
		const queryContainer = columnDiv.createDiv("task-query-display");

		// Add progressive disclosure classes based on plugin settings
		const styleMode = this.plugin.settings.taskDisplayMode || "detailed";
		queryContainer.addClass(`tasks-styled--${styleMode}`);

		// Create markdown content for the query
		const queryMarkdown = columnQuery.query
			? `\`\`\`tasks\n${columnQuery.query}\n\`\`\``
			: `\`\`\`tasks\n# No specific query for this column\n\`\`\``;

		try {
			// Render the query using MarkdownRenderer
			await MarkdownRenderer.renderMarkdown(
				queryMarkdown,
				queryContainer,
				"virtual/tasks-preview.md",
				viewContext
			);

			// Check for Tasks plugin errors in the rendered content
			setTimeout(() => {
				this.checkForTasksPluginErrors(
					queryContainer,
					columnQuery.query,
					columnQuery.title
				);
			}, 500);

			// Enhance the rendered tasks with better styling
			this.enhanceTaskDisplay(queryContainer);
		} catch (error) {
			// Display formatted error with query debugging
			this.displayQueryError(
				queryContainer,
				error,
				columnQuery.query,
				columnQuery.title
			);
		}

		// Add column content wrapper
		const columnContent = columnDiv.createDiv("task-roles-column-content");
		columnContent.appendChild(queryContainer);
	}

	private enhanceTaskDisplay(container: HTMLElement): void {
		// Use a timeout to allow the markdown renderer to complete
		setTimeout(() => {
			const taskItems = container.querySelectorAll(".task-list-item");

			taskItems.forEach((taskItem: Element) => {
				const htmlTaskItem = taskItem as HTMLElement;

				// Extract task content for analysis
				const taskContent = this.extractTaskContent(htmlTaskItem);

				// Add priority classes based on content
				this.addPriorityClasses(htmlTaskItem, taskContent);

				// Add metadata elements
				this.addTaskMetadata(htmlTaskItem, taskContent);

				// Add progressive disclosure controls
				this.addProgressiveDisclosure(htmlTaskItem);
			});

			// Force re-apply our custom CSS after everything is loaded
			this.reapplyCustomCSS(container);
		}, 100);
	}

	private reapplyCustomCSS(container: HTMLElement): void {
		// Force re-apply styles that might be overridden by other plugins
		setTimeout(() => {
			const taskItems = container.querySelectorAll(".task-list-item");

			taskItems.forEach((taskItem: Element) => {
				const htmlTaskItem = taskItem as HTMLElement;

				// Add our custom CSS class for styling instead of inline styles
				htmlTaskItem.classList.add("task-roles-styled");
			});

			// Add CSS class to containers instead of inline styles
			const containers = container.querySelectorAll(
				"ul.contains-task-list.plugin-tasks-query-result.tasks-layout-hide-urgency, .contains-task-list.plugin-tasks-query-result.tasks-layout-hide-urgency"
			);
			containers.forEach((containerEl: Element) => {
				const htmlContainer = containerEl as HTMLElement;
				htmlContainer.classList.add("task-roles-styled");
			});
		}, 200); // Additional delay to ensure other plugins have finished their modifications
	}

	private checkForTasksPluginErrors(
		container: HTMLElement,
		query: string,
		columnTitle: string
	): void {
		// Check for common Tasks plugin error patterns in the rendered content
		const contentText = container.textContent || "";

		// Look for error messages that the Tasks plugin displays
		const errorPatterns = [
			/Tasks query: do not understand/i,
			/Problem line:/i,
			/Error:/i,
			/Invalid query/i,
			/Unknown instruction/i,
			/Malformed query/i,
		];

		const hasError = errorPatterns.some((pattern) =>
			pattern.test(contentText)
		);

		if (hasError) {
			// Extract the error message
			const lines = contentText.split("\n").filter((line) => line.trim());
			const errorMessage = lines.join("\n").trim();

			// Replace the content with our formatted error
			this.displayQueryError(
				container,
				{ message: errorMessage },
				query,
				columnTitle
			);
		}
	}

	private displayQueryError(
		container: HTMLElement,
		error: any,
		query: string,
		columnTitle: string
	): void {
		container.empty();

		const errorDiv = container.createDiv("task-query-error");

		const errorTitle = errorDiv.createDiv("task-query-error-title");
		errorTitle.setText(`Query Error in ${columnTitle}`);

		const errorMessage = errorDiv.createDiv();
		const errorText =
			error?.message || error?.toString() || "Unknown error occurred";
		errorMessage.setText(errorText);

		const queryDiv = errorDiv.createDiv("task-query-error-query");
		const queryLabel = queryDiv.createEl("strong");
		queryLabel.setText("Query:");
		queryDiv.createEl("br");
		queryDiv.createEl("span").setText(query || "No query specified");

		console.error(`Task Roles Plugin - Query Error in ${columnTitle}:`, {
			error: error,
			query: query,
			columnTitle: columnTitle,
		});
	}

	private extractTaskContent(taskItem: HTMLElement): string {
		const textContent = taskItem.textContent || "";
		return textContent.trim();
	}

	private addPriorityClasses(taskItem: HTMLElement, content: string): void {
		// Detect priority from content
		if (
			content.includes("🔴") ||
			content.includes("[urgent]") ||
			content.includes("!!!")
		) {
			taskItem.addClass("priority-urgent");
			this.addPriorityBadge(taskItem, "urgent");
		} else if (
			content.includes("🟡") ||
			content.includes("[high]") ||
			content.includes("!!")
		) {
			taskItem.addClass("priority-high");
			this.addPriorityBadge(taskItem, "high");
		} else if (
			content.includes("🟢") ||
			content.includes("[low]") ||
			content.includes("!")
		) {
			taskItem.addClass("priority-low");
			this.addPriorityBadge(taskItem, "low");
		} else {
			taskItem.addClass("priority-medium");
			this.addPriorityBadge(taskItem, "medium");
		}
	}

	private addPriorityBadge(taskItem: HTMLElement, priority: string): void {
		const existingBadge = taskItem.querySelector(".task-priority");
		if (existingBadge) return;

		const priorityBadge = taskItem.createDiv("task-priority");
		priorityBadge.textContent = priority.toUpperCase();
	}

	private addTaskMetadata(taskItem: HTMLElement, content: string): void {
		const metadataContainer = taskItem.createDiv("task-metadata");

		// Extract and add dates
		this.addDateMetadata(metadataContainer, content);

		// Extract and add roles/assignees
		this.addRoleAssigneeMetadata(metadataContainer, content);

		// Extract and add tags
		this.addTagMetadata(metadataContainer, content);
	}

	private addDateMetadata(container: HTMLElement, content: string): void {
		// Due date pattern: 📅 YYYY-MM-DD
		const dueDateMatch = content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
		if (dueDateMatch) {
			const dateEl = container.createDiv("task-date");
			const dueDate = new Date(dueDateMatch[1]);
			const today = new Date();

			if (dueDate < today) {
				dateEl.addClass("overdue");
			}

			dateEl.textContent = `Due: ${dueDateMatch[1]}`;
		}

		// Scheduled date pattern: ⏰ YYYY-MM-DD
		const scheduledMatch = content.match(/⏰\s*(\d{4}-\d{2}-\d{2})/);
		if (scheduledMatch) {
			const dateEl = container.createDiv("task-date");
			dateEl.textContent = `Scheduled: ${scheduledMatch[1]}`;
		}
	}

	private addRoleAssigneeMetadata(
		container: HTMLElement,
		content: string
	): void {
		// Role pattern: @role(role-name)
		const roleMatches = content.matchAll(/@role\(([^)]+)\)/g);
		for (const match of roleMatches) {
			const roleEl = container.createDiv("task-role");
			roleEl.textContent = match[1];
		}

		// Assignee patterns: @person or &company
		const assigneeMatches = content.matchAll(/[@&]([^\s,]+)/g);
		for (const match of assigneeMatches) {
			if (match[0].startsWith("@role(")) continue; // Skip role matches

			const assigneeEl = container.createDiv("task-assignee");
			if (match[0].startsWith("&")) {
				assigneeEl.addClass("company");
			}
			assigneeEl.textContent = match[1];
		}
	}

	private addTagMetadata(container: HTMLElement, content: string): void {
		// Tag pattern: #tag
		const tagMatches = content.matchAll(/#([^\s]+)/g);
		for (const match of tagMatches) {
			const tagEl = container.createDiv("task-tag");
			tagEl.textContent = `#${match[1]}`;
		}
	}

	private addProgressiveDisclosure(taskItem: HTMLElement): void {
		const metadata = taskItem.querySelector(".task-metadata");
		if (!metadata) return;

		// Add click handler for minimal mode
		taskItem.addEventListener("mouseenter", () => {
			if (taskItem.closest(".tasks-styled--minimal")) {
				(metadata as HTMLElement).style.display = "flex";
			}
		});

		taskItem.addEventListener("mouseleave", () => {
			if (taskItem.closest(".tasks-styled--minimal")) {
				(metadata as HTMLElement).style.display = "none";
			}
		});
	}

	private buildCrossProductQuery(
		filters: ViewFilters,
		queryLines: string[]
	): void {
		const visibleRoles = this.plugin.getVisibleRoles();
		const crossProductQueries: string[] = [];

		// Get roles, excluding "none-set" from cross product
		const rolesForCrossProduct =
			filters.roles?.filter((roleId) => roleId !== "none-set") || [];

		// Handle "none-set" special case
		if (filters.roles?.includes("none-set")) {
			if (rolesForCrossProduct.length === 0) {
				// Only "none-set" role with assignees = no results
				queryLines.push(
					"(description regex matches /NEVER_MATCH_ANYTHING/)"
				);
				return;
			}
			// If there are other roles, "none-set" is excluded from cross product
		}

		// Build cross product for each role with each assignee
		for (const roleId of rolesForCrossProduct) {
			const role = visibleRoles.find((r) => r.id === roleId);
			if (!role) continue;

			// Add people for this role
			if (filters.people && filters.people.length > 0) {
				for (const person of filters.people) {
					const regexPattern = `/${
						role.icon
					}::(?:(?!\\s+\\[[^\\]]+::).)*${person.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&"
					)}/`;
					crossProductQueries.push(
						`(description regex matches ${regexPattern})`
					);
				}
			}

			// Add companies for this role
			if (filters.companies && filters.companies.length > 0) {
				for (const company of filters.companies) {
					const regexPattern = `/${
						role.icon
					}::(?:(?!\\s+\\[[^\\]]+::).)*\\+${company.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&"
					)}/`;
					crossProductQueries.push(
						`(description regex matches ${regexPattern})`
					);
				}
			}
		}

		if (crossProductQueries.length > 0) {
			if (crossProductQueries.length === 1) {
				queryLines.push(crossProductQueries[0]);
			} else {
				queryLines.push(`(${crossProductQueries.join(" OR ")})`);
			}
		}
	}

	private buildRoleQuery(filters: ViewFilters, queryLines: string[]): void {
		if (!filters.roles || filters.roles.length === 0) return;

		// Skip filtering if "All" is selected (no filter needed)
		const hasAll = filters.roles.includes("all");
		if (hasAll) return;

		const visibleRoles = this.plugin.getVisibleRoles();

		if (filters.roles.length === 1) {
			const roleId = filters.roles[0];
			if (roleId === "none-set") {
				// Use the same pattern as buildColumnQueries for "No Role"
				const noRoleConditions = visibleRoles.map(
					(role) => `(description does not include ${role.icon})`
				);
				queryLines.push(`(${noRoleConditions.join(" AND ")})`);
			} else {
				// Use description includes pattern like buildColumnQueries
				const role = visibleRoles.find((r) => r.id === roleId);
				if (role) {
					queryLines.push(`(description includes ${role.icon})`);
				}
			}
		} else {
			// Handle multiple role selections
			const roleQueries: string[] = [];
			const hasNoneSet = filters.roles.includes("none-set");

			// Add conditions for specific roles
			const specificRoles = filters.roles.filter(
				(roleId) => roleId !== "none-set"
			);
			for (const roleId of specificRoles) {
				const role = visibleRoles.find((r) => r.id === roleId);
				if (role) {
					roleQueries.push(`(description includes ${role.icon})`);
				}
			}

			// Add "none-set" condition if selected
			if (hasNoneSet) {
				const noRoleConditions = visibleRoles.map(
					(role) => `(description does not include ${role.icon})`
				);
				// For "none-set", we need ALL conditions to be true (AND logic)
				roleQueries.push(`(${noRoleConditions.join(" AND ")})`);
			}

			if (roleQueries.length > 0) {
				queryLines.push(`(${roleQueries.join(" OR ")})`);
			}
		}
	}

	private buildAssigneeQuery(
		filters: ViewFilters,
		queryLines: string[]
	): void {
		const visibleRoles = this.plugin.getVisibleRoles();

		// Convert people filters to query syntax
		if (filters.people && filters.people.length > 0) {
			const peopleQueries: string[] = [];

			for (const person of filters.people) {
				const personRoleQueries: string[] = [];

				// Generate a regex pattern for each role icon
				for (const role of visibleRoles) {
					const regexPattern = `/${
						role.icon
					}::(?:(?!\\s+\\[[^\\]]+::).)*${person.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&"
					)}/`;
					personRoleQueries.push(
						`(description regex matches ${regexPattern})`
					);
				}

				// Combine all role queries for this person with OR
				if (personRoleQueries.length > 0) {
					peopleQueries.push(`(${personRoleQueries.join(" OR ")})`);
				}
			}

			if (peopleQueries.length > 0) {
				queryLines.push(`(${peopleQueries.join(" OR ")})`);
			}
		}

		// Convert company filters to query syntax
		if (filters.companies && filters.companies.length > 0) {
			const companyQueries: string[] = [];

			for (const company of filters.companies) {
				const companyRoleQueries: string[] = [];

				// Generate a regex pattern for each role icon
				for (const role of visibleRoles) {
					const regexPattern = `/${
						role.icon
					}::(?:(?!\\s+\\[[^\\]]+::).)*\\+${company.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&"
					)}/`;
					companyRoleQueries.push(
						`(description regex matches ${regexPattern})`
					);
				}

				// Combine all role queries for this company with OR
				if (companyRoleQueries.length > 0) {
					companyQueries.push(`(${companyRoleQueries.join(" OR ")})`);
				}
			}

			if (companyQueries.length > 0) {
				queryLines.push(`(${companyQueries.join(" OR ")})`);
			}
		}
	}
}
