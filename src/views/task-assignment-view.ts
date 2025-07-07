import { WorkspaceLeaf, setIcon, MarkdownRenderer } from 'obsidian';
import { TaskAssignmentViewBase } from './task-assignment-view-base';
import { TaskData, ViewLayout, TaskStatus, TaskPriority, DateType, ViewFilters, TASK_DATE_ICONS } from '../types';
import { TaskCacheService } from '../services/task-cache.service';
import { ViewConfigurationService } from '../services/view-configuration.service';
import { SaveViewModal } from '../modals/save-view-modal';
import type TaskAssignmentPlugin from '../main';

export class TaskAssignmentView extends TaskAssignmentViewBase {
	private viewContainerEl: HTMLElement;
	private filtersEl: HTMLElement;
	private viewContentEl: HTMLElement;
	private sidePanel: HTMLElement | null = null;
	private selectedTask: TaskData | null = null;
	private viewConfigService: ViewConfigurationService;
	private currentViewName: string | null = null;
	private originalFilters: ViewFilters = {};

	constructor(leaf: WorkspaceLeaf, plugin: TaskAssignmentPlugin, taskCacheService: TaskCacheService) {
		super(leaf, plugin, taskCacheService);
		this.viewConfigService = new ViewConfigurationService(this.app, this.plugin);
	}

	protected render(): void {
		this.viewContainerEl = this.contentEl;
		this.viewContainerEl.empty();
		this.viewContainerEl.addClass('task-assignment-view');

		this.renderHeader();
		this.renderFilters();
		this.renderContent();
	}

	private renderHeader(): void {
		const headerEl = this.viewContainerEl.createDiv('task-assignment-header');
		
		// Title
		const titleEl = headerEl.createDiv('task-assignment-title');
		const iconEl = titleEl.createSpan('task-assignment-icon');
		setIcon(iconEl, 'users');
		titleEl.createSpan('task-assignment-title-text').setText('Task Center');
		
		// Current view name display
		if (this.currentViewName) {
			const viewNameEl = titleEl.createDiv('task-assignment-current-view');
			viewNameEl.createSpan('task-assignment-current-view-label').setText('Loaded Config:');
			viewNameEl.createSpan('task-assignment-current-view-name').setText(this.currentViewName);
		}

		// Controls
		const controlsEl = headerEl.createDiv('task-assignment-controls');
		
		// Layout selector with label
		const layoutContainer = controlsEl.createDiv('task-assignment-layout-container');
		layoutContainer.createSpan('task-assignment-layout-label').setText('Show:');
		
		const layoutSelect = layoutContainer.createEl('select', { cls: 'task-assignment-layout-select' });
		const layouts = [
			{ value: ViewLayout.STATUS, label: 'Status View' },
			{ value: ViewLayout.ROLE, label: 'Role View' },
			{ value: ViewLayout.ASSIGNEES, label: 'Assignees View' },
			{ value: ViewLayout.DATE, label: 'Date View' }
		];
		
		for (const layout of layouts) {
			const option = layoutSelect.createEl('option', { value: layout.value });
			option.setText(layout.label);
			if (layout.value === this.currentLayout) {
				option.selected = true;
			}
		}
		
		layoutSelect.onchange = () => {
			this.updateLayout(layoutSelect.value as ViewLayout);
		};

		// Add dropdown arrow icon
		const layoutArrow = layoutContainer.createSpan('task-assignment-dropdown-arrow');
		setIcon(layoutArrow, 'chevron-down');

		// Save view button
		const saveViewBtn = controlsEl.createEl('button', { cls: 'task-assignment-save-view-btn' });
		saveViewBtn.setText('Save Config');
		saveViewBtn.onclick = () => this.showSaveViewDialog();

		// Saved views dropdown
		const savedViews = this.viewConfigService.getAllViewConfigurations();
		if (savedViews.length > 0) {
			const savedViewsContainer = controlsEl.createDiv('task-assignment-layout-container');
			const savedViewsSelect = savedViewsContainer.createEl('select', { cls: 'task-assignment-saved-views-select' });
			const defaultOption = savedViewsSelect.createEl('option', { value: '' });
			defaultOption.setText('Load Config...');
			
			for (const view of savedViews) {
				const option = savedViewsSelect.createEl('option', { value: view.id });
				option.setText(view.name);
			}
			
			savedViewsSelect.onchange = () => {
				if (savedViewsSelect.value) {
					this.loadSavedView(savedViewsSelect.value);
					savedViewsSelect.value = ''; // Reset selection
				}
			};

			// Add dropdown arrow icon
			const savedViewsArrow = savedViewsContainer.createSpan('task-assignment-dropdown-arrow');
			setIcon(savedViewsArrow, 'chevron-down');
		}

		// Divider before refresh button
		controlsEl.createDiv('task-assignment-controls-divider');
		
		// Refresh button (moved to last position)
		const refreshBtn = controlsEl.createEl('button', { cls: 'task-assignment-refresh-btn' });
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.setAttribute('aria-label', 'Rebuild cache');
		refreshBtn.setAttribute('title', 'Rebuild cache');
		refreshBtn.onclick = () => this.taskCacheService.refreshCache();
	}

