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
                text.setValue(this.role.name);
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
                text.setValue(this.role.shortcut || '');
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
                shortcutInput.style.border = "2px solid var(--text-error)";
                shortcutInput.focus();
                return;
            } else {
                shortcutInput.style.border = "";
            }

            this.role.name = name;
            this.role.icon = icon;
            this.role.shortcut = shortcut || undefined;
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
        return this.plugin.settings.roles.some(role => 
            role.shortcut === shortcut && role.id !== excludeRoleId
        );
    }
} 