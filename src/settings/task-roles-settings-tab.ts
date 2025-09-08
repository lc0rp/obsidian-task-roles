import { App, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_ROLES, Role } from "../types";
import {
	getPreferredNameOptions,
	getShortcutOptions,
	isIconUnique,
} from "../utils/role-settings-utils";
import { RoleEditModal } from "../modals/role-edit-modal";
import type TaskRolesPlugin from "../main";

export class TaskRolesSettingTab extends PluginSettingTab {
	plugin: TaskRolesPlugin;
	private abortController: AbortController | null = null;
	private activeDefaultRoleId: string | null = null;
	private activeAssigneesTab: "person" | "company" | null = null;
	private activeCustomRolesTab: "list" | "add" | null = null;

	constructor(app: App, plugin: TaskRolesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private createAssigneesSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv("task-roles-tabs-container");
		section.createEl("h4", { text: "Assignees" });
		section.createEl("p", {
			text: "You can assign tasks to people or companies. Each person or company is stored as a note. Customize the directory location and other settings below.",
		});

		// Tabs header
		const header = section.createDiv("default-roles-tabs-header");

		// Active tab state
		if (!this.activeAssigneesTab) this.activeAssigneesTab = "person";

		// Mark active
		// Recreate buttons with active styles and click handlers
		const personBtn = header.createEl("button", {
			text: "Person settings",
			cls: "default-role-tab",
		});
		const companyBtn = header.createEl("button", {
			text: "Company settings",
			cls: "default-role-tab",
		});
		// Active styles
		if (this.activeAssigneesTab === "person") {
			// @ts-ignore
			personBtn.addClass?.("is-active");
			personBtn.addClass?.("task-roles-btn-active");
		} else {
			// @ts-ignore
			companyBtn.addClass?.("is-active");
			// @ts-ignore
			companyBtn.addClass?.("task-roles-btn-active");
		}
		// Handlers
		// @ts-ignore
		personBtn.onclick = () => {
			this.activeAssigneesTab = "person";
			this.display();
		};
		// @ts-ignore
		companyBtn.onclick = () => {
			this.activeAssigneesTab = "company";
			this.display();
		};

		// Details container rendered for active tab only
		const details = section.createDiv("default-roles-tab-details");
		if (this.activeAssigneesTab === "person") {
			details.createEl("h4", { text: "Person" });
			new Setting(details)
				.setName("Person settings")
				.setDesc(
					"A person is anyone you assign a task to. If you already have a directory of contacts, you can use that."
				);
			new Setting(details)
				.setName("Person directory")
				.setDesc("Directory where people note files are stored")
				.addText((text) =>
					text
						.setPlaceholder("People")
						.setValue(this.plugin.settings.personDirectory)
						.onChange(async (value) => {
							this.plugin.settings.personDirectory =
								value || "People";
							await this.plugin.saveSettings();
						})
				);
			new Setting(details)
				.setName("Person prefix")
				.setDesc(
					"Typing this symbol in the editor will trigger a people search in the directory above"
				)
				.addText((text) =>
					text
						.setPlaceholder("@")
						.setValue(this.plugin.settings.personSymbol)
						.onChange(async (value) => {
							this.plugin.settings.personSymbol = value || "@";
							await this.plugin.saveSettings();
						})
				);

			this.createMePersonFileSetting(details);
		} else {
			details.createEl("h4", { text: "Company" });
			new Setting(details)
				.setName("Company settings")
				.setDesc(
					"A company is an organization, team or group you might assign a task to."
				);

			new Setting(details)
				.setName("Company directory")
				.setDesc("Directory where company note files are stored")
				.addText((text) =>
					text
						.setPlaceholder("Companies")
						.setValue(this.plugin.settings.companyDirectory)
						.onChange(async (value) => {
							this.plugin.settings.companyDirectory =
								value || "Companies";
							await this.plugin.saveSettings();
						})
				);

			new Setting(details)
				.setName("Company prefix")
				.setDesc(
					"Typing this symbol in the editor will trigger a company search in the directory above"
				)
				.addText((text) =>
					text
						.setPlaceholder("+")
						.setValue(this.plugin.settings.companySymbol)
						.onChange(async (value) => {
							this.plugin.settings.companySymbol = value || "+";
							await this.plugin.saveSettings();
						})
				);
		}

		// Visual separation for reset row
		const footer = section.createDiv("default-roles-footer");

		// Inline widget display toggle (below tabs, not in either panel)
		new Setting(footer)
			.setName("Show inline role assignment icons")
			.setDesc(
				"Display clickable role assignment icons at the end of task lines"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showInlineWidgets)
					.onChange(async (value) => {
						this.plugin.settings.showInlineWidgets = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private createDefaultRolesSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv("task-roles-tabs-container");
		section.createEl("h4", { text: "Default roles" });
		section.createEl("p", {
			text: "These default roles are provided to get you started quickly. They are flexible enough to support basic task assignment, or more project management techniques like RACI (Responsible, Accountable, Consulted & Informed) & DACI (Driver, Approver, Contributor, Informed). Customize the default roles below.",
		});

		// Determine active role
		const defaultIds = DEFAULT_ROLES.map((r) => r.id);
		if (
			!this.activeDefaultRoleId ||
			!defaultIds.includes(this.activeDefaultRoleId)
		) {
			this.activeDefaultRoleId = defaultIds[0];
		}

		// Tabs header
		const header = section.createDiv("default-roles-tabs-header");
		for (const base of DEFAULT_ROLES) {
			const role =
				this.plugin.settings.roles.find((r) => r.id === base.id) ||
				base;
			const isHidden = this.plugin.settings.hiddenDefaultRoles.includes(
				role.id
			);
			const primaryName = role.names?.[0] || "";
			const displayName = primaryName
				? primaryName.charAt(0).toUpperCase() + primaryName.slice(1)
				: "";
			const label = `${role.icon} ${displayName}`;
			const btn = header.createEl("button", {
				text: label,
				cls: "default-role-tab",
			});
			// Visual hint for disabled
			if (isHidden) {
				// Add a class; real styling handled via CSS
				// @ts-ignore - addClass exists in Obsidian elements
				btn.addClass?.("is-disabled");
				btn.addClass?.("task-roles-btn-disabled");
			}
			if (this.activeDefaultRoleId === role.id) {
				// @ts-ignore
				btn.addClass?.("is-active");
				// @ts-ignore
				btn.addClass?.("task-roles-btn-active");
			}
			// Wire click
			// @ts-ignore
			btn.onclick = () => {
				this.activeDefaultRoleId = role.id;
				this.display();
			};
		}

		// Details for active role only
		const details = section.createDiv("default-roles-tab-details");
		const activeBase = DEFAULT_ROLES.find(
			(r) => r.id === this.activeDefaultRoleId
		)!;
		const role =
			this.plugin.settings.roles.find((r) => r.id === activeBase.id) ||
			activeBase;

		const activePrimary = role.names?.[0] || "";
		const activeDisplayName = activePrimary
			? activePrimary.charAt(0).toUpperCase() + activePrimary.slice(1)
			: "";
		new Setting(details)
			.setName(`${role.icon} ${activeDisplayName}`)
			.setDesc(role.description);

		new Setting(details)
			.setName("Preferred name")
			.setDesc("Pick the label shown for this role")
			.addDropdown((dropdown) => {
				const options = getPreferredNameOptions(role);
				options.forEach((opt) => dropdown.addOption(opt, opt));
				dropdown
					.setValue(role.names?.[0] ?? options[0])
					.onChange(async (value: string) => {
						const target = this.plugin.settings.roles.find(
							(r) => r.id === role.id
						);
						if (target) {
							const lower = (value || "").toLowerCase();
							const rest = (target.names || []).filter(
								(n) => n !== lower
							);
							target.names = [lower, ...rest];
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});

		new Setting(details)
			.setName("Icon")
			.setDesc(
				"Click and type/paste an emoji. Must be unique among enabled roles."
			)
			.addText((text) => {
				let previous = role.icon;
				text.setPlaceholder(role.icon)
					.setValue(role.icon)
					.onChange(async (value: string) => {
						const icon = (value || "").trim();
						const unique = isIconUnique(
							icon,
							this.plugin.settings,
							role.id
						);
						const target = this.plugin.settings.roles.find(
							(r) => r.id === role.id
						);
						if (!target) return;
						if (icon && unique) {
							previous = icon;
							target.icon = icon;
							await this.plugin.saveSettings();
							this.display();
						} else if (!unique) {
							target.icon = previous;
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});

		new Setting(details)
			.setName("Shortcut")
			.setDesc("Choose the backslash shortcut (e.g. \\o)")
			.addDropdown((dropdown) => {
				const options = getShortcutOptions(role);
				options.forEach((opt) => dropdown.addOption(opt, `\\${opt}`));
				dropdown
					.setValue(role.shortcuts?.[0] ?? options[0])
					.onChange(async (value: string) => {
						const target = this.plugin.settings.roles.find(
							(r) => r.id === role.id
						);
						if (!target) return;
						const isInUse = this.isShortcutInUse(value, role.id);
						if (!isInUse) {
							const lower = (value || "").toLowerCase();
							const rest = (target.shortcuts || []).filter(
								(s) => s !== lower
							);
							target.shortcuts = [lower, ...rest];
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});

		new Setting(details)
			.setName("Enable")
			.setDesc(
				`Turn this off to hide the '${activeDisplayName}' role in future role assignment operations.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						!this.plugin.settings.hiddenDefaultRoles.includes(
							role.id
						)
					)
					.onChange(async (value) => {
						if (!value) {
							if (
								!this.plugin.settings.hiddenDefaultRoles.includes(
									role.id
								)
							) {
								this.plugin.settings.hiddenDefaultRoles.push(
									role.id
								);
							}
						} else {
							this.plugin.settings.hiddenDefaultRoles =
								this.plugin.settings.hiddenDefaultRoles.filter(
									(id) => id !== role.id
								);
						}
						await this.plugin.saveSettings();
						await this.plugin.loadSettings();
						this.display();
					})
			);

		// Controls end; reset lives in footer below to avoid looking like part of the tab content

		// Visual separation for reset row
		const footer = section.createDiv("default-roles-footer");
		new Setting(footer)
			.setName("")
			.setDesc("")
			.addButton((btn) =>
				btn
					.setButtonText("Reset defaults")
					.setCta()
					.onClick(async () => {
						await this.resetDefaultRoles();
						this.display();
					})
			);
	}

	private createMePersonFileSetting(containerEl: HTMLElement): void {
		const setting = new Setting(containerEl)
			.setName("Create @me person")
			.setDesc(
				"Create a special person file for assigning tasks to yourself"
			);

		// State management for button
		let button: any;
		let isCreating = false;
		let originalClickHandler: (() => Promise<void>) | null = null;

		// Create the button with click handler
		setting.addButton((btn) => {
			button = btn.setButtonText("Create @me");

			originalClickHandler = async () => {
				// Prevent multiple clicks during creation
				if (isCreating) return;

				try {
					isCreating = true;
					button.setDisabled(true);
					button.setButtonText("Creating...");

					await this.plugin.taskRolesService.createMePerson();

					// Refresh the settings display to show the new state
					this.display();
				} catch (error) {
					console.error("Failed to create @me person:", error);
					// Reset button state on error
					button.setDisabled(false);
					button.setButtonText("Create @me");
				} finally {
					isCreating = false;
				}
			};

			button.onClick(originalClickHandler);
		});

		// Asynchronously check if @me exists and update the setting
		this.plugin.taskRolesService
			.mePersonExists()
			.then((meExists) => {
				// Check if component is still mounted (abort controller not aborted)
				if (this.abortController?.signal.aborted) return;

				if (meExists) {
					// Disable the button and remove click handler properly
					button.setDisabled(true);
					button.setButtonText("Create @me");

					// Remove the original click handler by setting a no-op
					button.onClick(() => {});

					// Add DONE pill
					setting.controlEl.createSpan({
						text: "DONE",
						cls: "me-person-done-pill",
					});
				}
			})
			.catch((error) => {
				// Check if component is still mounted
				if (this.abortController?.signal.aborted) return;

				console.error("Failed to check @me person existence:", error);
				// Button remains in default enabled state on error
			});
	}

	private createCustomRolesSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv("task-roles-tabs-container");
		section.createEl("h4", { text: "Custom roles" });
		section.createEl("p", {
			text: "You can create custom roles to fit your workflow below.",
		});

		if (!this.activeCustomRolesTab) this.activeCustomRolesTab = "list";

		const header = section.createDiv("default-roles-tabs-header");
		const listBtn = header.createEl("button", {
			text: "Custom roles",
			cls: "default-role-tab",
		});
		const addBtn = header.createEl("button", {
			text: "Add new role",
			cls: "default-role-tab",
		});
		if (this.activeCustomRolesTab === "list") {
			// @ts-ignore
			listBtn.addClass?.("is-active");
			listBtn.addClass?.("task-roles-btn-active");
		} else {
			// @ts-ignore
			addBtn.addClass?.("is-active");
			// @ts-ignore
			addBtn.addClass?.("task-roles-btn-active");
		}
		// Click handlers
		// @ts-ignore
		listBtn.onclick = () => {
			this.activeCustomRolesTab = "list";
			this.display();
		};
		// @ts-ignore
		addBtn.onclick = () => {
			this.activeCustomRolesTab = "add";
			this.display();
		};

		const details = section.createDiv("default-roles-tab-details");
		if (this.activeCustomRolesTab === "list") {
			details.createEl("h4", { text: "Custom Roles" });
			new Setting(details)
				.setName("Custom roles")
				.setDesc("Custom roles you have created are listed below.");
			const defaultIds = new Set(DEFAULT_ROLES.map((r) => r.id));
			const customRoles = this.plugin.settings.roles.filter(
				(r) => !defaultIds.has(r.id)
			);
			if (customRoles.length > 0) {
				for (const role of customRoles) {
					const shortcutText =
						role.shortcuts && role.shortcuts[0]
							? `\nShortcut: \\${role.shortcuts[0]}`
							: "";
					const primary = role.names?.[0] || "";
					const display = primary
						? primary.charAt(0).toUpperCase() + primary.slice(1)
						: "";
					const setting = new Setting(details)
						.setName(`${role.icon} ${display}`)
						.setDesc(`Custom role${shortcutText}`);

					setting.addButton((button) =>
						button.setButtonText("Edit").onClick(() => {
							new RoleEditModal(this.app, this.plugin, role, () =>
								this.display()
							).open();
						})
					);

					setting.addButton((button) =>
						button
							.setButtonText("Delete")
							.setClass("mod-warning")
							.onClick(async () => {
								this.plugin.settings.roles =
									this.plugin.settings.roles.filter(
										(r) => r.id !== role.id
									);
								await this.plugin.saveSettings();
								this.display();
							})
					);
				}
			}
		} else {
			details.createEl("h4", { text: "Add New Role" });
			new Setting(details)
				.setName("Add new role")
				.setDesc("Use the form below to create a new custom role.");
			let nameInput: HTMLInputElement;
			let iconInput: HTMLInputElement;
			let shortcutInput: HTMLInputElement;
			let descriptionInput: HTMLInputElement;

			new Setting(details).setName("Role name").addText((text) => {
				nameInput = text.inputEl;
				text.setPlaceholder("Enter role name");
			});

			new Setting(details)
				.setName("Role description")
				.setDesc("Brief description of the role.")
				.addText((text) => {
					descriptionInput = text.inputEl;
					text.setPlaceholder(
						"E.g. Responsible for executing the task"
					);
				});

			new Setting(details).setName("Role icon").addText((text) => {
				iconInput = text.inputEl;
				text.setPlaceholder("🎯");
			});

			new Setting(details)
				.setName("Shortcut letter")
				.setDesc("Single character used with \\ to insert this role")
				.addText((text) => {
					shortcutInput = text.inputEl;
					text.setPlaceholder("d");
				});

			new Setting(details).addButton((button) =>
				button
					.setButtonText("Add role")
					.setCta()
					.onClick(async () => {
						const name = nameInput.value.trim();
						const icon = iconInput.value.trim();
						const shortcut = shortcutInput.value.trim();
						const description = descriptionInput.value.trim();

						if (!name || !icon) {
							return;
						}

						// Check for duplicate shortcut
						if (shortcut && this.isShortcutInUse(shortcut)) {
							shortcutInput.classList.add(
								"settings-shortcut-error"
							);
							shortcutInput.classList.remove(
								"settings-shortcut-valid"
							);
							shortcutInput.focus();
							return;
						} else {
							shortcutInput.classList.remove(
								"settings-shortcut-error"
							);
							shortcutInput.classList.add(
								"settings-shortcut-valid"
							);
						}

						const nameLower = name.toLowerCase();
						const newRole: Role = {
							id: nameLower.replace(/\s+/g, "-"),
							names: [nameLower],
							description,
							icon,
							shortcuts: shortcut ? [shortcut.toLowerCase()] : [],
							order: this.plugin.settings.roles.length + 1,
						};

						this.plugin.settings.roles.push(newRole);
						await this.plugin.saveSettings();

						nameInput.value = "";
						iconInput.value = "";
						shortcutInput.value = "";
						this.display();
					})
			);
		}
	}

	display(): void {
		// Cancel any pending async operations
		if (this.abortController) {
			this.abortController.abort();
		}

		// Create new abort controller for this display cycle
		this.abortController = new AbortController();

		const { containerEl } = this;
		containerEl.empty();

		// Assignees section (includes inline widget toggle)
		this.createAssigneesSection(containerEl);

		// Default roles
		this.createDefaultRolesSection(containerEl);

		// Custom roles
		this.createCustomRolesSection(containerEl);

		// Debug logging toggle
		new Setting(containerEl)
			.setName("Enable debug logging")
			.setDesc("Log additional information to the console")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.debug)
					.onChange(async (value) => {
						this.plugin.settings.debug = value;
						await this.plugin.saveSettings();
					})
			);

		// Task queries toggle
		// Task display mode setting
		new Setting(containerEl)
			.setName("Task display mode")
			.setDesc(
				"Choose how task metadata is displayed: minimal (show on hover) or detailed (always visible)"
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("minimal", "Minimal (hover to show details)")
					.addOption("detailed", "Detailed (always show metadata)")
					.setValue(this.plugin.settings.taskDisplayMode)
					.onChange(async (value) => {
						const mode =
							value === "detailed" || value === "minimal"
								? (value as "minimal" | "detailed")
								: this.plugin.settings.taskDisplayMode;
						this.plugin.settings.taskDisplayMode = mode;
						await this.plugin.saveSettings();
					})
			);

		// Result limit setting
		new Setting(containerEl)
			.setName("Task Center: max results per column")
			.setDesc(
				"Maximum number of tasks to display in each Task Center column. Defaults to 50. Set this to improve performance if you have a large number of tasks. Note that it may be overridden by Task plugin's global query setting."
			)
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(this.plugin.settings.resultLimit.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value) || 50;
						if (numValue > 0) {
							this.plugin.settings.resultLimit = numValue;
							await this.plugin.saveSettings();
						}
					})
			);

		// Add help link at the bottom
		const helpDiv = containerEl.createDiv("help-link-container");
		const helpLink = helpDiv.createEl("a", {
			text: "Need help? View documentation",
			href: "https://github.com/lc0rp/obsidian-task-roles/docs/help.md",
			cls: "help-link",
		});
		helpLink.setAttribute("target", "_blank");
		helpLink.setAttribute("rel", "noopener noreferrer");
	}

	/**
	 * Check if a shortcut is already in use by another role
	 */
	private isShortcutInUse(shortcut: string, excludeRoleId?: string): boolean {
		if (!shortcut) return false;
		const lower = shortcut.toLowerCase();
		return this.plugin.settings.roles.some(
			(role) =>
				(role.shortcuts || []).includes(lower) &&
				role.id !== excludeRoleId
		);
	}

	/**
	 * Reset all default roles to their original values and re-enable them
	 */
	async resetDefaultRoles(): Promise<void> {
		// Restore default role entries (preserve custom roles)
		const defaultIds = new Set(DEFAULT_ROLES.map((r) => r.id));
		const customRoles = this.plugin.settings.roles.filter(
			(r) => !defaultIds.has(r.id)
		);
		const defaultsCopy = DEFAULT_ROLES.map((r) => ({ ...r }));
		this.plugin.settings.roles = [...defaultsCopy, ...customRoles];
		// Re-enable all defaults
		this.plugin.settings.hiddenDefaultRoles = [];
		await this.plugin.saveSettings();
		await this.plugin.loadSettings();
	}

	/**
	 * Cleanup method to cancel pending async operations
	 * Call this when the settings tab is being destroyed
	 */
	cleanup(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
	}
}
