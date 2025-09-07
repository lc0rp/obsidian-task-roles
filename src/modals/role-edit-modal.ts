import { App, Modal, Setting } from 'obsidian';
import { Role } from '../types';
import type TaskRolesPlugin from '../main';

export class RoleEditModal extends Modal {
    plugin: TaskRolesPlugin;
    role: Role;
    onSave: () => void;

    constructor(app: App, plugin: TaskRolesPlugin, role: Role, onSave: () => void) {
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
        let shortcutInput: HTMLInputElement;

        new Setting(contentEl)
            .setName('Role name')
            .addText(text => {
                nameInput = text.inputEl;
                const primary = this.role.names?.[0] || '';
                text.setValue(primary);
            });

        new Setting(contentEl)
            .setName('Role icon')
            .addText(text => {
                iconInput = text.inputEl;
                text.setValue(this.role.icon);
            });

        new Setting(contentEl)
            .setName('Shortcut letter')
            .setDesc('Single character used with \\ to insert this role')
            .addText(text => {
                shortcutInput = text.inputEl;
                const primaryShortcut = this.role.shortcuts?.[0] || '';
                text.setValue(primaryShortcut);
            });

        const buttonDiv = contentEl.createDiv('button-container');

        const saveBtn = buttonDiv.createEl('button', { text: 'Save', cls: 'mod-cta' });
        saveBtn.onclick = async () => {
            const name = nameInput.value.trim();
            const icon = iconInput.value.trim();
            const shortcut = shortcutInput.value.trim();

            if (!name || !icon) {
                return;
            }

            // Check for duplicate shortcut (excluding this role)
            if (shortcut && this.isShortcutInUse(shortcut, this.role.id)) {
                shortcutInput.classList.add("role-edit-shortcut-error");
                shortcutInput.classList.remove("role-edit-shortcut-valid");
                shortcutInput.focus();
                return;
            } else {
                shortcutInput.classList.remove("role-edit-shortcut-error");
                shortcutInput.classList.add("role-edit-shortcut-valid");
            }

            const nameLower = name.toLowerCase();
            const restNames = (this.role.names || []).filter((n) => n !== nameLower);
            this.role.names = [nameLower, ...restNames];
            this.role.icon = icon;
            const lowerShortcut = (shortcut || '').toLowerCase();
            if (lowerShortcut) {
                const restShortcuts = (this.role.shortcuts || []).filter((s) => s !== lowerShortcut);
                this.role.shortcuts = [lowerShortcut, ...restShortcuts];
            } else {
                this.role.shortcuts = (this.role.shortcuts || []).filter(Boolean);
            }
            await this.plugin.saveSettings();
            this.onSave();
            this.close();
        };

        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();
    }

    /**
     * Check if a shortcut is already in use by another role
     */
    private isShortcutInUse(shortcut: string, excludeRoleId?: string): boolean {
        if (!shortcut) return false;
        const lower = shortcut.toLowerCase();
        return this.plugin.settings.roles.some(role =>
            (role.shortcuts || []).includes(lower) && role.id !== excludeRoleId
        );
    }
}
