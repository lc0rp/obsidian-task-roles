import { App, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_ROLES, Role } from "../types";
import { RoleEditModal } from "../modals/role-edit-modal";
import type TaskRolesPlugin from "../main";

export class TaskRolesSettingTab extends PluginSettingTab {
	plugin: TaskRolesPlugin;
	private abortController: AbortController | null = null;

	constructor(app: App, plugin: TaskRolesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private createMeContactSetting(containerEl: HTMLElement): void {
		const setting = new Setting(containerEl)
			.setName("Create @me contact")
			.setDesc("Create a special contact file for yourself");

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

					await this.plugin.taskRolesService.createMeContact();

					// Refresh the settings display to show the new state
					this.display();
				} catch (error) {
					console.error("Failed to create @me contact:", error);
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
			.meContactExists()
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
						cls: "me-contact-done-pill",
					});
				}
			})
			.catch((error) => {
				// Check if component is still mounted
				if (this.abortController?.signal.aborted) return;

				console.error("Failed to check @me contact existence:", error);
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

		containerEl.createEl("h3", { text: "Task Roles Settings" });

		// Contact symbol setting
		new Setting(containerEl)
			.setName("Person or contact prefix")
			.setDesc(
				"Type this symbol to trigger a person or contact search (affects future data only)"
			)
			.addText((text) =>
				text
					.setPlaceholder("@")
					.setValue(this.plugin.settings.contactSymbol)
					.onChange(async (value) => {
						this.plugin.settings.contactSymbol = value || "@";
						await this.plugin.saveSettings();
					})
			);

		// Company symbol setting
		new Setting(containerEl)
			.setName("Company or group prefix")
			.setDesc(
				"Type this symbol to initiate a company, organization, or group search (affects future data only)"
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

		// Contact directory setting
		new Setting(containerEl)
			.setName("Contact directory")
			.setDesc("Directory where contact files are stored")
			.addText((text) =>
				text
					.setPlaceholder("Contacts")
					.setValue(this.plugin.settings.contactDirectory)
					.onChange(async (value) => {
						this.plugin.settings.contactDirectory =
							value || "Contacts";
						await this.plugin.saveSettings();
					})
			);

		// Company directory setting
		new Setting(containerEl)
			.setName("Company directory")
			.setDesc(
				"Directory where company, group, or organization files are stored"
			)
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

		// Create @me contact button
		this.createMeContactSetting(containerEl);

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

		// Compatibility mode toggle
		const tasksPlugin = (this.app as any).plugins?.plugins?.[
			"obsidian-tasks-plugin"
		];
		const compatDesc = tasksPlugin
			? "Use custom backslash trigger instead of built-in editor suggest for role shortcuts (automatically enabled when Tasks plugin is installed)"
			: "Use custom backslash trigger instead of built-in editor suggest for role shortcuts";

		new Setting(containerEl)
			.setName("Compatibility mode")
			.setDesc(compatDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.compatMode)
					.onChange(async (value) => {
						this.plugin.settings.compatMode = value;
						this.plugin.settings.compatModeUserSet = true; // Mark as user-set
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

		// Default roles
		containerEl.createEl("h4", { text: "Default roles" });
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

		// Custom roles
		const customRoles = this.plugin.settings.roles.filter(
			(r) => !r.isDefault
		);
		if (customRoles.length > 0) {
			containerEl.createEl("h4", { text: "Custom roles" });
			for (const role of customRoles) {
				const shortcutText = role.shortcut ? `\nShortcut: \\${role.shortcut}` : '';
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
						shortcutInput.style.border = "2px solid var(--text-error)";
						shortcutInput.focus();
						return;
					} else {
						shortcutInput.style.border = "";
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
		return this.plugin.settings.roles.some(role => 
			role.shortcut === shortcut && role.id !== excludeRoleId
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
