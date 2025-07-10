import { WorkspaceLeaf, setIcon, MarkdownRenderer, MarkdownView, TFile, Notice } from 'obsidian';
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
		// Use compact filters if the setting is enabled
		if (this.plugin.settings.useCompactFilters) {
			this.renderCompactFilters();
			return;
		}

		// Otherwise use the original expandable filters
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

	private renderCompactFilters(): void {
		this.filtersEl = this.viewContainerEl.createDiv('task-assignment-compact-filters');
		
		// Store original filters for cancel functionality
		this.originalFilters = { ...this.currentFilters };
		
		// Store reference to assignees display update function
		let updateAssigneesDisplay: (() => void) | null = null;
		
		// Store references to all dropdowns for closing them when clicking outside
		const allDropdowns: HTMLElement[] = [];

		// Function to add white dropdown arrow to multiselect displays
		const addWhiteArrow = (element: HTMLElement) => {
			const whiteArrowSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E`;
			element.style.backgroundImage = `url("${whiteArrowSvg}")`;
		};

		// Create horizontal filter row
		const filtersRow = this.filtersEl.createDiv('task-assignment-compact-filters-row');

		// Search input
		const searchGroup = filtersRow.createDiv('compact-filter-group');
		searchGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const searchIcon = searchGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(searchIcon, 'file-search-2');
		const searchInput = searchGroup.createEl('input', { 
			type: 'text', 
			placeholder: 'Search tasks...',
			cls: 'compact-filter-input'
		});
		searchInput.value = this.currentFilters.textSearch || '';
		searchInput.oninput = () => {
			this.updateFilters({ textSearch: searchInput.value });
		};

		// Assignees filter
		const assigneesGroup = filtersRow.createDiv('compact-filter-group');
		assigneesGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const assigneesIcon = assigneesGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(assigneesIcon, 'users');
		const assigneesInput = assigneesGroup.createEl('input', { 
			type: 'text', 
			placeholder: 'Select assignees',
			cls: 'compact-filter-input compact-filter-assignees'
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

		// Roles filter
		const rolesGroup = filtersRow.createDiv('compact-filter-group');
		rolesGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const rolesIcon = rolesGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(rolesIcon, 'axe');
		
		const rolesDropdownContainer = rolesGroup.createDiv('compact-multiselect-container');
		const rolesDisplay = rolesDropdownContainer.createEl('button', { cls: 'compact-multiselect-display' });
		addWhiteArrow(rolesDisplay);
		const rolesDropdown = rolesDropdownContainer.createDiv('compact-multiselect-dropdown');
		rolesDropdown.style.display = 'none';
		allDropdowns.push(rolesDropdown);
		
		const visibleRoles = this.plugin.getVisibleRoles();
		const totalRoles = visibleRoles.length + 1; // +1 for "None" option
		
		// Update roles display text
		const updateRolesDisplay = () => {
			const selectedRoles = this.currentFilters.roles || [];
			if (selectedRoles.length === 0) {
				rolesDisplay.setText('All Roles');
			} else if (selectedRoles.length === totalRoles) {
				rolesDisplay.setText('All Roles');
			} else {
				rolesDisplay.setText(`${selectedRoles.length} of ${totalRoles} Roles`);
			}
		};
		
		// Store original roles for cancel functionality
		let originalRoles = [...(this.currentFilters.roles || [])];
		let tempRoles = [...originalRoles];
		
		// Toggle dropdown
		rolesDisplay.onclick = (e) => {
			e.stopPropagation();
			const isVisible = rolesDropdown.style.display !== 'none';
			if (!isVisible) {
				// Store current state when opening
				originalRoles = [...(this.currentFilters.roles || [])];
				tempRoles = [...originalRoles];
			}
			rolesDropdown.style.display = isVisible ? 'none' : 'block';
		};
		
		const rolesOptionsContainer = rolesDropdown.createDiv('compact-multiselect-options');
		
		// Add "All Roles" option first
		const allRolesLabel = rolesOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const allRolesCheckbox = allRolesLabel.createEl('input', { type: 'checkbox' });
		allRolesCheckbox.checked = tempRoles.length === totalRoles;
		allRolesLabel.createSpan().setText('All Roles');
		
		// Add "None" option for roles
		const noneRoleLabel = rolesOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const noneRoleCheckbox = noneRoleLabel.createEl('input', { type: 'checkbox' });
		noneRoleCheckbox.checked = tempRoles.includes('none-set');
		noneRoleLabel.createSpan().setText('None');
		
		// Add visible roles
		const roleCheckboxes: { checkbox: HTMLInputElement; id: string }[] = [
			{ checkbox: noneRoleCheckbox, id: 'none-set' }
		];
		
		for (const role of visibleRoles) {
			const roleLabel = rolesOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
			const roleCheckbox = roleLabel.createEl('input', { type: 'checkbox' });
			roleCheckbox.checked = tempRoles.includes(role.id);
			roleLabel.createSpan().setText(`${role.icon} ${role.name}`);
			roleCheckboxes.push({ checkbox: roleCheckbox, id: role.id });
		}
		
		// Update all checkboxes state
		const updateRoleCheckboxes = () => {
			allRolesCheckbox.checked = tempRoles.length === totalRoles;
			roleCheckboxes.forEach(({ checkbox, id }) => {
				checkbox.checked = tempRoles.includes(id);
			});
		};
		
		// All Roles checkbox handler
		allRolesCheckbox.onchange = (e) => {
			e.stopPropagation();
			if (allRolesCheckbox.checked) {
				tempRoles = ['none-set', ...visibleRoles.map(r => r.id)];
			} else {
				tempRoles = [];
			}
			updateRoleCheckboxes();
		};
		
		// Individual role checkbox handlers
		roleCheckboxes.forEach(({ checkbox, id }) => {
			checkbox.onchange = (e) => {
				e.stopPropagation();
				if (checkbox.checked) {
					if (!tempRoles.includes(id)) {
						tempRoles.push(id);
					}
				} else {
					tempRoles = tempRoles.filter(r => r !== id);
				}
				updateRoleCheckboxes();
			};
		});
		
		// Action buttons
		const rolesActions = rolesDropdown.createDiv('compact-multiselect-actions');
		
		const resetRolesBtn = rolesActions.createEl('button', { cls: 'compact-multiselect-btn' });
		resetRolesBtn.setText('Reset');
		resetRolesBtn.onclick = (e) => {
			e.stopPropagation();
			tempRoles = [];
			updateRoleCheckboxes();
		};
		
		const cancelRolesBtn = rolesActions.createEl('button', { cls: 'compact-multiselect-btn' });
		cancelRolesBtn.setText('Cancel');
		cancelRolesBtn.onclick = (e) => {
			e.stopPropagation();
			tempRoles = [...originalRoles];
			rolesDropdown.style.display = 'none';
		};
		
		const okRolesBtn = rolesActions.createEl('button', { cls: 'compact-multiselect-btn compact-multiselect-ok' });
		okRolesBtn.setText('OK');
		okRolesBtn.onclick = (e) => {
			e.stopPropagation();
			this.updateFilters({ roles: tempRoles });
			updateRolesDisplay();
			// Don't close dropdown - allow multiple selections
		};
		
		updateRolesDisplay();

		// Status filter
		const statusGroup = filtersRow.createDiv('compact-filter-group');
		statusGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const statusIcon = statusGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(statusIcon, 'check-circle');
		
		const statusDropdownContainer = statusGroup.createDiv('compact-multiselect-container');
		const statusDisplay = statusDropdownContainer.createEl('button', { cls: 'compact-multiselect-display' });
		addWhiteArrow(statusDisplay);
		const statusDropdown = statusDropdownContainer.createDiv('compact-multiselect-dropdown');
		statusDropdown.style.display = 'none';
		allDropdowns.push(statusDropdown);
		
		const statuses = [
			{ value: TaskStatus.TODO, label: 'To Do' },
			{ value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
			{ value: TaskStatus.DONE, label: 'Done' },
			{ value: TaskStatus.CANCELLED, label: 'Cancelled' }
		];
		
		// Store original statuses for cancel functionality
		let originalStatuses: TaskStatus[] = [...(this.currentFilters.statuses || [])];
		let tempStatuses: TaskStatus[] = [...originalStatuses];
		
		// Update status display text
		const updateStatusDisplay = () => {
			const selectedStatuses = this.currentFilters.statuses || [];
			if (selectedStatuses.length === 0) {
				statusDisplay.setText('All Statuses');
			} else if (selectedStatuses.length === statuses.length) {
				statusDisplay.setText('All Statuses');
			} else {
				statusDisplay.setText(`${selectedStatuses.length} of ${statuses.length} Statuses`);
			}
		};
		
		// Toggle dropdown
		statusDisplay.onclick = (e) => {
			e.stopPropagation();
			const isVisible = statusDropdown.style.display !== 'none';
			if (!isVisible) {
				// Store current state when opening
				originalStatuses = [...(this.currentFilters.statuses || [])];
				tempStatuses = [...originalStatuses];
			}
			statusDropdown.style.display = isVisible ? 'none' : 'block';
		};
		
		const statusOptionsContainer = statusDropdown.createDiv('compact-multiselect-options');
		
		// Add "All Statuses" option first
		const allStatusLabel = statusOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const allStatusCheckbox = allStatusLabel.createEl('input', { type: 'checkbox' });
		allStatusCheckbox.checked = tempStatuses.length === statuses.length;
		allStatusLabel.createSpan().setText('All Statuses');
		
		// Add status options
		const statusCheckboxes: { checkbox: HTMLInputElement; value: TaskStatus }[] = [];
		
		for (const status of statuses) {
			const statusLabel = statusOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
			const statusCheckbox = statusLabel.createEl('input', { type: 'checkbox' });
			statusCheckbox.checked = tempStatuses.includes(status.value);
			statusLabel.createSpan().setText(status.label);
			statusCheckboxes.push({ checkbox: statusCheckbox, value: status.value });
		}
		
		// Update all checkboxes state
		const updateStatusCheckboxes = () => {
			allStatusCheckbox.checked = tempStatuses.length === statuses.length;
			statusCheckboxes.forEach(({ checkbox, value }) => {
				checkbox.checked = tempStatuses.includes(value);
			});
		};
		
		// All Status checkbox handler
		allStatusCheckbox.onchange = (e) => {
			e.stopPropagation();
			if (allStatusCheckbox.checked) {
				tempStatuses = [...statuses.map(s => s.value)];
			} else {
				tempStatuses = [];
			}
			updateStatusCheckboxes();
		};
		
		// Individual status checkbox handlers
		statusCheckboxes.forEach(({ checkbox, value }) => {
			checkbox.onchange = (e) => {
				e.stopPropagation();
				if (checkbox.checked) {
					if (!tempStatuses.includes(value)) {
						tempStatuses.push(value);
					}
				} else {
					tempStatuses = tempStatuses.filter(s => s !== value);
				}
				updateStatusCheckboxes();
			};
		});
		
		// Action buttons
		const statusActions = statusDropdown.createDiv('compact-multiselect-actions');
		
		const resetStatusBtn = statusActions.createEl('button', { cls: 'compact-multiselect-btn' });
		resetStatusBtn.setText('Reset');
		resetStatusBtn.onclick = (e) => {
			e.stopPropagation();
			tempStatuses = [];
			updateStatusCheckboxes();
		};
		
		const cancelStatusBtn = statusActions.createEl('button', { cls: 'compact-multiselect-btn' });
		cancelStatusBtn.setText('Cancel');
		cancelStatusBtn.onclick = (e) => {
			e.stopPropagation();
			tempStatuses = [...originalStatuses];
			statusDropdown.style.display = 'none';
		};
		
		const okStatusBtn = statusActions.createEl('button', { cls: 'compact-multiselect-btn compact-multiselect-ok' });
		okStatusBtn.setText('OK');
		okStatusBtn.onclick = (e) => {
			e.stopPropagation();
			this.updateFilters({ statuses: tempStatuses });
			updateStatusDisplay();
			// Don't close dropdown - allow multiple selections
		};
		
		updateStatusDisplay();

		// Priority filter
		const priorityGroup = filtersRow.createDiv('compact-filter-group');
		priorityGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const priorityIcon = priorityGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(priorityIcon, 'flag');
		
		const priorityDropdownContainer = priorityGroup.createDiv('compact-multiselect-container');
		const priorityDisplay = priorityDropdownContainer.createEl('button', { cls: 'compact-multiselect-display' });
		addWhiteArrow(priorityDisplay);
		const priorityDropdown = priorityDropdownContainer.createDiv('compact-multiselect-dropdown');
		priorityDropdown.style.display = 'none';
		allDropdowns.push(priorityDropdown);
		
		const priorities = [
			{ value: TaskPriority.URGENT, label: 'Urgent' },
			{ value: TaskPriority.HIGH, label: 'High' },
			{ value: TaskPriority.MEDIUM, label: 'Medium' },
			{ value: TaskPriority.LOW, label: 'Low' }
		];
		const totalPriorities = priorities.length + 1; // +1 for "None" option
		
		// Store original priorities for cancel functionality
		let originalPriorities: (TaskPriority | 'none-set')[] = [...(this.currentFilters.priorities || [])];
		let tempPriorities: (TaskPriority | 'none-set')[] = [...originalPriorities];
		
		// Update priority display text
		const updatePriorityDisplay = () => {
			const selectedPriorities = this.currentFilters.priorities || [];
			if (selectedPriorities.length === 0) {
				priorityDisplay.setText('All Priorities');
			} else if (selectedPriorities.length === totalPriorities) {
				priorityDisplay.setText('All Priorities');
			} else {
				priorityDisplay.setText(`${selectedPriorities.length} of ${totalPriorities} Priorities`);
			}
		};
		
		// Toggle dropdown
		priorityDisplay.onclick = (e) => {
			e.stopPropagation();
			const isVisible = priorityDropdown.style.display !== 'none';
			if (!isVisible) {
				// Store current state when opening
				originalPriorities = [...(this.currentFilters.priorities || [])];
				tempPriorities = [...originalPriorities];
			}
			priorityDropdown.style.display = isVisible ? 'none' : 'block';
		};
		
		const priorityOptionsContainer = priorityDropdown.createDiv('compact-multiselect-options');
		
		// Add "All Priorities" option first
		const allPrioritiesLabel = priorityOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const allPrioritiesCheckbox = allPrioritiesLabel.createEl('input', { type: 'checkbox' });
		allPrioritiesCheckbox.checked = tempPriorities.length === totalPriorities;
		allPrioritiesLabel.createSpan().setText('All Priorities');
		
		// Add "None" option for priority
		const nonePriorityLabel = priorityOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const nonePriorityCheckbox = nonePriorityLabel.createEl('input', { type: 'checkbox' });
		nonePriorityCheckbox.checked = tempPriorities.includes('none-set');
		nonePriorityLabel.createSpan().setText('None');
		
		// Add priority options
		const priorityCheckboxes: { checkbox: HTMLInputElement; value: TaskPriority | 'none-set' }[] = [
			{ checkbox: nonePriorityCheckbox, value: 'none-set' }
		];
		
		for (const priority of priorities) {
			const priorityLabel = priorityOptionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
			const priorityCheckbox = priorityLabel.createEl('input', { type: 'checkbox' });
			priorityCheckbox.checked = tempPriorities.includes(priority.value);
			priorityLabel.createSpan().setText(priority.label);
			priorityCheckboxes.push({ checkbox: priorityCheckbox, value: priority.value });
		}
		
		// Update all checkboxes state
		const updatePriorityCheckboxes = () => {
			allPrioritiesCheckbox.checked = tempPriorities.length === totalPriorities;
			priorityCheckboxes.forEach(({ checkbox, value }) => {
				checkbox.checked = tempPriorities.includes(value);
			});
		};
		
		// All Priorities checkbox handler
		allPrioritiesCheckbox.onchange = (e) => {
			e.stopPropagation();
			if (allPrioritiesCheckbox.checked) {
				tempPriorities = ['none-set' as const, ...priorities.map(p => p.value)];
			} else {
				tempPriorities = [];
			}
			updatePriorityCheckboxes();
		};
		
		// Individual priority checkbox handlers
		priorityCheckboxes.forEach(({ checkbox, value }) => {
			checkbox.onchange = (e) => {
				e.stopPropagation();
				if (checkbox.checked) {
					if (!tempPriorities.includes(value)) {
						tempPriorities.push(value);
					}
				} else {
					tempPriorities = tempPriorities.filter(p => p !== value);
				}
				updatePriorityCheckboxes();
			};
		});
		
		// Action buttons
		const priorityActions = priorityDropdown.createDiv('compact-multiselect-actions');
		
		const resetPriorityBtn = priorityActions.createEl('button', { cls: 'compact-multiselect-btn' });
		resetPriorityBtn.setText('Reset');
		resetPriorityBtn.onclick = (e) => {
			e.stopPropagation();
			tempPriorities = [];
			updatePriorityCheckboxes();
		};
		
		const cancelPriorityBtn = priorityActions.createEl('button', { cls: 'compact-multiselect-btn' });
		cancelPriorityBtn.setText('Cancel');
		cancelPriorityBtn.onclick = (e) => {
			e.stopPropagation();
			tempPriorities = [...originalPriorities];
			priorityDropdown.style.display = 'none';
		};
		
		const okPriorityBtn = priorityActions.createEl('button', { cls: 'compact-multiselect-btn compact-multiselect-ok' });
		okPriorityBtn.setText('OK');
		okPriorityBtn.onclick = (e) => {
			e.stopPropagation();
			this.updateFilters({ priorities: tempPriorities });
			updatePriorityDisplay();
			// Don't close dropdown - allow multiple selections
		};
		
		updatePriorityDisplay();

		// Date filter group
		const dateGroup = filtersRow.createDiv('compact-filter-group');
		dateGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const dateIcon = dateGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(dateIcon, 'calendar');
		
		const dateContainer = dateGroup.createDiv('compact-date-container');
		
		// Date type select
		const dateTypeSelect = dateContainer.createEl('select', { cls: 'compact-filter-select compact-date-type' });
		addWhiteArrow(dateTypeSelect);
		const dateTypes = [
			{ value: DateType.DUE, label: 'Due' },
			{ value: DateType.CREATED, label: 'Created' },
			{ value: DateType.COMPLETED, label: 'Completed' },
			{ value: DateType.SCHEDULED, label: 'Scheduled' }
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

		// Date range inputs
		const fromInput = dateContainer.createEl('input', { 
			type: 'date', 
			cls: 'compact-filter-date',
			title: 'From date'
		});
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

		const toInput = dateContainer.createEl('input', { 
			type: 'date', 
			cls: 'compact-filter-date',
			title: 'To date'
		});
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

		// Include not set checkbox
		const includeNotSetLabel = dateContainer.createEl('label', { cls: 'compact-date-checkbox' });
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
		const noDatesIcon = includeNotSetLabel.createEl('span');
		setIcon(noDatesIcon, 'calendar-x');
		// Show tooltip on hover
		includeNotSetLabel.title = 'Include tasks without dates';

		// Filter actions
		const actionsGroup = filtersRow.createDiv('compact-filter-actions');
		
		// Clear filters button
		const clearFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-clear' });
		const clearFiltersIcon = clearFiltersBtn.createEl('span');
		setIcon(clearFiltersIcon, 'rotate-ccw');
		clearFiltersBtn.title = 'Clear filters';
		clearFiltersBtn.onclick = () => {
			this.currentFilters = {};
			this.render();
		};
		
		// Cancel button
		const cancelFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-cancel' });
		const cancelFiltersIcon = cancelFiltersBtn.createEl('span');
		setIcon(cancelFiltersIcon, 'x-circle');
		cancelFiltersBtn.title = 'Cancel';
		cancelFiltersBtn.style.display = this.plugin.settings.autoApplyFilters ? 'none' : 'block';
		cancelFiltersBtn.onclick = () => {
			this.cancelFiltersAndClose();
		};

		// Apply Filters button
		const applyFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-apply' });
		const applyFiltersIcon = applyFiltersBtn.createEl('span');
		setIcon(applyFiltersIcon, 'play-circle');
		applyFiltersBtn.title = 'Apply';
		applyFiltersBtn.style.display = this.plugin.settings.autoApplyFilters ? 'none' : 'block';
		applyFiltersBtn.onclick = () => {
			this.applyFiltersAndClose();
		};
		
		// Auto Apply toggle
		const autoApplyLabel = actionsGroup.createEl('label', { cls: 'compact-filter-btn compact-auto-apply' });
		const autoApplyCheckbox = autoApplyLabel.createEl('input', { type: 'checkbox' });
		autoApplyCheckbox.checked = this.plugin.settings.autoApplyFilters;
		autoApplyCheckbox.onchange = async () => {
			this.plugin.settings.autoApplyFilters = autoApplyCheckbox.checked;
			await this.plugin.saveSettings();
			
			// Show/hide buttons based on Auto Apply setting
			const shouldHide = autoApplyCheckbox.checked;
			applyFiltersBtn.style.display = shouldHide ? 'none' : 'block';
			cancelFiltersBtn.style.display = shouldHide ? 'none' : 'block';
			
			// If Auto Apply is enabled, apply filters immediately
			if (autoApplyCheckbox.checked) {
				this.applyFiltersAndClose();
			}
		};
		const autoApplyIcon = autoApplyLabel.createEl('span');
		setIcon(autoApplyIcon, 'fast-forward');
		autoApplyLabel.title = 'Auto apply';
		
		// Close dropdowns when clicking outside
		const closeAllDropdowns = () => {
			allDropdowns.forEach(dropdown => {
				dropdown.style.display = 'none';
			});
		};
		
		// Add global click handler to close dropdowns when clicking outside
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			
			// Check if click is inside any dropdown container
			let isInsideDropdown = false;
			for (const dropdown of allDropdowns) {
				const container = dropdown.closest('.compact-multiselect-container');
				if (container && container.contains(target)) {
					isInsideDropdown = true;
					break;
				}
			}
			
			// If click is outside all dropdowns, close them
			if (!isInsideDropdown) {
				closeAllDropdowns();
			}
		};
		
		// Add global click handler
		document.addEventListener('click', handleOutsideClick);
		
		// Store cleanup function for when view is destroyed
		this.register(() => {
			document.removeEventListener('click', handleOutsideClick);
		});
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
		
		// Top row with checkbox and action icons
		const topRowEl = cardEl.createDiv('task-assignment-card-top-row');
		
		// Task checkbox
		const checkboxEl = topRowEl.createEl('input', { type: 'checkbox' });
		checkboxEl.checked = task.status === TaskStatus.DONE;
		checkboxEl.onchange = async () => {
			const newStatus = checkboxEl.checked ? TaskStatus.DONE : TaskStatus.TODO;
			await this.taskCacheService.updateTaskStatus(task.id, newStatus);
			this.render();
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
