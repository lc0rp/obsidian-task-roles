import { App, Modal, Editor } from "obsidian";
import { TaskRoleAssignment, ParsedTaskRoleAssignment, Role, DEFAULT_ROLES } from "../types";
import { PersonCompanyPickerModal } from "./person-company-picker-modal";
import type TaskRolesPlugin from "../main";

export class TaskRoleAssignmentModal extends Modal {
	plugin: TaskRolesPlugin;
	editor: Editor;
	roleAssignments: TaskRoleAssignment[] = [];
	existingRoleAssignments: ParsedTaskRoleAssignment[] = [];
	initialRoleAssignments: TaskRoleAssignment[] = [];
	hasUnsavedChanges = false;
	private isClosingForced = false;

	constructor(app: App, plugin: TaskRolesPlugin, editor: Editor) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Parse existing assignees
		const currentLine = this.editor.getLine(this.editor.getCursor().line);
		this.existingRoleAssignments =
			this.plugin.taskRolesService.parseRoleAssignments(
				currentLine,
				this.plugin.getVisibleRoles()
			);

		// Initialize assignees from existing data
		this.roleAssignments = this.existingRoleAssignments.map((pa) => ({
			roleId: pa.role.id,
			assignees: pa.assignees,
		}));

		// Store initial state for change detection
		this.initialRoleAssignments = JSON.parse(
			JSON.stringify(this.roleAssignments)
		);
		this.hasUnsavedChanges = false;

		contentEl.createEl("h2", { text: "Assign roles, people or companies" });

