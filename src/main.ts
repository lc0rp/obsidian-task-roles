import {
	Editor,
	MarkdownView,
	Plugin,
	WorkspaceLeaf,
	MarkdownFileInfo,
} from "obsidian";

import { TaskRolesPluginSettings, DEFAULT_SETTINGS, Role, DEFAULT_ROLES } from "./types";
import { TaskRolesService } from "./services/task-roles.service";
import { taskRolesExtension } from "./editor/task-roles-extension";
// import { TaskRolesSuggest } from "./editor/task-roles-suggest";
import { shortcutsTrigger } from "./editor/shortcuts-trigger";
import { TaskRoleAssignmentModal } from "./modals/task-role-assignment-modal";
import { TaskRolesSettingTab } from "./settings/task-roles-settings-tab";
import { TaskRolesView } from "./views/task-roles-view";
import { syntaxTree } from "@codemirror/language";

export default class TaskRolesPlugin extends Plugin {
	settings: TaskRolesPluginSettings;
	taskRolesService: TaskRolesService;
	private initializationComplete = false;

	async onload() {
		// Only essential synchronous setup in onload
		await this.loadSettings();

		// Register view (lightweight)
		this.registerView(
			"task-roles-view",
			(leaf) => new TaskRolesView(leaf, this)
		);

		// Register commands (lightweight)
		this.addCommand({
			id: "assign-task-roles",
			name: "Assign or Update Roles",
			editorCheckCallback: (
				checking: boolean,
				editor: Editor,
				_ctx: MarkdownView | MarkdownFileInfo
			) => {
				const line = editor.getLine(editor.getCursor().line);
				const isTask = /^\s*- \[[ x]\]/.test(line);

				if (isTask) {
					if (!checking) {
						this.openRolesModal(editor);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: "open-task-roles-view",
			name: "Open Task Center",
			callback: () => {
				this.activateView();
			},
		});

		// Add sidebar ribbon icon
		this.addRibbonIcon("layout-grid", "Open Task Center", () => {
			this.activateView();
		});

		// Add settings tab (lightweight)
		this.addSettingTab(new TaskRolesSettingTab(this.app, this));

		// Defer heavy initialization to onLayoutReady
		if (this.app.workspace.layoutReady) {
			this.initializeHeavyComponents();
		} else {
			this.app.workspace.onLayoutReady(() =>
				this.initializeHeavyComponents()
			);
		}
	}

	private initializeHeavyComponents() {
		// Don't await - let it run in background to avoid blocking
		this.performHeavyInitialization().catch(console.error);
	}

	private async performHeavyInitialization() {
		try {
			// Initialize services with potential file system operations
			this.taskRolesService = new TaskRolesService(
				this.app,
				this.settings
			);

			// Register editor extensions that may be heavy
			this.registerEditorExtension(
				shortcutsTrigger(this.app, this.settings, () =>
					this.getVisibleRoles()
				)
			);
			this.registerEditorExtension(taskRolesExtension(this));

			this.initializationComplete = true;
		} catch (error) {
			console.error(
				"TaskRoles plugin: Error during heavy initialization:",
				error
			);
		}
	}

	async onunload() {
		// Clean up services
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf;
		const leaves = workspace.getLeavesOfType("task-roles-view");

		if (leaves.length > 0) {
			// A view is already open, use it
			leaf = leaves[0];
		} else {
			// No view open, create one
			leaf = workspace.getLeaf() || workspace.getRightLeaf(false);
			await leaf.setViewState({ type: "task-roles-view", active: true });
		}

		// Reveal the leaf
		workspace.revealLeaf(leaf);
	}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );

        // Migrate legacy role fields (name/aliases/shortcut/isDefault) to new schema (names/shortcuts)
        if (Array.isArray(this.settings.roles)) {
            this.settings.roles = this.settings.roles.map((r: any) => {
                const migrated: any = { ...r };
                if (!Array.isArray(migrated.names)) {
                    const base = (migrated.name ? String(migrated.name) : "").toLowerCase();
                    const rest = Array.isArray(migrated.aliases)
                        ? migrated.aliases.map((a: any) => String(a).toLowerCase())
                        : [];
                    const seen = new Set<string>();
                    const names = [base, ...rest].filter((n) => {
                        const key = String(n);
                        if (!key) return false;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    migrated.names = names;
                }
                if (!Array.isArray(migrated.shortcuts)) {
                    const primary = migrated.shortcut ? String(migrated.shortcut).toLowerCase() : "";
                    const rest = Array.isArray(migrated.shortcutAliases)
                        ? migrated.shortcutAliases.map((s: any) => String(s).toLowerCase())
                        : [];
                    const seenS = new Set<string>();
                    const shortcuts = [primary, ...rest]
                        .map((s) => s.trim())
                        .filter((s) => {
                            if (!s) return false;
                            if (seenS.has(s)) return false;
                            seenS.add(s);
                            return true;
                        });
                    migrated.shortcuts = shortcuts;
                }
                // Remove legacy properties if present
                delete migrated.name;
                delete migrated.aliases;
                delete migrated.shortcut;
                delete migrated.shortcutAliases;
                delete migrated.isDefault;
                delete migrated.iconAliases;
                return migrated as Role;
            });
        }

        // Ensure default roles exist and have correct icons and other properties
        const { DEFAULT_ROLES } = await import("./types");
        for (const defaultRole of DEFAULT_ROLES) {
            const existingRole = this.settings.roles.find(
                (r) => r.id === defaultRole.id
            );

            if (existingRole) {
                // Update existing default role with correct icon and other properties
                existingRole.icon = defaultRole.icon;
                existingRole.names = [...(defaultRole.names || [])];
                existingRole.shortcuts = [...(defaultRole.shortcuts || [])];
                existingRole.order = defaultRole.order;
            } else if (
                !this.settings.hiddenDefaultRoles.includes(defaultRole.id)
            ) {
                // Add missing default role if not hidden
                this.settings.roles.push(defaultRole);
            }
        }

		const existingAssigneeRole = this.settings.roles.find(
			(r) => r.id === "assignees"
		);
		if (existingAssigneeRole) {
			this.settings.roles = this.settings.roles.filter(
				(r) => r.id !== "assignees"
			);
		}

		// Sort roles by order
		this.settings.roles.sort((a, b) => a.order - b.order);

		// Update services with new settings
		if (this.taskRolesService) {
			this.taskRolesService = new TaskRolesService(
				this.app,
				this.settings
			);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update services with new settings if initialized
		if (this.initializationComplete) {
			this.taskRolesService = new TaskRolesService(
				this.app,
				this.settings
			);
		}
	}

	openRolesModal(editor: Editor) {
		// Ensure initialization is complete before opening modal
		if (!this.initializationComplete) {
			console.warn(
				"TaskRoles plugin: Initialization not complete, deferring modal opening"
			);
			this.performHeavyInitialization()
				.then(() => {
					new TaskRoleAssignmentModal(this.app, this, editor).open();
				})
				.catch(console.error);
			return;
		}
		new TaskRoleAssignmentModal(this.app, this, editor).open();
	}

    getVisibleRoles(): Role[] {
        // Default behavior: filter based on hiddenDefaultRoles
        const defaultIds = new Set(DEFAULT_ROLES.map((r) => r.id));
        return this.settings.roles.filter((role) => {
            if (this.settings.hiddenDefaultRoles.includes(role.id) && defaultIds.has(role.id)) {
                return false;
            }
            return true;
        });
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
					if (node.name === "FencedCode") {
						const infoNode = node.getChild("FencedCodeInfo");
						const info = infoNode
							? state
									.sliceDoc(infoNode.from, infoNode.to)
									.trim()
									.toLowerCase()
							: "";

						return info === "tasks" || info === "dataview";
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
		let lang = "";

		for (let i = 0; i <= line; i++) {
			const text = editor.getLine(i).trim();
			const match = text.match(/^```([\w-]*)/); // opening/closing fence

			if (match) {
				const currentLang = (match[1] || "").toLowerCase();

				if (!inside) {
					inside = true;
					lang = currentLang;
				} else {
					inside = false;
					lang = "";
				}
			}
		}

		return inside && (lang === "tasks" || lang === "dataview");
	}
}
