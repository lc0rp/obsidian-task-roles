import { setIcon, MarkdownRenderer, MarkdownView, TFile, Notice } from 'obsidian';
import { TaskData, TaskStatus, TaskPriority, TASK_DATE_ICONS } from '../types';
import type TaskRolesPlugin from '../main';

export class TaskCardComponent {
    private plugin: TaskRolesPlugin;
    private app: any;

    constructor(
        plugin: TaskRolesPlugin,
        app: any
    ) {
        this.plugin = plugin;
        this.app = app;
    }

    render(container: HTMLElement, task: TaskData, viewContext?: any): void {
        const cardEl = container.createDiv('task-roles-card');
        cardEl.addClass(this.getTaskStatusClass(task.status));
        cardEl.addClass(this.getTaskPriorityClass(task.priority));

        // Top row with checkbox and action icons
        const topRowEl = cardEl.createDiv('task-roles-card-top-row');

        // Task checkbox
        const checkboxEl = topRowEl.createEl('input', { type: 'checkbox' });
        checkboxEl.checked = task.status === TaskStatus.DONE;
        checkboxEl.onchange = async () => {
            const newStatus = checkboxEl.checked ? TaskStatus.DONE : TaskStatus.TODO;
            await this.updateTaskStatus(task, newStatus);
            // Note: Parent component should handle re-rendering
        };

        // Action icons row (moved to top)
        const actionsEl = topRowEl.createDiv('task-roles-card-actions');

        // Priority icon
        const priorityIcon = actionsEl.createSpan('task-card-action-icon');
        if (task.priority === TaskPriority.MEDIUM) {
            priorityIcon.setText('⚪');
        } else {
            setIcon(priorityIcon, this.getPriorityIconName(task.priority));
        }
        const priorityLabel = `Priority: ${task.priority.toUpperCase()}`;
        priorityIcon.setAttribute('aria-label', priorityLabel);
        priorityIcon.setAttribute('title', priorityLabel);

        // Link icon
        const linkIcon = actionsEl.createSpan('task-card-action-icon clickable');
        setIcon(linkIcon, 'link');
        linkIcon.setAttribute('aria-label', task.filePath);
        linkIcon.setAttribute('title', task.filePath);
        linkIcon.onclick = (e) => {
            e.stopPropagation();
            this.openFileAtTask(task, true);
        };

        // Edit icon
        const editIcon = actionsEl.createSpan('task-card-action-icon clickable');
        setIcon(editIcon, 'pencil');
        editIcon.setAttribute('aria-label', 'Edit task');
        editIcon.setAttribute('title', 'Edit task');
        editIcon.onclick = async (e) => {
            e.stopPropagation();
            await this.openTaskEditModal(task);
        };

        // Role assign icon
        const assignIcon = actionsEl.createSpan('task-card-action-icon clickable');
        setIcon(assignIcon, 'users');
        assignIcon.setAttribute('aria-label', 'Assign task roles');
        assignIcon.setAttribute('title', 'Assign task roles');
        assignIcon.onclick = async (e) => {
            e.stopPropagation();
            await this.openRoleAssignModalForTask(task);
        };

        // Task content
        const contentEl = cardEl.createDiv('task-roles-card-content');

        // Task description
        const descriptionEl = contentEl.createDiv('task-roles-card-description');
        MarkdownRenderer.renderMarkdown(
            task.description,
            descriptionEl,
            task.filePath,
            viewContext || this.app
        );

        // Task metadata
        const metadataEl = contentEl.createDiv('task-roles-card-metadata');

        // Dates
        if (task.dates.due) {
            const dueDateEl = metadataEl.createSpan('task-roles-card-due-date');
            dueDateEl.setText(`${TASK_DATE_ICONS.due} ${this.formatDate(task.dates.due)}`);
            if (this.isOverdue(task.dates.due)) {
                dueDateEl.addClass('overdue');
            }
        }

        if (task.dates.scheduled) {
            const scheduledEl = metadataEl.createSpan('task-roles-card-scheduled-date');
            scheduledEl.setText(`${TASK_DATE_ICONS.scheduled} ${this.formatDate(task.dates.scheduled)}`);
        }

        if (task.dates.done) {
            const completedEl = metadataEl.createSpan('task-roles-card-completed-date');
            completedEl.setText(`${TASK_DATE_ICONS.done} ${this.formatDate(task.dates.done)}`);
        }

        // Priority indicator
        if (task.priority !== TaskPriority.MEDIUM) {
            const priorityEl = metadataEl.createSpan('task-roles-card-priority');
            priorityEl.setText(task.priority.toUpperCase());
        }

        // Tags
        if (task.tags.length > 0) {
            const tagsEl = metadataEl.createDiv('task-roles-card-tags');
            for (const tag of task.tags) {
                const tagEl = tagsEl.createSpan('task-roles-card-tag');
                tagEl.setText(`#${tag}`);
            }
        }
    }

