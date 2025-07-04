import { 
	App, 
	Editor, 
	MarkdownView, 
	Plugin,
	WorkspaceLeaf
} from 'obsidian';

import { TaskAssignmentSettings, DEFAULT_SETTINGS, Role } from './types';
import { TaskAssignmentService } from './services/task-assignment.service';
import { TaskCacheService } from './services/task-cache.service';
import { taskAssignmentExtension } from './editor/task-assignment-extension';
import { AssignmentSuggest } from './editor/assignment-suggest';
import { AssignmentModal } from './modals/assignment-modal';
import { TaskAssignmentSettingTab } from './settings/task-assignment-settings-tab';
import { TaskAssignmentView } from './views/task-assignment-view';

export default class TaskAssignmentPlugin extends Plugin {
	settings: TaskAssignmentSettings;
	taskAssignmentService: TaskAssignmentService;
	taskCacheService: TaskCacheService;

	async onload() {
		await this.loadSettings();
		
		// Initialize services
		this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
		this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles());
		
		// Initialize task cache
		await this.taskCacheService.initializeCache();
		
		// Register view
		this.registerView(
			'task-assignment-view',
			(leaf) => new TaskAssignmentView(leaf, this, this.taskCacheService)
		);

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

		// Register view commands
		this.addCommand({
			id: 'open-task-assignment-view',
			name: 'Open Task Center',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'refresh-task-cache',
			name: 'Refresh Task Cache',
			callback: () => {
				this.taskCacheService.refreshCache();
			}
		});

		// Register editor suggest for inline assignment
		this.registerEditorSuggest(new AssignmentSuggest(this.app, this));

		// Register the CodeMirror extension for task icons
		this.registerEditorExtension(taskAssignmentExtension(this));

		// Add settings tab
		this.addSettingTab(new TaskAssignmentSettingTab(this.app, this));
	}

	async onunload() {
		// Clean up task cache service
		if (this.taskCacheService) {
			this.taskCacheService.destroy();
		}
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf;
		const leaves = workspace.getLeavesOfType('task-assignment-view');
		
		if (leaves.length > 0) {
			// A view is already open, use it
			leaf = leaves[0];
		} else {
			// No view open, create one
			leaf = workspace.getLeaf() || workspace.getRightLeaf(false);
			await leaf.setViewState({ type: 'task-assignment-view', active: true });
		}
		
		// Reveal the leaf
		workspace.revealLeaf(leaf);
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
		
		// Update services with new settings
		if (this.taskAssignmentService) {
			this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
		}
		if (this.taskCacheService) {
			this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles());
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update services with new settings
		this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
		if (this.taskCacheService) {
			this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles());
		}
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