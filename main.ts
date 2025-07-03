import { 
	App, 
	Editor, 
	MarkdownView, 
	Modal, 
	Notice, 
	Plugin, 
	PluginSettingTab, 
	Setting, 
	TFile,
	TFolder,
	FuzzySuggestModal,
	EditorSuggest,
	EditorPosition,
	EditorSuggestTriggerInfo,
	EditorSuggestContext,
	setIcon
} from 'obsidian';

import { 
	EditorView, 
	Decoration, 
	DecorationSet, 
	ViewPlugin, 
	ViewUpdate,
	WidgetType
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Remember to rename these classes and interfaces!

interface TaskAssignmentSettings {
	contactSymbol: string;
	companySymbol: string;
	contactDirectory: string;
	companyDirectory: string;
	roles: Role[];
	hiddenDefaultRoles: string[];
}

interface Role {
	id: string;
	name: string;
	icon: string;
	isDefault: boolean;
	order: number;
}

interface Assignment {
	roleId: string;
	assignees: string[];
}

interface ParsedAssignment {
	role: Role;
	assignees: string[];
}

const DEFAULT_ROLES: Role[] = [
	{ id: 'drivers', name: 'Drivers', icon: '🚗', isDefault: true, order: 1 },
	{ id: 'approvers', name: 'Approvers', icon: '👍', isDefault: true, order: 2 },
	{ id: 'contributors', name: 'Contributors', icon: '👥', isDefault: true, order: 3 },
	{ id: 'informed', name: 'Informed', icon: '📢', isDefault: true, order: 4 }
];

const DEFAULT_SETTINGS: TaskAssignmentSettings = {
	contactSymbol: '@',
	companySymbol: '+',
	contactDirectory: 'Contacts',
	companyDirectory: 'Companies',
	roles: DEFAULT_ROLES,
	hiddenDefaultRoles: []
};

// Widget class for the assignment icon
class TaskAssignmentWidget extends WidgetType {
	constructor(private plugin: TaskAssignmentPlugin, private lineNumber: number) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const iconContainer = document.createElement('span');
		iconContainer.className = 'task-assignment-icon-container';
		const iconButton = iconContainer.createEl('button', {cls: 'task-assignment-icon-button'});
		iconButton.setAttribute('aria-label', 'Assign task roles');
		iconButton.setAttribute('title', 'Assign task roles');
		setIcon(iconButton.createEl('span', {cls: 'task-assignment-icon'}), 'users');

		iconButton.addEventListener('mousedown', async (e) => {
			e.preventDefault();
			e.stopPropagation();

			try {
				if(!this.plugin) {
					console.warn('Task assignment plugin not found.');
					return false;
				}

				if(typeof this.lineNumber !== 'number' || this.lineNumber < 0) {
					console.warn('Invalid line number: ', this.lineNumber);
					return false;
				}

				const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
				if(!activeView) {
					console.warn('Active view not found');
					return false;
				}

				const editor = activeView.editor;

				if(!editor) {
					console.warn('Editor not found');
					return false;
				}

				const cursor = editor.getCursor();
				
				// Set cursor to the line where the icon was clicked
				editor.setCursor({ line: this.lineNumber, ch: cursor.ch });

				// TODO: validate that the line is a task

				// Open the assignment modal
				this.plugin.openAssignmentModal(editor);

				return true;
			} catch( error ) {
				console.error('Error triggering task assignment from inline button: ', error);
			}
		});

		return iconContainer;
	}
}

// CodeMirror extension to add task assignment icons
const taskAssignmentExtension = (plugin: TaskAssignmentPlugin) => ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const builder = new RangeSetBuilder<Decoration>();
			
			for (const { from, to } of view.visibleRanges) {
				for (let pos = from; pos <= to;) {
					const line = view.state.doc.lineAt(pos);
					const lineText = line.text;
					
					// Check if this line is a task (contains checkbox)
					const taskRegex = /^\s*[-*+]\s*\[[ xX]\]/;
					if (taskRegex.test(lineText)) {
						// Check if there's content after the checkbox
						const checkboxMatch = lineText.match(/^\s*[-*+]\s*\[[ xX]\]\s*/);
						if (checkboxMatch) {
							const afterCheckbox = lineText.substring(checkboxMatch[0].length);
							
							// Only add icon if there's content after the checkbox
							if (afterCheckbox.trim().length > 0) {
								const lineNumber = view.state.doc.lineAt(pos).number - 1; // Convert to 0-based
								const widget = Decoration.widget({
									widget: new TaskAssignmentWidget(plugin, lineNumber),
									side: 1, // Place after the line content
								});
								
								builder.add(line.to, line.to, widget);
							}
						}
					}
					
					pos = line.to + 1;
				}
			}
			
			return builder.finish();
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

