import { setIcon, MarkdownRenderer, MarkdownView, TFile, Notice } from 'obsidian';
import { TaskData, TaskStatus, TaskPriority, TASK_DATE_ICONS } from '../types';
import { TaskCacheService } from '../services/task-cache.service';
import type TaskAssignmentPlugin from '../main';

export class TaskCardComponent {
	private plugin: TaskAssignmentPlugin;
	private taskCacheService: TaskCacheService;
	private app: any;

	constructor(
		plugin: TaskAssignmentPlugin,
		taskCacheService: TaskCacheService,
		app: any
	) {
		this.plugin = plugin;
		this.taskCacheService = taskCacheService;
		this.app = app;
	}

	render(container: HTMLElement, task: TaskData, viewContext?: any): void {
		const cardEl = container.createDiv('task-assignment-card');
		cardEl.addClass(this.getTaskStatusClass(task.status));
		cardEl.addClass(this.getTaskPriorityClass(task.priority));
		
		// Top row with checkbox and action icons
		const topRowEl = cardEl.createDiv('task-assignment-card-top-row');
		
		// Task checkbox
		const checkboxEl = topRowEl.createEl('input', { type: 'checkbox' });
		checkboxEl.checked = task.status === TaskStatus.DONE;
		checkboxEl.onchange = async () => {
			const newStatus = checkboxEl.checked ? TaskStatus.DONE : TaskStatus.TODO;
			await this.taskCacheService.updateTaskStatus(task.id, newStatus);
			// Note: Parent component should handle re-rendering
		};

		// Action icons row (moved to top)
		const actionsEl = topRowEl.createDiv('task-assignment-card-actions');

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

		// Assignment icon
		const assignIcon = actionsEl.createSpan('task-card-action-icon clickable');
		setIcon(assignIcon, 'users');
		assignIcon.setAttribute('aria-label', 'Assign task roles');
		assignIcon.setAttribute('title', 'Assign task roles');
		assignIcon.onclick = async (e) => {
			e.stopPropagation();
			await this.openAssignmentModalForTask(task);
		};

		// Task content
		const contentEl = cardEl.createDiv('task-assignment-card-content');
		
		// Task description
		const descriptionEl = contentEl.createDiv('task-assignment-card-description');
		MarkdownRenderer.renderMarkdown(
				task.description,
				descriptionEl,
				task.filePath,
				viewContext || this.app
		);
		
		// Task metadata
		const metadataEl = contentEl.createDiv('task-assignment-card-metadata');
		
		// Dates
		if (task.dates.due) {
				const dueDateEl = metadataEl.createSpan('task-assignment-card-due-date');
				dueDateEl.setText(`${TASK_DATE_ICONS.due} ${this.formatDate(task.dates.due)}`);
				if (this.isOverdue(task.dates.due)) {
						dueDateEl.addClass('overdue');
				}
		}

		if (task.dates.scheduled) {
				const scheduledEl = metadataEl.createSpan('task-assignment-card-scheduled-date');
				scheduledEl.setText(`${TASK_DATE_ICONS.scheduled} ${this.formatDate(task.dates.scheduled)}`);
		}

		if (task.dates.completed) {
				const completedEl = metadataEl.createSpan('task-assignment-card-completed-date');
				completedEl.setText(`${TASK_DATE_ICONS.completed} ${this.formatDate(task.dates.completed)}`);
		}

		// Priority indicator
		if (task.priority !== TaskPriority.MEDIUM) {
			const priorityEl = metadataEl.createSpan('task-assignment-card-priority');
			priorityEl.setText(task.priority.toUpperCase());
		}

		// Tags
		if (task.tags.length > 0) {
			const tagsEl = metadataEl.createDiv('task-assignment-card-tags');
			for (const tag of task.tags) {
				const tagEl = tagsEl.createSpan('task-assignment-card-tag');
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

	private getTaskPriorityClass(priority: TaskPriority): string {
		switch (priority) {
			case TaskPriority.URGENT:
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
			case TaskPriority.URGENT:
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

	private async openAssignmentModalForTask(task: TaskData): Promise<void> {
		await this.openFileAtTask(task);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			this.plugin.openAssignmentModal(view.editor);
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