	private renderFilters(): void {
		this.filtersEl = this.viewContainerEl.createDiv('task-assignment-filters');
		
		// Filter toggle
		const filterToggle = this.filtersEl.createEl('button', { cls: 'task-assignment-filter-toggle' });
		setIcon(filterToggle, 'filter');
		filterToggle.setText('Filters');
		
		// Add arrow icon
		const arrowIcon = filterToggle.createSpan('task-assignment-filter-arrow');
		setIcon(arrowIcon, 'chevron-down');
		
		const filtersContent = this.filtersEl.createDiv('task-assignment-filters-content');
		filtersContent.style.display = 'none';
		
		filterToggle.onclick = () => {
			const isVisible = filtersContent.style.display !== 'none';
			filtersContent.style.display = isVisible ? 'none' : 'block';
			filterToggle.toggleClass('active', !isVisible);
			
			// Store original filters when opening the section
			if (!isVisible) {
				this.originalFilters = { ...this.currentFilters };
			}
			
			// Update arrow direction
			arrowIcon.empty();
			setIcon(arrowIcon, isVisible ? 'chevron-down' : 'chevron-up');
		};

		this.renderFilterControls(filtersContent);
	}

	private renderFilterControls(container: HTMLElement): void {
		const filterGrid = container.createDiv('task-assignment-filter-grid');
		
		// Store reference to assignees display update function
		let updateAssigneesDisplay: (() => void) | null = null;

        // Assignees filter
		const assigneesGroup = filterGrid.createDiv('filter-group');
		assigneesGroup.createEl('label', { text: 'Assignees' });
		const assigneesInput = assigneesGroup.createEl('input', { 
			type: 'text', 
			placeholder: 'Select assignees',
			cls: 'task-assignment-assignees-input'
		});
		assigneesInput.readOnly = true;
		
		// Display selected assignees
		updateAssigneesDisplay = () => {
			const selectedAssignees = [
				...(this.currentFilters.people || []),
				...(this.currentFilters.companies || [])
			];
			assigneesInput.value = selectedAssignees.length > 0 
				? selectedAssignees.join(', ') 
				: '';
		};
		
		updateAssigneesDisplay();
		
		assigneesInput.onclick = () => {
			this.showAssigneeSelector(updateAssigneesDisplay);
		};

		// Text search
		const searchGroup = filterGrid.createDiv('filter-group');
		searchGroup.createEl('label', { text: 'Search' });
		const searchInput = searchGroup.createEl('input', { type: 'text', placeholder: 'Search tasks...' });
		searchInput.value = this.currentFilters.textSearch || '';
		searchInput.oninput = () => {
			this.updateFilters({ textSearch: searchInput.value });
		};

        // Role filter
		const roleGroup = filterGrid.createDiv('filter-group');
		roleGroup.createEl('label', { text: 'Roles' });
		const roleContainer = roleGroup.createDiv('filter-checkboxes');
		
		// Add "None" option for roles
		const noneSetRoleLabel = roleContainer.createEl('label');
		const noneSetRoleCheckbox = noneSetRoleLabel.createEl('input', { type: 'checkbox' });
		noneSetRoleCheckbox.checked = this.currentFilters.roles?.includes('none-set') || false;
		noneSetRoleCheckbox.onchange = () => {
			const currentRoles = this.currentFilters.roles || [];
			const newRoles = noneSetRoleCheckbox.checked
				? [...currentRoles, 'none-set']
				: currentRoles.filter(r => r !== 'none-set');
			this.updateFilters({ roles: newRoles });
		};
		noneSetRoleLabel.createSpan().setText('None');
		
		const visibleRoles = this.plugin.getVisibleRoles();
		for (const role of visibleRoles) {
			const label = roleContainer.createEl('label');
			const checkbox = label.createEl('input', { type: 'checkbox' });
			checkbox.checked = this.currentFilters.roles?.includes(role.id) || false;
			checkbox.onchange = () => {
				const currentRoles = this.currentFilters.roles || [];
				const newRoles = checkbox.checked
					? [...currentRoles, role.id]
					: currentRoles.filter(r => r !== role.id);
				this.updateFilters({ roles: newRoles });
			};
			label.createSpan().setText(`${role.icon} ${role.name}`);
		}

		// Status filter
		const statusGroup = filterGrid.createDiv('filter-group');
		statusGroup.createEl('label', { text: 'Status' });
		const statusContainer = statusGroup.createDiv('filter-checkboxes');
		
		const statuses = [
			{ value: TaskStatus.TODO, label: 'To Do' },
			{ value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
			{ value: TaskStatus.DONE, label: 'Done' },
			{ value: TaskStatus.CANCELLED, label: 'Cancelled' }
		];
		
		for (const status of statuses) {
			const label = statusContainer.createEl('label');
			const checkbox = label.createEl('input', { type: 'checkbox' });
			checkbox.checked = this.currentFilters.statuses?.includes(status.value) || false;
			checkbox.onchange = () => {
				const currentStatuses = this.currentFilters.statuses || [];
				const newStatuses = checkbox.checked
					? [...currentStatuses, status.value]
					: currentStatuses.filter(s => s !== status.value);
				this.updateFilters({ statuses: newStatuses });
			};
			label.createSpan().setText(status.label);
		}

		// Priority filter
		const priorityGroup = filterGrid.createDiv('filter-group');
		priorityGroup.createEl('label', { text: 'Priority' });
		const priorityContainer = priorityGroup.createDiv('filter-checkboxes');
		
		// Add "None" option for priority (tasks with default MEDIUM priority but no explicit priority indicators)
		const noneSetPriorityLabel = priorityContainer.createEl('label');
		const noneSetPriorityCheckbox = noneSetPriorityLabel.createEl('input', { type: 'checkbox' });
		noneSetPriorityCheckbox.checked = this.currentFilters.priorities?.includes('none-set') || false;
		noneSetPriorityCheckbox.onchange = () => {
			const currentPriorities = this.currentFilters.priorities || [];
			const newPriorities = noneSetPriorityCheckbox.checked
				? [...currentPriorities, 'none-set' as const]
				: currentPriorities.filter(p => p !== 'none-set');
			this.updateFilters({ priorities: newPriorities });
		};
		noneSetPriorityLabel.createSpan().setText('None');
		
		const priorities = [
			{ value: TaskPriority.URGENT, label: 'Urgent' },
			{ value: TaskPriority.HIGH, label: 'High' },
			{ value: TaskPriority.MEDIUM, label: 'Medium' },
			{ value: TaskPriority.LOW, label: 'Low' }
		];
		
		for (const priority of priorities) {
			const label = priorityContainer.createEl('label');
			const checkbox = label.createEl('input', { type: 'checkbox' });
			checkbox.checked = this.currentFilters.priorities?.includes(priority.value) || false;
			checkbox.onchange = () => {
				const currentPriorities = this.currentFilters.priorities || [];
				const newPriorities = checkbox.checked
					? [...currentPriorities, priority.value]
					: currentPriorities.filter(p => p !== priority.value);
				this.updateFilters({ priorities: newPriorities });
			};
			label.createSpan().setText(priority.label);
		}

		// Date filter
		const dateGroup = filterGrid.createDiv('filter-group');
		dateGroup.createEl('label', { text: 'Date Filter' });
		
		const dateTypeContainer = dateGroup.createDiv('task-assignment-layout-container');
		const dateTypeSelect = dateTypeContainer.createEl('select', { cls: 'task-assignment-date-type-select' });
		const dateTypes = [
			{ value: DateType.DUE, label: 'Due Date' },
			{ value: DateType.CREATED, label: 'Created Date' },
			{ value: DateType.COMPLETED, label: 'Completed Date' },
			{ value: DateType.SCHEDULED, label: 'Scheduled Date' }
		];
		
		for (const dateType of dateTypes) {
			const option = dateTypeSelect.createEl('option', { value: dateType.value });
			option.setText(dateType.label);
			if (dateType.value === this.currentFilters.dateType) {
				option.selected = true;
			}
		}
		
		dateTypeSelect.onchange = () => {
			this.updateFilters({ dateType: dateTypeSelect.value as DateType });
		};

		// Add dropdown arrow icon
		const dateTypeArrow = dateTypeContainer.createSpan('task-assignment-dropdown-arrow');
		setIcon(dateTypeArrow, 'chevron-down');

		const dateRangeContainer = dateGroup.createDiv('date-range-container');
		
		// Create inline date range with dash separator
		const dateRangeRow = dateRangeContainer.createDiv('date-range-row');
		
		const fromInput = dateRangeRow.createEl('input', { type: 'date', cls: 'date-range-input' });
		fromInput.value = this.currentFilters.dateRange?.from?.toISOString().split('T')[0] || '';
		fromInput.onchange = () => {
			const from = fromInput.value ? new Date(fromInput.value) : undefined;
			this.updateFilters({ 
				dateRange: { 
					...this.currentFilters.dateRange, 
					from 
				} 
			});
		};

		const dashSeparator = dateRangeRow.createSpan('date-range-separator');
		dashSeparator.setText('—');

		const toInput = dateRangeRow.createEl('input', { type: 'date', cls: 'date-range-input' });
		toInput.value = this.currentFilters.dateRange?.to?.toISOString().split('T')[0] || '';
		toInput.onchange = () => {
			const to = toInput.value ? new Date(toInput.value) : undefined;
			this.updateFilters({ 
				dateRange: { 
					...this.currentFilters.dateRange, 
					to 
				} 
			});
		};

		const includeNotSetLabel = dateRangeContainer.createEl('label');
		const includeNotSetCheckbox = includeNotSetLabel.createEl('input', { type: 'checkbox' });
		includeNotSetCheckbox.checked = this.currentFilters.dateRange?.includeNotSet || false;
		includeNotSetCheckbox.onchange = () => {
			this.updateFilters({ 
				dateRange: { 
					...this.currentFilters.dateRange, 
					includeNotSet: includeNotSetCheckbox.checked 
				} 
			});
		};
		includeNotSetLabel.createSpan().setText('Include tasks without dates');

		// Filter actions container
		const filterActionsEl = filterGrid.createDiv('task-assignment-filter-actions');
		
		// Clear filters button (first in order)
		const clearFiltersBtn = filterActionsEl.createEl('button', { cls: 'task-assignment-clear-filters-btn' });
		clearFiltersBtn.setText('Clear Filters');
		clearFiltersBtn.onclick = () => {
			this.currentFilters = {};
			this.render();
		};
		
		// Cancel button (second in order)
		const cancelFiltersBtn = filterActionsEl.createEl('button', { cls: 'task-assignment-cancel-filters-btn' });
		cancelFiltersBtn.setText('Cancel');
		cancelFiltersBtn.disabled = this.plugin.settings.autoApplyFilters;
		cancelFiltersBtn.onclick = () => {
			this.cancelFiltersAndClose();
		};
		
		// Apply Filters button (third in order)
		const applyFiltersBtn = filterActionsEl.createEl('button', { cls: 'task-assignment-apply-filters-btn' });
		applyFiltersBtn.setText('Apply Filters');
		applyFiltersBtn.disabled = this.plugin.settings.autoApplyFilters;
		applyFiltersBtn.onclick = () => {
			this.applyFiltersAndClose();
		};
		
		// Auto Apply container (fourth/last in order)
		const autoApplyContainer = filterActionsEl.createDiv('task-assignment-auto-apply-container');
		const autoApplyCheckbox = autoApplyContainer.createEl('input', { 
			type: 'checkbox', 
			cls: 'task-assignment-auto-apply-checkbox' 
		});
		autoApplyCheckbox.checked = this.plugin.settings.autoApplyFilters;
		
		const autoApplyLabel = autoApplyContainer.createEl('label', { cls: 'task-assignment-auto-apply-label' });
		autoApplyLabel.setText('Auto Apply');
		autoApplyLabel.onclick = () => {
			autoApplyCheckbox.click();
		};
		
		autoApplyCheckbox.onchange = async () => {
			this.plugin.settings.autoApplyFilters = autoApplyCheckbox.checked;
			await this.plugin.saveSettings();
			applyFiltersBtn.disabled = autoApplyCheckbox.checked;
			cancelFiltersBtn.disabled = autoApplyCheckbox.checked;
			
			// If Auto Apply is enabled, apply filters immediately
			if (autoApplyCheckbox.checked) {
				this.applyFiltersAndClose();
			}
		};
	}

	// Override updateFilters to respect Auto Apply setting
	protected updateFilters(newFilters: Partial<ViewFilters>): void {
		this.currentFilters = { ...this.currentFilters, ...newFilters };
		
		// Only auto-render if Auto Apply is enabled
		if (this.plugin.settings.autoApplyFilters) {
			this.applyFiltersAndClose();
		}
	}

	private applyFiltersAndClose(): void {
		// Force re-render with current filters
		this.render();
		
		// Close the filters section
		this.closeFiltersSection();
	}

	private cancelFiltersAndClose(): void {
		// Revert to original filters
		this.currentFilters = { ...this.originalFilters };
		
		// Re-render with original filters
		this.render();
		
		// Close the filters section
		this.closeFiltersSection();
	}

	private closeFiltersSection(): void {
		const filterToggle = this.filtersEl.querySelector('.task-assignment-filter-toggle') as HTMLElement;
		const filtersContent = this.filtersEl.querySelector('.task-assignment-filters-content') as HTMLElement;
		const arrowIcon = this.filtersEl.querySelector('.task-assignment-filter-arrow') as HTMLElement;
		
		if (filterToggle && filtersContent && arrowIcon) {
			filtersContent.style.display = 'none';
			filterToggle.classList.remove('active');
			
			// Update arrow direction
			arrowIcon.empty();
			setIcon(arrowIcon, 'chevron-down');
		}
	}

	private renderContent(): void {
		this.viewContentEl = this.viewContainerEl.createDiv('task-assignment-content');
		
		// Get filtered and organized tasks
		const allTasks = this.taskCacheService.getAllTasks();
		const filteredTasks = this.applyFilters(allTasks);
		const columns = this.organizeTasksByLayout(filteredTasks);

		// Render columns
		const columnsContainer = this.viewContentEl.createDiv('task-assignment-columns');
		
		for (const column of columns) {
			this.renderColumn(columnsContainer, column);
		}

		// Render side panel if task is selected
		if (this.selectedTask) {
			this.renderSidePanel();
		}
	}

	private renderColumn(container: HTMLElement, column: any): void {
		const columnEl = container.createDiv('task-assignment-column');
		
		// Column header
		const headerEl = columnEl.createDiv('task-assignment-column-header');
		headerEl.createSpan('task-assignment-column-title').setText(column.title);
		headerEl.createSpan('task-assignment-column-count').setText(`(${column.tasks.length})`);

		// Column content
		const contentEl = columnEl.createDiv('task-assignment-column-content');
		
		for (const task of column.tasks) {
			this.renderTaskCard(contentEl, task);
		}
	}

	private renderTaskCard(container: HTMLElement, task: TaskData): void {
		const cardEl = container.createDiv('task-assignment-card');
		cardEl.addClass(this.getTaskStatusClass(task.status));
		cardEl.addClass(this.getTaskPriorityClass(task.priority));
		
		// Task checkbox
		const checkboxEl = cardEl.createEl('input', { type: 'checkbox' });
		checkboxEl.checked = task.status === TaskStatus.DONE;
		checkboxEl.onchange = async () => {
			const newStatus = checkboxEl.checked ? TaskStatus.DONE : TaskStatus.TODO;
			await this.taskCacheService.updateTaskStatus(task.id, newStatus);
			this.render();
		};

		// Task content
		const contentEl = cardEl.createDiv('task-assignment-card-content');
		
		// Task description
		const descriptionEl = contentEl.createDiv('task-assignment-card-description');
		MarkdownRenderer.renderMarkdown(
				task.description,
				descriptionEl,
				task.filePath,
				this
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

		// Click handler to show side panel
		cardEl.onclick = (e) => {
			if (e.target !== checkboxEl) {
				this.selectedTask = task;
				this.renderSidePanel();
			}
		};
	}

	private renderSidePanel(): void {
		if (!this.selectedTask) return;

		// Remove existing side panel
		if (this.sidePanel) {
			this.sidePanel.remove();
		}

		// Create side panel
		this.sidePanel = this.viewContainerEl.createDiv('task-assignment-side-panel');
		
		// Header
		const headerEl = this.sidePanel.createDiv('task-assignment-side-panel-header');
		headerEl.createSpan('task-assignment-side-panel-title').setText('Task Details');
		
		const closeBtn = headerEl.createEl('button', { cls: 'task-assignment-side-panel-close' });
		setIcon(closeBtn, 'x');
		closeBtn.onclick = () => {
			this.selectedTask = null;
			if (this.sidePanel) {
				this.sidePanel.remove();
				this.sidePanel = null;
			}
		};

		// Content
		const contentEl = this.sidePanel.createDiv('task-assignment-side-panel-content');
		
		// Task description
        const descriptionEl = contentEl.createDiv('task-detail-section');
        descriptionEl.createEl('h3', { text: 'Description' });
        const descriptionValue = descriptionEl.createDiv('task-detail-value');
        MarkdownRenderer.renderMarkdown(
			this.selectedTask.description,
			descriptionValue,
			this.selectedTask.filePath,
			this
		);

		// File location
		const locationEl = contentEl.createDiv('task-detail-section');
		locationEl.createEl('h3', { text: 'Location' });
		const locationValue = locationEl.createDiv('task-detail-value');
		locationValue.setText(`${this.selectedTask.filePath}:${this.selectedTask.lineNumber + 1}`);

		// Status
		const statusEl = contentEl.createDiv('task-detail-section');
		statusEl.createEl('h3', { text: 'Status' });
		statusEl.createDiv('task-detail-value').setText(this.selectedTask.status.replace('-', ' ').toUpperCase());

		// Priority
		const priorityEl = contentEl.createDiv('task-detail-section');
		priorityEl.createEl('h3', { text: 'Priority' });
		priorityEl.createDiv('task-detail-value').setText(this.selectedTask.priority.toUpperCase());

		// Tags
		if (this.selectedTask.tags.length > 0) {
			const tagsEl = contentEl.createDiv('task-detail-section');
			tagsEl.createEl('h3', { text: 'Tags' });
			const tagsValue = tagsEl.createDiv('task-detail-value');
			tagsValue.setText(this.selectedTask.tags.map(tag => `#${tag}`).join(', '));
		}

		// Assignments
		if (this.selectedTask.assignments.length > 0) {
			const assignmentsEl = contentEl.createDiv('task-detail-section');
			assignmentsEl.createEl('h3', { text: 'Assignments' });
			const assignmentsValue = assignmentsEl.createDiv('task-detail-value');
			
			for (const assignment of this.selectedTask.assignments) {
				const assignmentEl = assignmentsValue.createDiv('task-assignment-detail');
				assignmentEl.createSpan('task-assignment-role').setText(`${assignment.role.icon} ${assignment.role.name}:`);
				assignmentEl.createSpan('task-assignment-assignees').setText(assignment.assignees.join(', '));
			}
		}

		// Dates
		const datesEl = contentEl.createDiv('task-detail-section');
		datesEl.createEl('h3', { text: 'Dates' });
		const datesValue = datesEl.createDiv('task-detail-value');
		
		if (this.selectedTask.dates.due) {
			const dueDateEl = datesValue.createDiv('task-date-detail');
			dueDateEl.createSpan('task-date-label').setText('Due:');
			dueDateEl.createSpan('task-date-value').setText(this.formatDate(this.selectedTask.dates.due));
		}
		
		if (this.selectedTask.dates.scheduled) {
			const scheduledDateEl = datesValue.createDiv('task-date-detail');
			scheduledDateEl.createSpan('task-date-label').setText('Scheduled:');
			scheduledDateEl.createSpan('task-date-value').setText(this.formatDate(this.selectedTask.dates.scheduled));
		}
		
		if (this.selectedTask.dates.completed) {
			const completedDateEl = datesValue.createDiv('task-date-detail');
			completedDateEl.createSpan('task-date-label').setText('Completed:');
			completedDateEl.createSpan('task-date-value').setText(this.formatDate(this.selectedTask.dates.completed));
		}

		const createdDateEl = datesValue.createDiv('task-date-detail');
		createdDateEl.createSpan('task-date-label').setText('Created:');
		createdDateEl.createSpan('task-date-value').setText(this.formatDate(this.selectedTask.createdDate));

		const modifiedDateEl = datesValue.createDiv('task-date-detail');
		modifiedDateEl.createSpan('task-date-label').setText('Modified:');
		modifiedDateEl.createSpan('task-date-value').setText(this.formatDate(this.selectedTask.modifiedDate));
	}

	private showSaveViewDialog(): void {
		new SaveViewModal(
			this.app,
			this.viewConfigService,
			this.currentLayout,
			this.currentFilters,
			this.currentSort,
			() => this.render() // Refresh to show new saved view in dropdown
		).open();
	}

	private loadSavedView(viewId: string): void {
		const config = this.viewConfigService.getViewConfiguration(viewId);
		if (config) {
			this.currentLayout = config.layout;
			this.currentFilters = config.filters;
			this.currentSort = config.sortBy;
			this.currentViewName = config.name;
			this.render();
		}
	}

	private showAssigneeSelector(updateCallback?: (() => void) | null): void {
		import('../modals/assignee-selector-modal').then(({ AssigneeSelectorModal }) => {
			new AssigneeSelectorModal(this.app, this.plugin, (selectedAssignee: string) => {
				// Determine if it's a person or company based on the symbol
				const isPerson = selectedAssignee.startsWith(this.plugin.settings.contactSymbol);
				const isCompany = selectedAssignee.startsWith(this.plugin.settings.companySymbol);
				
				if (isPerson) {
					const currentPeople = this.currentFilters.people || [];
					const newPeople = currentPeople.includes(selectedAssignee)
						? currentPeople.filter(p => p !== selectedAssignee)
						: [...currentPeople, selectedAssignee];
					this.updateFilters({ people: newPeople });
				} else if (isCompany) {
					const currentCompanies = this.currentFilters.companies || [];
					const newCompanies = currentCompanies.includes(selectedAssignee)
						? currentCompanies.filter(c => c !== selectedAssignee)
						: [...currentCompanies, selectedAssignee];
					this.updateFilters({ companies: newCompanies });
				}
				
				// Update the display
				if (updateCallback) {
					updateCallback();
				}
			}, { mode: 'readonly', keepOpen: true }).open();
		});
	}
} 