		this.renderRoles();
		this.renderNewRole();
		this.renderButtons();
	}

	renderRoles() {
		const rolesContainer = this.contentEl.createDiv("roles-container");
		const visibleRoles = this.plugin.getVisibleRoles();

		// Define descriptions for default roles
		const roleDescriptions: { [key: string]: string } = {
			owner: "execute the task",
			approver: "sign-off the task or decision",
			contributor: "provide input or data",
			informed: "stakeholders, kept in the loop",
		};

		for (const role of visibleRoles) {
			const roleDiv = rolesContainer.createDiv("role-row");

			const roleHeader = roleDiv.createDiv("role-header");
			roleHeader.createSpan("role-icon").setText(role.icon);

            const roleNameContainer = roleHeader.createDiv(
                "role-name-container"
            );
            const primary = role.names?.[0] || "";
            const display = primary ? primary.charAt(0).toUpperCase() + primary.slice(1) : "";
            roleNameContainer.createSpan("role-name").setText(display);

			// Add description for default roles
            const defaultIds = new Set(DEFAULT_ROLES.map((r) => r.id));
            if (defaultIds.has(role.id) && roleDescriptions[role.id]) {
                const description =
                    roleNameContainer.createSpan("role-description");
                description.setText(roleDescriptions[role.id]);
            }

			const addButton = roleHeader.createEl("button", {
				text: "+",
				cls: "add-assignee-btn",
			});
			addButton.setAttribute("aria-label", "Select people or companies");
			addButton.setAttribute("title", "Select people or companies");
			addButton.onclick = (e) => {
				e.stopPropagation();
				this.showAssigneeSelector(role.id, roleDiv);
			};

			// Make the entire role section clickable (except assignee tags)
			roleDiv.classList.add("role-section-clickable");
			roleDiv.onclick = (e) => {
				// Don't trigger if clicking on assignee tags
				const target = e.target as HTMLElement;
				if (!target.closest(".assignee-tag")) {
					this.showAssigneeSelector(role.id, roleDiv);
				}
			};

			// Add hover effects for the entire role section
			roleDiv.onmouseenter = () => {
				addButton.classList.add("highlighted");
			};
			roleDiv.onmouseleave = () => {
				addButton.classList.remove("highlighted");
			};

			// Show existing assignees
			const roleAssignment = this.roleAssignments.find(
				(a) => a.roleId === role.id
			);
			if (roleAssignment && roleAssignment.assignees.length > 0) {
				this.renderAssignees(
					roleDiv,
					role.id,
					roleAssignment.assignees
				);
			}
		}
	}

	renderAssignees(
		container: HTMLElement,
		roleId: string,
		assignees: string[]
	) {
		let assigneeContainer = container.querySelector(
			".assignee-container"
		) as HTMLElement;
		if (!assigneeContainer) {
			assigneeContainer = container.createDiv("assignee-container");
		} else {
			assigneeContainer.empty();
		}

		for (const assignee of assignees) {
			const assigneeEl = assigneeContainer.createSpan("assignee-tag");
			assigneeEl.setText(assignee);

			const removeBtn = assigneeEl.createSpan("remove-assignee");
			removeBtn.setText("×");

			// Make the entire assignee tag clickable for removal
			assigneeEl.onclick = (e) => {
				e.stopPropagation(); // Prevent triggering role section click
				this.removeAssignee(roleId, assignee);
				this.renderAssignees(
					container,
					roleId,
					this.roleAssignments.find((a) => a.roleId === roleId)
						?.assignees || []
				);
			};

			// Add hover effects to highlight the remove button
			assigneeEl.onmouseenter = () => {
				removeBtn.classList.add("highlighted");
				assigneeEl.classList.add("removal-ready");
			};
			assigneeEl.onmouseleave = () => {
				removeBtn.classList.remove("highlighted");
				assigneeEl.classList.remove("removal-ready");
			};

			// Keep the original removeBtn click handler as fallback
			removeBtn.onclick = (e) => {
				e.stopPropagation();
				this.removeAssignee(roleId, assignee);
				this.renderAssignees(
					container,
					roleId,
					this.roleAssignments.find((a) => a.roleId === roleId)
						?.assignees || []
				);
			};
		}
	}

	showAssigneeSelector(roleId: string, container: HTMLElement) {
		new PersonCompanyPickerModal(
			this.app,
			this.plugin,
			async (assignee: string) => {
				// Create the person/company file if it doesn't exist
				await this.plugin.taskRolesService.createPersonOrCompany(
					assignee
				);

				this.addAssignee(roleId, assignee);
				const assignedRole = this.roleAssignments.find(
					(a) => a.roleId === roleId
				);
				this.renderAssignees(
					container,
					roleId,
					assignedRole?.assignees || []
				);
			},
			{ mode: "add", keepOpen: true }
		).open();
	}

	addAssignee(roleId: string, assignee: string) {
		let assignedRole = this.roleAssignments.find(
			(a) => a.roleId === roleId
		);
		if (!assignedRole) {
			assignedRole = { roleId, assignees: [] };
			this.roleAssignments.push(assignedRole);
		}

		if (!assignedRole.assignees.includes(assignee)) {
			assignedRole.assignees.push(assignee);
			this.checkForChanges();
		}
	}

	removeAssignee(roleId: string, assignee: string) {
		const assignedRole = this.roleAssignments.find(
			(a) => a.roleId === roleId
		);
		if (assignedRole) {
			assignedRole.assignees = assignedRole.assignees.filter(
				(a) => a !== assignee
			);
			this.checkForChanges();
		}
	}

	renderNewRole() {
		const newRoleDiv = this.contentEl.createDiv("new-role-row");

		const nameInput = newRoleDiv.createEl("input", {
			type: "text",
			placeholder: "Role name",
		});
		const descriptionInput = newRoleDiv.createEl("input", {
			type: "text",
			placeholder: "Role description",
		});
		const iconInput = newRoleDiv.createEl("input", {
			type: "text",
			placeholder: "🎯",
		});
		iconInput.className = "task-role-assignment-icon-input";

		const addBtn = newRoleDiv.createEl("button", { text: "Add Role" });
		addBtn.onclick = async () => {
			const name = nameInput.value.trim();
			const description = descriptionInput.value.trim();
			const icon = iconInput.value.trim();

            if (name && icon) {
                const nameLower = name.toLowerCase();
                const newRole: Role = {
                    id: nameLower.replace(/\s+/g, "-"),
                    names: [nameLower],
                    description,
                    icon,
                    shortcuts: [],
                    order: this.plugin.settings.roles.length + 1,
                };

				this.plugin.settings.roles.push(newRole);
				await this.plugin.saveSettings();

				this.onOpen(); // Refresh the modal
			}
		};
	}

	renderButtons() {
		const buttonDiv = this.contentEl.createDiv("button-container");

		const doneBtn = buttonDiv.createEl("button", {
			text: "Done",
			cls: "mod-cta",
		});
		doneBtn.onclick = () => {
			this.applyRoleAssignments();
			this.close();
		};

		const cancelBtn = buttonDiv.createEl("button", { text: "Cancel" });
		cancelBtn.onclick = () => this.handleCancel();

		// Add help link
		const helpDiv = this.contentEl.createDiv("help-link-container");
		const helpLink = helpDiv.createEl("a", {
			text: "Need help?",
			href: "https://github.com/lc0rp/obsidian-task-roles/docs/help.md",
			cls: "help-link",
		});
		helpLink.setAttribute("target", "_blank");
		helpLink.setAttribute("rel", "noopener noreferrer");
	}

	applyRoleAssignments() {
		const currentLine = this.editor.getLine(this.editor.getCursor().line);

		const newLine = this.plugin.taskRolesService.applyRoleAssignmentsToLine(
			currentLine,
			this.roleAssignments,
			this.plugin.getVisibleRoles()
		);

		this.editor.setLine(this.editor.getCursor().line, newLine);
		this.hasUnsavedChanges = false;
	}

	checkForChanges() {
		// Compare current role assignments with initial state
		const currentState = JSON.stringify(this.roleAssignments);
		const initialState = JSON.stringify(this.initialRoleAssignments);
		this.hasUnsavedChanges = currentState !== initialState;
	}

	handleCancel() {
		if (this.hasUnsavedChanges) {
			this.showUnsavedChangesConfirmation();
		} else {
			this.close();
		}
	}

	showUnsavedChangesConfirmation() {
		const confirmModal = new Modal(this.app);
		confirmModal.contentEl.createEl("h3", { text: "Unsaved Changes" });
		confirmModal.contentEl.createEl("p", {
			text: "You have unsaved changes. What would you like to do?",
		});

		const buttonContainer =
			confirmModal.contentEl.createDiv("button-container");

		const applyBtn = buttonContainer.createEl("button", {
			text: "Apply Changes",
			cls: "mod-cta",
		});
		applyBtn.onclick = () => {
			confirmModal.close();
			this.applyRoleAssignments();
			this.forceClose();
		};

		const discardBtn = buttonContainer.createEl("button", {
			text: "Discard Changes",
		});
		discardBtn.onclick = () => {
			confirmModal.close();
			this.hasUnsavedChanges = false;
			this.forceClose();
		};

		const cancelBtn = buttonContainer.createEl("button", {
			text: "Continue Editing",
		});
		cancelBtn.onclick = () => {
			confirmModal.close();
		};

		confirmModal.open();
	}

	// Override the close method to handle unsaved changes
	close() {
		if (this.hasUnsavedChanges && !this.isClosingForced) {
			this.showUnsavedChangesConfirmation();
			return;
		}
		super.close();
	}

	// Force close without confirmation
	forceClose() {
		this.isClosingForced = true;
		super.close();
	}
}
