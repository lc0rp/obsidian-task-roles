import {
    Editor,
    MarkdownView,
    Plugin,
    WorkspaceLeaf
} from 'obsidian';

import { TaskRolesPluginSettings, DEFAULT_SETTINGS, Role } from './types';
import { TaskRolesService } from './services/task-roles.service';
import { taskRolesExtension } from './editor/task-roles-extension';
import { TaskRolesSuggest } from './editor/task-roles-suggest';
import { RoleSuggest } from './editor/role-suggest';
import { backslashTrigger } from './editor/backslash-trigger';
import { TaskRoleAssignmentModal } from './modals/task-role-assignment-modal';
import { TaskRolesSettingTab } from './settings/task-roles-settings-tab';
import { TaskRolesView } from './views/task-roles-view';
import { syntaxTree } from '@codemirror/language';

export default class TaskRolesPlugin extends Plugin {
    settings: TaskRolesPluginSettings;
    taskRolesService: TaskRolesService;

    async onload() {
        await this.loadSettings();

        // Initialize services
        this.taskRolesService = new TaskRolesService(this.app, this.settings);

        // Register view
        this.registerView(
            'task-roles-view',
            (leaf) => new TaskRolesView(leaf, this)
        );

        // Register the role assign command
        this.addCommand({
            id: 'assign-task-roles',
            name: 'Assign or Update Roles',
            editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
                const line = editor.getLine(editor.getCursor().line);
                const isTask = /^\s*- \[[ x]\]/.test(line);

                if (isTask) {
                    if (!checking) {
                        this.openRolesModal(editor);
                    }
                    return true;
                }
                return false;
            }
        });

        // Register view commands
        this.addCommand({
            id: 'open-task-roles-view',
            name: 'Open Task Center',
            callback: () => {
                this.activateView();
            }
        });


        // Register editor suggest for inline role suggestions
        this.registerEditorSuggest(new TaskRolesSuggest(this.app, this));

        // Register role suggestion for \ shortcuts - conditional based on compatibility mode
        if (this.settings.compatMode) {
            this.registerEditorExtension(backslashTrigger(this.app, this.settings));
        } else {
            this.registerEditorSuggest(new RoleSuggest(this.app, this));
        }

        // Register the CodeMirror extension for task icons
        this.registerEditorExtension(taskRolesExtension(this));

        // Add settings tab
        this.addSettingTab(new TaskRolesSettingTab(this.app, this));
    }

    async onunload() {
        // Clean up services
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf;
        const leaves = workspace.getLeavesOfType('task-roles-view');

        if (leaves.length > 0) {
            // A view is already open, use it
            leaf = leaves[0];
        } else {
            // No view open, create one
            leaf = workspace.getLeaf() || workspace.getRightLeaf(false);
            await leaf.setViewState({ type: 'task-roles-view', active: true });
        }

        // Reveal the leaf
        workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Only auto-enable compatibility mode if user has never set it
        const tasksPlugin = (this.app as any).plugins?.plugins?.["obsidian-tasks-plugin"];
        if (tasksPlugin && this.settings.compatModeUserSet === false && this.settings.compatMode === false) {
            this.settings.compatMode = true;
            await this.saveData(this.settings);
        }

        // Ensure default roles exist and have correct icons and other properties
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
        if (this.taskRolesService) {
            this.taskRolesService = new TaskRolesService(this.app, this.settings);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update services with new settings
        this.taskRolesService = new TaskRolesService(this.app, this.settings);
    }

    openRolesModal(editor: Editor) {
        new TaskRoleAssignmentModal(this.app, this, editor).open();
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
                    const parent = node.parent;
                    if (!parent) break;
                    node = parent;
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