    private getTaskStatusClass(status: TaskStatus): string {
        switch (status) {
            case TaskStatus.TODO:
                return 'task-status-todo';
            case TaskStatus.IN_PROGRESS:
                return 'task-status-in-progress';
            case TaskStatus.DONE:
                return 'task-status-done';
            case TaskStatus.CANCELLED:
                return 'task-status-cancelled';
            default:
                return 'task-status-unknown';
        }
    }

    private async updateTaskStatus(task: TaskData, newStatus: TaskStatus): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(task.filePath);
            if (!(file instanceof TFile)) return;

            const fileContent = await this.app.vault.read(file);
            const lines = fileContent.split('\n');
            
            if (task.lineNumber >= 0 && task.lineNumber < lines.length) {
                let line = lines[task.lineNumber];
                
                // Update the checkbox based on the new status
                if (newStatus === TaskStatus.DONE) {
                    line = line.replace(/- \[ \]/, '- [x]');
                } else {
                    line = line.replace(/- \[x\]/, '- [ ]');
                }
                
                lines[task.lineNumber] = line;
                await this.app.vault.modify(file, lines.join('\n'));
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            new Notice('Failed to update task status');
        }
    }

    private getTaskPriorityClass(priority: TaskPriority): string {
        switch (priority) {
            case TaskPriority.HIGHEST:
                return 'task-priority-urgent';
            case TaskPriority.HIGH:
                return 'task-priority-high';
            case TaskPriority.MEDIUM:
                return 'task-priority-medium';
            case TaskPriority.LOW:
                return 'task-priority-low';
            default:
                return 'task-priority-unknown';
        }
    }

    private getPriorityIconName(priority: TaskPriority): string {
        switch (priority) {
            case TaskPriority.HIGHEST:
                return 'alert-octagon';
            case TaskPriority.HIGH:
                return 'arrow-up';
            case TaskPriority.LOW:
                return 'arrow-down';
            default:
                return 'circle';
        }
    }

    private formatDate(date: Date): string {
        return date.toLocaleDateString();
    }

    private isOverdue(date: Date): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }

    private async openFileAtTask(task: TaskData, highlight = false): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(task.filePath);
        if (!(file instanceof TFile)) return;

        await this.app.workspace.getLeaf(false).openFile(file);
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const editor = view.editor;
        editor.setCursor({ line: task.lineNumber, ch: 0 });
        if (highlight) {
            editor.setSelection({ line: task.lineNumber, ch: 0 }, { line: task.lineNumber, ch: editor.getLine(task.lineNumber).length });
            setTimeout(() => editor.setCursor({ line: task.lineNumber, ch: 0 }), 1000);
        }
    }

    private async openRoleAssignModalForTask(task: TaskData): Promise<void> {
        await this.openFileAtTask(task);
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            this.plugin.openRolesModal(view.editor);
        }
    }

    private async openTaskEditModal(task: TaskData): Promise<void> {
        await this.openFileAtTask(task);
        const tasksPlugin = (this.app as any).plugins?.plugins?.["obsidian-tasks-plugin"];
        if (tasksPlugin && typeof tasksPlugin.openEditModal === 'function') {
            tasksPlugin.openEditModal();
        } else {
            new Notice('Tasks plugin not available');
        }
    }
} 