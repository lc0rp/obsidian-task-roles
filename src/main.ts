import { 
	App, 
	Editor, 
	MarkdownView, 
	Plugin
} from 'obsidian';

import { TaskAssignmentSettings, DEFAULT_SETTINGS, Role } from './types';
import { TaskAssignmentService } from './services/task-assignment.service';
import { taskAssignmentExtension } from './editor/task-assignment-extension';
import { AssignmentSuggest } from './editor/assignment-suggest';
import { AssignmentModal } from './modals/assignment-modal';
import { TaskAssignmentSettingTab } from './settings/task-assignment-settings-tab';

export default class TaskAssignmentPlugin extends Plugin {
	settings: TaskAssignmentSettings;
	taskAssignmentService: TaskAssignmentService;

	async onload() {
		await this.loadSettings();
		
		// Initialize service
		this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);

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
		const { DEFAULT_ROLES } = await import('./types');
		for (const defaultRole of DEFAULT_ROLES) {
			if (!this.settings.roles.find(r => r.id === defaultRole.id)) {
				if (!this.settings.hiddenDefaultRoles.includes(defaultRole.id)) {
					this.settings.roles.push(defaultRole);
				}
			}
		}
		
		// Sort roles by order
		this.settings.roles.sort((a, b) => a.order - b.order);
		
		// Update service with new settings
		if (this.taskAssignmentService) {
			this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update service with new settings
		this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
	}

	openAssignmentModal(editor: Editor) {
		new AssignmentModal(this.app, this, editor).open();
	}

	getVisibleRoles(): Role[] {
		return this.settings.roles.filter(role => 
			!role.isDefault || !this.settings.hiddenDefaultRoles.includes(role.id)
		);
	}
} 