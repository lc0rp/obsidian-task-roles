import { App, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_ROLES, Role } from '../types';
import { RoleEditModal } from '../modals/role-edit-modal';
import type TaskAssignmentPlugin from '../main';

export class TaskAssignmentSettingTab extends PluginSettingTab {
	plugin: TaskAssignmentPlugin;

	constructor(app: App, plugin: TaskAssignmentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h3', { text: 'Task Assignment Settings' });

		// Contact symbol setting
		new Setting(containerEl)
			.setName('Person or contact prefix')
			.setDesc('Type this symbol to trigger a person or contact search (affects future data only)')
			.addText(text => text
				.setPlaceholder('@')
				.setValue(this.plugin.settings.contactSymbol)
				.onChange(async (value) => {
					this.plugin.settings.contactSymbol = value || '@';
					await this.plugin.saveSettings();
				}));

		// Company symbol setting
		new Setting(containerEl)
			.setName('Company or group prefix')
			.setDesc('Type this symbol to initiate a company, organization, or group search (affects future data only)')
			.addText(text => text
				.setPlaceholder('+')
				.setValue(this.plugin.settings.companySymbol)
				.onChange(async (value) => {
					this.plugin.settings.companySymbol = value || '+';
					await this.plugin.saveSettings();
				}));

		// Contact directory setting
		new Setting(containerEl)
			.setName('Contact directory')
			.setDesc('Directory where contact files are stored')
			.addText(text => text
				.setPlaceholder('Contacts')
				.setValue(this.plugin.settings.contactDirectory)
				.onChange(async (value) => {
					this.plugin.settings.contactDirectory = value || 'Contacts';
					await this.plugin.saveSettings();
				}));

		// Company directory setting
		new Setting(containerEl)
			.setName('Company directory')
			.setDesc('Directory where company, group, or organization files are stored')
			.addText(text => text
				.setPlaceholder('Companies')
				.setValue(this.plugin.settings.companyDirectory)
				.onChange(async (value) => {
					this.plugin.settings.companyDirectory = value || 'Companies';
					await this.plugin.saveSettings();
				}));

		// Create @me contact button
		new Setting(containerEl)
			.setName('Create @me contact')
			.setDesc('Create a special contact file for yourself')
			.addButton(button => button
				.setButtonText('Create @me')
				.onClick(async () => {
					await this.plugin.taskAssignmentService.createMeContact();
				}));

		// Compact filters toggle
		new Setting(containerEl)
			.setName('Use compact filters')
			.setDesc('Display all filters in a single horizontal line instead of the collapsible panel')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useCompactFilters)
				.onChange(async (value) => {
					this.plugin.settings.useCompactFilters = value;
					await this.plugin.saveSettings();
				}));

		// Debug logging toggle
		new Setting(containerEl)
			.setName('Enable debug logging')
			.setDesc('Log additional information to the console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debug)
				.onChange(async (value) => {
					this.plugin.settings.debug = value;
					await this.plugin.saveSettings();
				}));

		// Task queries toggle
		new Setting(containerEl)
			.setName('Use task queries for content')
			.setDesc('Experimental: Use task query-based approach for rendering content instead of traditional filtering')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTaskQueries)
				.onChange(async (value) => {
					this.plugin.settings.useTaskQueries = value;
					await this.plugin.saveSettings();
				}));

		// Role management
		containerEl.createEl('h3', { text: 'Role management' });

		// Default roles
		containerEl.createEl('h4', { text: 'Default roles' });
		for (const role of DEFAULT_ROLES) {
			new Setting(containerEl)
				.setName(`${role.icon} ${role.name}`)
				.setDesc('Hide this role from future assignment dialogs')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.hiddenDefaultRoles.includes(role.id))
					.onChange(async (value) => {
						if (value) {
							if (!this.plugin.settings.hiddenDefaultRoles.includes(role.id)) {
								this.plugin.settings.hiddenDefaultRoles.push(role.id);
							}
						} else {
							this.plugin.settings.hiddenDefaultRoles =
								this.plugin.settings.hiddenDefaultRoles.filter(id => id !== role.id);
						}
						await this.plugin.saveSettings();
						await this.plugin.loadSettings(); // Refresh roles
					}));
		}

		// Custom roles
		const customRoles = this.plugin.settings.roles.filter(r => !r.isDefault);
		if (customRoles.length > 0) {
			containerEl.createEl('h4', { text: 'Custom roles' });
			for (const role of customRoles) {
				const setting = new Setting(containerEl)
					.setName(`${role.icon} ${role.name}`)
					.setDesc('Custom role');

				setting.addButton(button => button
					.setButtonText('Edit')
					.onClick(() => {
						new RoleEditModal(this.app, this.plugin, role, () => this.display()).open();
					}));

				setting.addButton(button => button
					.setButtonText('Delete')
					.setClass('mod-warning')
					.onClick(async () => {
						this.plugin.settings.roles = this.plugin.settings.roles.filter(r => r.id !== role.id);
						await this.plugin.saveSettings();
						this.display();
					}));
			}
		}

		// Add new role
		containerEl.createEl('h4', { text: 'Add new role' });
		let nameInput: HTMLInputElement;
		let iconInput: HTMLInputElement;

		new Setting(containerEl)
			.setName('Role name')
			.addText(text => {
				nameInput = text.inputEl;
				text.setPlaceholder('Enter role name');
			});

		new Setting(containerEl)
			.setName('Role icon')
			.addText(text => {
				iconInput = text.inputEl;
				text.setPlaceholder('🎯');
			});

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add role')
				.setCta()
				.onClick(async () => {
					const name = nameInput.value.trim();
					const icon = iconInput.value.trim();

					if (name && icon) {
						const newRole: Role = {
							id: name.toLowerCase().replace(/\s+/g, '-'),
							name,
							icon,
							isDefault: false,
							order: this.plugin.settings.roles.length + 1
						};

						this.plugin.settings.roles.push(newRole);
						await this.plugin.saveSettings();

						nameInput.value = '';
						iconInput.value = '';
						this.display();
					}
				}));

		// Add help link at the bottom
		const helpDiv = containerEl.createDiv('help-link-container');
		const helpLink = helpDiv.createEl('a', {
			text: 'Need help? View documentation',
			href: 'https://github.com/lc0rp/obsidian-task-assignment/docs/help.md',
			cls: 'help-link'
		});
		helpLink.setAttribute('target', '_blank');
		helpLink.setAttribute('rel', 'noopener noreferrer');
	}
} 