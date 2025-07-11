import {
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
import { RoleSuggest } from './editor/role-suggest';
import { backslashTrigger } from './editor/backslash-trigger';
import { AssignmentModal } from './modals/assignment-modal';
import { TaskAssignmentSettingTab } from './settings/task-assignment-settings-tab';
import { TaskAssignmentView } from './views/task-assignment-view';
import { syntaxTree } from '@codemirror/language';

export default class TaskAssignmentPlugin extends Plugin {
    settings: TaskAssignmentSettings;
    taskAssignmentService: TaskAssignmentService;
    taskCacheService: TaskCacheService;

    async onload() {
        await this.loadSettings();

        // Initialize services
        this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
        this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles(), this.settings.debug);

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

        // Register role suggestion for \ shortcuts - conditional based on compatibility mode
        if (this.settings.compatMode) {
            this.registerEditorExtension(backslashTrigger(this.app, this.settings));
        } else {
            this.registerEditorSuggest(new RoleSuggest(this.app, this));
        }

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

        // Ensure default roles exist and have correct icons and shortcuts
        const { DEFAULT_ROLES } = await import('./types');
        for (const defaultRole of DEFAULT_ROLES) {
            const existingRole = this.settings.roles.find(r => r.id === defaultRole.id);

            if (existingRole) {
                // Update existing default role with correct icon and other properties
                existingRole.icon = defaultRole.icon;
                existingRole.name = defaultRole.name;
                existingRole.shortcut = defaultRole.shortcut;
                existingRole.isDefault = defaultRole.isDefault;
                existingRole.order = defaultRole.order;
            } else if (!this.settings.hiddenDefaultRoles.includes(defaultRole.id)) {
                // Add missing default role if not hidden
                this.settings.roles.push(defaultRole);
            }
        }

        // Sort roles by order
        this.settings.roles.sort((a, b) => a.order - b.order);

        // Update services with new settings
        if (this.taskAssignmentService) {
            this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
        }
        if (this.taskCacheService) {
            this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles(), this.settings.debug);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update services with new settings
        this.taskAssignmentService = new TaskAssignmentService(this.app, this.settings);
        if (this.taskCacheService) {
            this.taskCacheService = new TaskCacheService(this.app, this.taskAssignmentService, this.getVisibleRoles(), this.settings.debug);
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

    isInTaskCodeBlock(editor: Editor, line: number): boolean {
        /** ---------- 1. CM6 fast‑path ---------- */
        const view = (editor as any).cm; // EditorView in CM6
        if (view && view.state && view.state.selection) {
            try {
                const state = view.state;
                const pos = state.selection.main.head;
                let node = syntaxTree(state).resolve(pos, -1);

                // Walk up the tree until we find a fenced code block
                while (node) {
                    if (node.name === 'FencedCode') {
                        const infoNode = node.getChild('FencedCodeInfo');
                        const info = infoNode
                            ? state.sliceDoc(infoNode.from, infoNode.to).trim().toLowerCase()
                            : '';

                        return info === 'tasks' || info === 'dataview';
                    }
                    node = node.parent;
                }
            } catch {
                /* Fall through to CM5/legacy scan */
            }
        }

        /** ---------- 2. Legacy CM5 / plain scan ---------- */
        let inside = false;
        let lang = '';

        for (let i = 0; i <= line; i++) {
            const text = editor.getLine(i).trim();
            const match = text.match(/^```([\w-]*)/); // opening/closing fence

            if (match) {
                const currentLang = (match[1] || '').toLowerCase();

                if (!inside) {
                    inside = true;
                    lang = currentLang;
                } else {
                    inside = false;
                    lang = '';
                }
            }
        }

        return inside && (lang === 'tasks' || lang === 'dataview');
    }
}