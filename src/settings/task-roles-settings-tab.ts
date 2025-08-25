import { App, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_ROLES, Role, SIMPLE_ASSIGNEE_ROLE } from "../types";
import { RoleEditModal } from "../modals/role-edit-modal";
import type TaskRolesPlugin from "../main";

export class TaskRolesSettingTab extends PluginSettingTab {
	plugin: TaskRolesPlugin;
	private abortController: AbortController | null = null;

	constructor(app: App, plugin: TaskRolesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private createDefaultRolesTabs(containerEl: HTMLElement): void {
		const tabsContainer = containerEl.createDiv("task-roles-tabs-container");
		
		// Header
		tabsContainer.createEl("h4", { text: "Default roles" });
		
		// Tab buttons
		const tabButtonsContainer = tabsContainer.createDiv("task-roles-tab-buttons");
		const allDriverRolesTab = tabButtonsContainer.createEl("button", {
			text: "All Driver Roles",
			cls: "task-roles-tab-button"
		});
		const simpleAssigneeTab = tabButtonsContainer.createEl("button", {
			text: "Simple Assignee Role",
			cls: "task-roles-tab-button"
		});
		
		// Tab content containers
		const allDriverRolesContent = tabsContainer.createDiv("task-roles-tab-content");
		const simpleAssigneeContent = tabsContainer.createDiv("task-roles-tab-content");
		
		// State management
		let activeTab: "driver" | "simple" = this.plugin.settings.simpleAssigneeMode ? "simple" : "driver";
		
		const showTab = (tab: "driver" | "simple") => {
			activeTab = tab;
			
			// Update button states
			allDriverRolesTab.classList.toggle("active", tab === "driver");
			simpleAssigneeTab.classList.toggle("active", tab === "simple");
			
			// Update content visibility
			if (tab === "driver") {
				allDriverRolesContent.classList.remove("settings-tab-content-hidden");
				allDriverRolesContent.classList.add("settings-tab-content-visible");
				simpleAssigneeContent.classList.remove("settings-tab-content-visible");
				simpleAssigneeContent.classList.add("settings-tab-content-hidden");
			} else {
				allDriverRolesContent.classList.remove("settings-tab-content-visible");
				allDriverRolesContent.classList.add("settings-tab-content-hidden");
				simpleAssigneeContent.classList.remove("settings-tab-content-hidden");
				simpleAssigneeContent.classList.add("settings-tab-content-visible");
			}
		};
		
		// Tab click handlers
		allDriverRolesTab.onclick = () => showTab("driver");
		simpleAssigneeTab.onclick = () => showTab("simple");
		
		// Create All Driver Roles content
		this.createAllDriverRolesContent(allDriverRolesContent);
		
		// Create Simple Assignee Role content
		this.createSimpleAssigneeRoleContent(simpleAssigneeContent);
		
		// Initialize to correct tab
		showTab(activeTab);
	}

	private createAllDriverRolesContent(containerEl: HTMLElement): void {
		if (this.plugin.settings.simpleAssigneeMode) {
			// Show disabled message when simple mode is active
			const messageDiv = containerEl.createDiv("simple-mode-message");
			messageDiv.innerHTML = `
				<p><strong>Advanced mode is disabled</strong></p>
				<p>Go to the "Simple Assignee Role" tab and disable Simple Assignee Role mode to re-enable this tab.</p>
			`;
			return;
		}
		
		// Show the normal default roles toggles
		for (const role of DEFAULT_ROLES) {
			new Setting(containerEl)
				.setName(`${role.icon} ${role.name}`)
				.setDesc(
					`Turn this off to hide the '${role.name}' role in future role assignment operations.\nShortcut: \\${role.shortcut}`
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
							await this.plugin.loadSettings(); // Refresh roles
						})
				);
		}
	}

	private createSimpleAssigneeRoleContent(containerEl: HTMLElement): void {
		// Simple Assignee Mode toggle
		new Setting(containerEl)
			.setName("Enable Simple Assignee Role mode")
			.setDesc("This will disable all the driver roles, and create only one role called \"Assignees\"")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.simpleAssigneeMode)
					.onChange(async (value) => {
						this.plugin.settings.simpleAssigneeMode = value;
						await this.plugin.saveSettings();
						await this.plugin.loadSettings(); // Refresh roles and UI
						this.display(); // Refresh the entire settings display
					})
			);

		// Assignees role setting (disabled when simple mode is off)
		const assigneeSetting = new Setting(containerEl)
			.setName(`${SIMPLE_ASSIGNEE_ROLE.icon} ${SIMPLE_ASSIGNEE_ROLE.name}`)
			.setDesc(`Shortcut: \\${SIMPLE_ASSIGNEE_ROLE.shortcut}`);

		if (this.plugin.settings.simpleAssigneeMode) {
			// Show as enabled but not toggleable when simple mode is on
			assigneeSetting.addToggle((toggle) =>
				toggle
					.setValue(true)
					.setDisabled(true)
			);
		} else {
			// Show as disabled when simple mode is off
			assigneeSetting.addToggle((toggle) =>
				toggle
					.setValue(false)
					.setDisabled(true)
			);
		}
	}

	private createMePersonFileSetting(containerEl: HTMLElement): void {
		const setting = new Setting(containerEl)
			.setName("Create @me person")
			.setDesc("Create a special person file for yourself");

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

	display(): void {
		// Cancel any pending async operations
		if (this.abortController) {
			this.abortController.abort();
		}

		// Create new abort controller for this display cycle
		this.abortController = new AbortController();

		const { containerEl } = this;
		containerEl.empty();

		// Person symbol setting
		new Setting(containerEl)
			.setName("Person prefix")
			.setDesc(
				"Type this symbol to trigger a person search (affects future data only)"
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

		// Company symbol setting
		new Setting(containerEl)
			.setName("Company prefix")
			.setDesc(
				"Type this symbol to initiate a company search (affects future data only)"
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

		// Person directory setting
		new Setting(containerEl)
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

		// Company directory setting
		new Setting(containerEl)
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

		// Create @me person button
		this.createMePersonFileSetting(containerEl);

		// Inline widget display toggle
		new Setting(containerEl)
			.setName("Show inline role assignment icons")
			.setDesc("Display clickable role assignment icons at the end of task lines")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showInlineWidgets)
					.onChange(async (value) => {
						this.plugin.settings.showInlineWidgets = value;
						await this.plugin.saveSettings();
					})
			);

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
					.onChange(async (value: "minimal" | "detailed") => {
						this.plugin.settings.taskDisplayMode = value;
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

		// Default roles with tabs
		this.createDefaultRolesTabs(containerEl);

		// Custom roles
		const customRoles = this.plugin.settings.roles.filter(
			(r) => !r.isDefault
		);
		if (customRoles.length > 0) {
			containerEl.createEl("h4", { text: "Custom roles" });
			for (const role of customRoles) {
				const shortcutText = role.shortcut
					? `\nShortcut: \\${role.shortcut}`
					: "";
				const setting = new Setting(containerEl)
					.setName(`${role.icon} ${role.name}`)
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

		// Add new role
		containerEl.createEl("h4", { text: "Add new role" });
		let nameInput: HTMLInputElement;
		let iconInput: HTMLInputElement;
		let shortcutInput: HTMLInputElement;

		new Setting(containerEl).setName("Role name").addText((text) => {
			nameInput = text.inputEl;
			text.setPlaceholder("Enter role name");
		});

		new Setting(containerEl).setName("Role icon").addText((text) => {
			iconInput = text.inputEl;
			text.setPlaceholder("🎯");
		});

		new Setting(containerEl)
			.setName("Shortcut letter")
			.setDesc("Single character used with \\ to insert this role")
			.addText((text) => {
				shortcutInput = text.inputEl;
				text.setPlaceholder("d");
			});

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText("Add role")
				.setCta()
				.onClick(async () => {
					const name = nameInput.value.trim();
					const icon = iconInput.value.trim();
					const shortcut = shortcutInput.value.trim();

					if (!name || !icon) {
						return;
					}

					// Check for duplicate shortcut
					if (shortcut && this.isShortcutInUse(shortcut)) {
						shortcutInput.classList.add("settings-shortcut-error");
						shortcutInput.classList.remove("settings-shortcut-valid");
						shortcutInput.focus();
						return;
					} else {
						shortcutInput.classList.remove("settings-shortcut-error");
						shortcutInput.classList.add("settings-shortcut-valid");
					}

					const newRole: Role = {
						id: name.toLowerCase().replace(/\s+/g, "-"),
						name,
						icon,
						shortcut: shortcut || undefined,
						isDefault: false,
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
		return this.plugin.settings.roles.some(
			(role) => role.shortcut === shortcut && role.id !== excludeRoleId
		);
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