export default class TaskAssignmentPlugin extends Plugin {
	settings: TaskAssignmentSettings;

	async onload() {
		await this.loadSettings();

		// Register the assignment command
		this.addCommand({
			id: 'assign-task-roles',
			name: 'Assign task roles',
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
				const line = editor.getLine(editor.getCursor().line);
				const isTask = /^\s*- \[[ x]\]/.test(line);
				
				if (isTask) {
					if (!checking) {
						this.openAssignmentModal(editor);
					}
					return true;
				}
				return false;
			}
		});

		// Register editor suggest for inline assignment
		this.registerEditorSuggest(new AssignmentSuggest(this.app, this));

		// Register the CodeMirror extension for task icons
		this.registerEditorExtension(taskAssignmentExtension(this));

		// Add settings tab
		this.addSettingTab(new TaskAssignmentSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		
		// Ensure default roles exist if not hidden
		for (const defaultRole of DEFAULT_ROLES) {
			if (!this.settings.roles.find(r => r.id === defaultRole.id)) {
				if (!this.settings.hiddenDefaultRoles.includes(defaultRole.id)) {
					this.settings.roles.push(defaultRole);
				}
			}
		}
		
		// Sort roles by order
		this.settings.roles.sort((a, b) => a.order - b.order);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	openAssignmentModal(editor: Editor) {
		new AssignmentModal(this.app, this, editor).open();
	}

	getVisibleRoles(): Role[] {
		return this.settings.roles.filter(role => 
			!role.isDefault || !this.settings.hiddenDefaultRoles.includes(role.id)
		);
	}

	async getContactsAndCompanies(symbol: string): Promise<string[]> {
		const directory = symbol === this.settings.contactSymbol 
			? this.settings.contactDirectory 
			: this.settings.companyDirectory;

		const folder = this.app.vault.getAbstractFileByPath(directory);
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}

		const files: string[] = [];
		for (const file of folder.children) {
			if (file instanceof TFile && file.extension === 'md') {
				files.push(file.basename);
			}
		}

		return files.sort();
	}

	parseTaskAssignments(taskText: string): ParsedAssignment[] {
		const assignments: ParsedAssignment[] = [];
		const roles = this.getVisibleRoles();
		
		for (const role of roles) {
			const allIcons = roles.map(r => this.escapeRegex(r.icon)).join('');
			const regex = new RegExp(`${this.escapeRegex(role.icon)}\\s+([^${allIcons}]+?)(?=\\s*[${allIcons}]|$)`, 'g');
			const match = regex.exec(taskText);
			
			if (match) {
				const assigneeText = match[1].trim();
				const assignees = this.parseAssignees(assigneeText);
				if (assignees.length > 0) {
					assignments.push({ role, assignees });
				}
			}
		}
		
		return assignments;
	}

	private parseAssignees(text: string): string[] {
		const linkRegex = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
		const assignees: string[] = [];
		let match;
		
		while ((match = linkRegex.exec(text)) !== null) {
			assignees.push(match[2]); // Use the alias part (e.g., @John)
		}
		
		return assignees;
	}

	formatAssignments(assignments: Assignment[]): string {
		const visibleRoles = this.getVisibleRoles();
		const parts: string[] = [];
		
		// Sort by role order
		const sortedAssignments = assignments
			.filter(a => a.assignees.length > 0)
			.sort((a, b) => {
				const roleA = visibleRoles.find(r => r.id === a.roleId);
				const roleB = visibleRoles.find(r => r.id === b.roleId);
				return (roleA?.order || 999) - (roleB?.order || 999);
			});

		for (const assignment of sortedAssignments) {
			const role = visibleRoles.find(r => r.id === assignment.roleId);
			if (role) {
				const formattedAssignees = assignment.assignees.map(assignee => {
					const isContact = assignee.startsWith(this.settings.contactSymbol);
					const directory = isContact ? this.settings.contactDirectory : this.settings.companyDirectory;
					const cleanName = assignee.substring(1); // Remove @ or +
					return `[[${directory}/${cleanName}|${assignee}]]`;
				}).join(', ');
				
				parts.push(`${role.icon} ${formattedAssignees}`);
			}
		}
		
		return parts.join(' ');
	}

	escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	async createMeContact(): Promise<void> {
		const contactPath = `${this.settings.contactDirectory}/Me.md`;
		
		if (await this.app.vault.adapter.exists(contactPath)) {
			new Notice('Contact @me already exists');
			return;
		}

		// Ensure directory exists
		const dir = this.settings.contactDirectory;
		if (!await this.app.vault.adapter.exists(dir)) {
			await this.app.vault.createFolder(dir);
		}

		await this.app.vault.create(contactPath, '# Me\n\nThis is your personal contact file.');
		new Notice('Created @me contact');
	}
}

class AssignmentModal extends Modal {
	plugin: TaskAssignmentPlugin;
	editor: Editor;
	assignments: Assignment[] = [];
	existingAssignments: ParsedAssignment[] = [];

	constructor(app: App, plugin: TaskAssignmentPlugin, editor: Editor) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		// Parse existing assignments
		const currentLine = this.editor.getLine(this.editor.getCursor().line);
		this.existingAssignments = this.plugin.parseTaskAssignments(currentLine);
		
		// Initialize assignments from existing data
		this.assignments = this.existingAssignments.map(pa => ({
			roleId: pa.role.id,
			assignees: pa.assignees
		}));

		contentEl.createEl('h2', { text: 'Assign roles to people or groups' });

