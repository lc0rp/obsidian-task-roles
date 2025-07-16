import { App, Modal, Editor } from 'obsidian';
import { TaskRoleAssignment, ParsedTaskRoleAssignment, Role } from '../types';
import { ContactCompanyPickerModal } from './contact-company-picker-modal';
import type TaskRolesPlugin from '../main';

export class TaskRoleAssignmentModal extends Modal {
    plugin: TaskRolesPlugin;
    editor: Editor;
    roleAssignments: TaskRoleAssignment[] = [];
    existingRoleAssignments: ParsedTaskRoleAssignment[] = [];

    constructor(app: App, plugin: TaskRolesPlugin, editor: Editor) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Parse existing assignees
        const currentLine = this.editor.getLine(this.editor.getCursor().line);
        this.existingRoleAssignments = this.plugin.taskRolesService.parseRoleAssignments(currentLine, this.plugin.getVisibleRoles());

        // Initialize assignees from existing data
        this.roleAssignments = this.existingRoleAssignments.map(pa => ({
            roleId: pa.role.id,
            assignees: pa.assignees
        }));

        contentEl.createEl('h2', { text: 'Assign roles, people or companies' });

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
            addButton.onclick = (e) => {
                e.stopPropagation();
                this.showAssigneeSelector(role.id, roleDiv);
            };

            // Make the entire role section clickable (except assignee tags)
            roleDiv.classList.add('role-section-clickable');
            roleDiv.onclick = (e) => {
                // Don't trigger if clicking on assignee tags
                const target = e.target as HTMLElement;
                if (!target.closest('.assignee-tag')) {
                    this.showAssigneeSelector(role.id, roleDiv);
                }
            };

            // Add hover effects for the entire role section
            roleDiv.onmouseenter = () => {
                addButton.classList.add('highlighted');
            };
            roleDiv.onmouseleave = () => {
                addButton.classList.remove('highlighted');
            };

            // Show existing assignees
            const roleAssignment = this.roleAssignments.find(a => a.roleId === role.id);
            if (roleAssignment && roleAssignment.assignees.length > 0) {
                this.renderAssignees(roleDiv, role.id, roleAssignment.assignees);
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

            // Make the entire assignee tag clickable for removal
            assigneeEl.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering role section click
                this.removeAssignee(roleId, assignee);
                this.renderAssignees(container, roleId,
                    this.roleAssignments.find(a => a.roleId === roleId)?.assignees || []);
            };

            // Add hover effects to highlight the remove button
            assigneeEl.onmouseenter = () => {
                removeBtn.classList.add('highlighted');
                assigneeEl.classList.add('removal-ready');
            };
            assigneeEl.onmouseleave = () => {
                removeBtn.classList.remove('highlighted');
                assigneeEl.classList.remove('removal-ready');
            };

            // Keep the original removeBtn click handler as fallback
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeAssignee(roleId, assignee);
                this.renderAssignees(container, roleId,
                    this.roleAssignments.find(a => a.roleId === roleId)?.assignees || []);
            };
        }
    }

    showAssigneeSelector(roleId: string, container: HTMLElement) {
        new ContactCompanyPickerModal(this.app, this.plugin, async (assignee: string) => {
            // Create the contact/company file if it doesn't exist
            await this.plugin.taskRolesService.createContactOrCompany(assignee);

            this.addAssignee(roleId, assignee);
            const assignedRole = this.roleAssignments.find(a => a.roleId === roleId);
            this.renderAssignees(container, roleId, assignedRole?.assignees || []);
        }, { mode: 'add', keepOpen: true }).open();
    }

    addAssignee(roleId: string, assignee: string) {
        let assignedRole = this.roleAssignments.find(a => a.roleId === roleId);
        if (!assignedRole) {
            assignedRole = { roleId, assignees: [] };
            this.roleAssignments.push(assignedRole);
        }

        if (!assignedRole.assignees.includes(assignee)) {
            assignedRole.assignees.push(assignee);
        }
    }

    removeAssignee(roleId: string, assignee: string) {
        const assignedRole = this.roleAssignments.find(a => a.roleId === roleId);
        if (assignedRole) {
            assignedRole.assignees = assignedRole.assignees.filter(a => a !== assignee);
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
            this.applyRoleAssignments();
            this.close();
        };

        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        // Add help link
        const helpDiv = this.contentEl.createDiv('help-link-container');
        const helpLink = helpDiv.createEl('a', {
            text: 'Need help?',
            href: 'https://github.com/lc0rp/obsidian-task-roles/docs/help.md',
            cls: 'help-link'
        });
        helpLink.setAttribute('target', '_blank');
        helpLink.setAttribute('rel', 'noopener noreferrer');
    }

    applyRoleAssignments() {
        const currentLine = this.editor.getLine(this.editor.getCursor().line);

        const newLine = this.plugin.taskRolesService.applyRoleAssignmentsToLine(
            currentLine,
            this.roleAssignments,
            this.plugin.getVisibleRoles()
        );

        this.editor.setLine(this.editor.getCursor().line, newLine);
    }
}