		this.renderRoles();
		this.renderNewRole();
		this.renderButtons();
	}

	renderRoles() {
		const rolesContainer = this.contentEl.createDiv('roles-container');
		const visibleRoles = this.plugin.getVisibleRoles();

		// Define descriptions for default roles
		const roleDescriptions: { [key: string]: string } = {
			'drivers': 'execute the task',
			'approvers': 'sign-off the task or decision',
			'contributors': 'provide input or data',
			'informed': 'stakeholders, kept in the loop'
		};

		for (const role of visibleRoles) {
			const roleDiv = rolesContainer.createDiv('role-row');
			
			const roleHeader = roleDiv.createDiv('role-header');
			roleHeader.createSpan('role-icon').setText(role.icon);
			
			const roleNameContainer = roleHeader.createDiv('role-name-container');
			roleNameContainer.createSpan('role-name').setText(role.name);
			
			// Add description for default roles
			if (role.isDefault && roleDescriptions[role.id]) {
				const description = roleNameContainer.createSpan('role-description');
				description.setText(roleDescriptions[role.id]);
			}
			
			const addButton = roleHeader.createEl('button', { text: '+', cls: 'add-assignee-btn' });
			addButton.setAttribute('aria-label', 'Select people or groups');
			addButton.setAttribute('title', 'Select people or groups');
			addButton.onclick = () => this.showAssigneeSelector(role.id, roleDiv);

			// Show existing assignees
			const assignment = this.assignments.find(a => a.roleId === role.id);
			if (assignment && assignment.assignees.length > 0) {
				this.renderAssignees(roleDiv, role.id, assignment.assignees);
			}
		}
	}

	renderAssignees(container: HTMLElement, roleId: string, assignees: string[]) {
		let assigneeContainer = container.querySelector('.assignee-container') as HTMLElement;
		if (!assigneeContainer) {
			assigneeContainer = container.createDiv('assignee-container');
		} else {
			assigneeContainer.empty();
		}

		for (const assignee of assignees) {
			const assigneeEl = assigneeContainer.createSpan('assignee-tag');
			assigneeEl.setText(assignee);
			
			const removeBtn = assigneeEl.createSpan('remove-assignee');
			removeBtn.setText('×');
			removeBtn.onclick = () => {
				this.removeAssignee(roleId, assignee);
				this.renderAssignees(container, roleId, 
					this.assignments.find(a => a.roleId === roleId)?.assignees || []);
			};
		}
	}

	showAssigneeSelector(roleId: string, container: HTMLElement) {
		new AssigneeSelectorModal(this.app, this.plugin, (assignee: string) => {
			this.addAssignee(roleId, assignee);
			const assignment = this.assignments.find(a => a.roleId === roleId);
			this.renderAssignees(container, roleId, assignment?.assignees || []);
		}).open();
	}

	addAssignee(roleId: string, assignee: string) {
		let assignment = this.assignments.find(a => a.roleId === roleId);
		if (!assignment) {
			assignment = { roleId, assignees: [] };
			this.assignments.push(assignment);
		}
		
		if (!assignment.assignees.includes(assignee)) {
			assignment.assignees.push(assignee);
		}
	}

	removeAssignee(roleId: string, assignee: string) {
		const assignment = this.assignments.find(a => a.roleId === roleId);
		if (assignment) {
			assignment.assignees = assignment.assignees.filter(a => a !== assignee);
		}
	}

	renderNewRole() {
		const newRoleDiv = this.contentEl.createDiv('new-role-row');
		
		const nameInput = newRoleDiv.createEl('input', { type: 'text', placeholder: 'Role name' });
		const iconInput = newRoleDiv.createEl('input', { type: 'text', placeholder: '🎯' });
		iconInput.style.width = '40px';
		
		const addBtn = newRoleDiv.createEl('button', { text: 'Add Role' });
		addBtn.onclick = async () => {
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
				
				this.onOpen(); // Refresh the modal
			}
		};
	}

	renderButtons() {
		const buttonDiv = this.contentEl.createDiv('button-container');
		
		const doneBtn = buttonDiv.createEl('button', { text: 'Done', cls: 'mod-cta' });
		doneBtn.onclick = () => {
			this.applyAssignments();
			this.close();
		};
		
		const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
		cancelBtn.onclick = () => this.close();

		// Add help link
		const helpDiv = this.contentEl.createDiv('help-link-container');
		const helpLink = helpDiv.createEl('a', {
			text: 'Need help?',
			href: 'https://github.com/lc0rp/obsidian-task-assignment/docs/help.md',
			cls: 'help-link'
		});
		helpLink.setAttribute('target', '_blank');
		helpLink.setAttribute('rel', 'noopener noreferrer');
	}

	applyAssignments() {
		const currentLine = this.editor.getLine(this.editor.getCursor().line);
		
		// Remove existing assignments
		let cleanLine = currentLine;
		const allVisibleRoles = this.plugin.getVisibleRoles();
		const allIcons = allVisibleRoles.map(r => this.plugin.escapeRegex(r.icon)).join('');
		for (const role of allVisibleRoles) {
			const regex = new RegExp(`\\s*${this.plugin.escapeRegex(role.icon)}\\s+[^${allIcons}]*`, 'g');
			cleanLine = cleanLine.replace(regex, '');
		}
		
		// Add new assignments
		const assignmentText = this.plugin.formatAssignments(this.assignments);
		const newLine = assignmentText ? `${cleanLine.trim()} ${assignmentText}` : cleanLine.trim();
		
		this.editor.setLine(this.editor.getCursor().line, newLine);
	}
}

class AssigneeSelectorModal extends FuzzySuggestModal<string> {
	plugin: TaskAssignmentPlugin;
	onSelect: (assignee: string) => void;
	contacts: string[] = [];
	companies: string[] = [];

	constructor(app: App, plugin: TaskAssignmentPlugin, onSelect: (assignee: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSelect = onSelect;
		this.setPlaceholder('Type @ or + to find assignee');
	}

	async onOpen() {
		super.onOpen();
		this.contacts = await this.plugin.getContactsAndCompanies(this.plugin.settings.contactSymbol);
		this.companies = await this.plugin.getContactsAndCompanies(this.plugin.settings.companySymbol);
	}

	getItems(): string[] {
		const query = this.inputEl.value;
		const items: string[] = [];
		
		if (query.startsWith(this.plugin.settings.contactSymbol)) {
			const searchTerm = query.substring(1).toLowerCase();
			items.push(...this.contacts
				.filter(contact => contact.toLowerCase().includes(searchTerm))
				.map(contact => `${this.plugin.settings.contactSymbol}${contact}`)
			);
			
			// Add @me as special case
			if ('me'.includes(searchTerm)) {
				items.unshift(`${this.plugin.settings.contactSymbol}me`);
			}
		} else if (query.startsWith(this.plugin.settings.companySymbol)) {
			const searchTerm = query.substring(1).toLowerCase();
			items.push(...this.companies
				.filter(company => company.toLowerCase().includes(searchTerm))
				.map(company => `${this.plugin.settings.companySymbol}${company}`)
			);
		}
		
		return items;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string): void {
		this.onSelect(item);
	}
}

class AssignmentSuggest extends EditorSuggest<string> {
	plugin: TaskAssignmentPlugin;

	constructor(app: App, plugin: TaskAssignmentPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);
		
		// Check if we're in a task line
		if (!/^\s*- \[[ x]\]/.test(line)) {
			return null;
		}
		
		// Look for role icon followed by space and @ or +
		const roles = this.plugin.getVisibleRoles();
		for (const role of roles) {
			const pattern = new RegExp(`${this.plugin.escapeRegex(role.icon)}\\s+([${this.plugin.escapeRegex(this.plugin.settings.contactSymbol)}${this.plugin.escapeRegex(this.plugin.settings.companySymbol)}][^\\s]*)$`);
			const match = beforeCursor.match(pattern);
			
			if (match) {
				const query = match[1];
				const start = cursor.ch - query.length;
				return {
					start: { line: cursor.line, ch: start },
					end: cursor,
					query
				};
			}
		}
		
		return null;
	}

	async getSuggestions(context: EditorSuggestContext): Promise<string[]> {
		const { query } = context;
		const suggestions: string[] = [];
		
		if (query.startsWith(this.plugin.settings.contactSymbol)) {
			const contacts = await this.plugin.getContactsAndCompanies(this.plugin.settings.contactSymbol);
			const searchTerm = query.substring(1).toLowerCase();
			
			suggestions.push(...contacts
				.filter(contact => contact.toLowerCase().includes(searchTerm))
				.map(contact => `${this.plugin.settings.contactSymbol}${contact}`)
			);
			
			if ('me'.includes(searchTerm)) {
				suggestions.unshift(`${this.plugin.settings.contactSymbol}me`);
			}
		} else if (query.startsWith(this.plugin.settings.companySymbol)) {
			const companies = await this.plugin.getContactsAndCompanies(this.plugin.settings.companySymbol);
			const searchTerm = query.substring(1).toLowerCase();
			
			suggestions.push(...companies
				.filter(company => company.toLowerCase().includes(searchTerm))
				.map(company => `${this.plugin.settings.companySymbol}${company}`)
			);
		}
		
		return suggestions;
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		el.createDiv({ text: suggestion });
	}

	selectSuggestion(suggestion: string, evt: MouseEvent | KeyboardEvent): void {
		const { context } = this;
		if (!context) return;
		
		const { editor } = context;
		const isContact = suggestion.startsWith(this.plugin.settings.contactSymbol);
		const directory = isContact ? this.plugin.settings.contactDirectory : this.plugin.settings.companyDirectory;
		const cleanName = suggestion.substring(1);
		const link = `[[${directory}/${cleanName}|${suggestion}]]`;
		
		editor.replaceRange(link, context.start, context.end);
	}
}

class TaskAssignmentSettingTab extends PluginSettingTab {
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
					await this.plugin.createMeContact();
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

class RoleEditModal extends Modal {
	plugin: TaskAssignmentPlugin;
	role: Role;
	onSave: () => void;

	constructor(app: App, plugin: TaskAssignmentPlugin, role: Role, onSave: () => void) {
		super(app);
		this.plugin = plugin;
		this.role = role;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Edit role' });

		let nameInput: HTMLInputElement;
		let iconInput: HTMLInputElement;

		new Setting(contentEl)
			.setName('Role name')
			.addText(text => {
				nameInput = text.inputEl;
				text.setValue(this.role.name);
			});

		new Setting(contentEl)
			.setName('Role icon')
			.addText(text => {
				iconInput = text.inputEl;
				text.setValue(this.role.icon);
			});

		const buttonDiv = contentEl.createDiv('button-container');
		
		const saveBtn = buttonDiv.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveBtn.onclick = async () => {
			const name = nameInput.value.trim();
			const icon = iconInput.value.trim();

			if (name && icon) {
				this.role.name = name;
				this.role.icon = icon;
				await this.plugin.saveSettings();
				this.onSave();
				this.close();
			}
		};

		const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
		cancelBtn.onclick = () => this.close();
	}
}
