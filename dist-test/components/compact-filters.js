import { setIcon } from 'obsidian';
import { TaskStatus, TaskPriority, DateType } from '../types';
export class CompactFiltersComponent {
    constructor(plugin, currentFilters, updateFiltersCallback, registerCallback) {
        this.plugin = plugin;
        this.currentFilters = currentFilters;
        this.updateFiltersCallback = updateFiltersCallback;
        this.registerCallback = registerCallback;
    }
    async render(container) {
        const filtersEl = container.createDiv('task-assignment-compact-filters');
        // Store references to all dropdowns for closing them when clicking outside
        const allDropdowns = [];
        // Function to add white dropdown arrow to multiselect displays
        const addWhiteArrow = (element) => {
            const whiteArrowSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E`;
            element.style.backgroundImage = `url("${whiteArrowSvg}")`;
        };
        // Create horizontal filter row
        const filtersRow = filtersEl.createDiv('task-assignment-compact-filters-row');
        // Search input
        this.renderSearchInput(filtersRow);
        // Assignees filter
        this.renderAssigneesFilter(filtersRow);
        // Roles filter
        this.renderRolesFilter(filtersRow, addWhiteArrow, allDropdowns);
        // Status filter
        this.renderStatusFilter(filtersRow, addWhiteArrow, allDropdowns);
        // Priority filter
        this.renderPriorityFilter(filtersRow, addWhiteArrow, allDropdowns);
        // Date filter
        this.renderDateFilter(filtersRow, addWhiteArrow);
        // Filter actions
        this.renderFilterActions(filtersRow);
        // Setup global click handler for dropdowns
        this.setupGlobalClickHandler(allDropdowns);
    }
    renderSearchInput(container) {
        const searchGroup = container.createDiv('compact-filter-group');
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
            this.updateFiltersCallback({ textSearch: searchInput.value });
        };
    }
    renderAssigneesFilter(container) {
        const assigneesGroup = container.createDiv('compact-filter-group');
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
        const updateAssigneesDisplay = () => {
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
        return updateAssigneesDisplay;
    }
    renderRolesFilter(container, addWhiteArrow, allDropdowns) {
        const rolesGroup = container.createDiv('compact-filter-group');
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
            }
            else if (selectedRoles.length === totalRoles) {
                rolesDisplay.setText('All Roles');
            }
            else {
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
                originalRoles = [...(this.currentFilters.roles || [])];
                tempRoles = [...originalRoles];
            }
            rolesDropdown.style.display = isVisible ? 'none' : 'block';
        };
        this.setupRolesDropdownContent(rolesDropdown, visibleRoles, totalRoles, tempRoles, originalRoles, updateRolesDisplay);
        updateRolesDisplay();
    }
    setupRolesDropdownContent(dropdown, visibleRoles, totalRoles, tempRoles, originalRoles, updateDisplay) {
        const optionsContainer = dropdown.createDiv('compact-multiselect-options');
        // Add "All Roles" option first
        const allRolesLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
        const allRolesCheckbox = allRolesLabel.createEl('input', { type: 'checkbox' });
        allRolesCheckbox.checked = tempRoles.length === totalRoles;
        allRolesLabel.createSpan().setText('All Roles');
        // Add "None" option for roles
        const noneRoleLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
        const noneRoleCheckbox = noneRoleLabel.createEl('input', { type: 'checkbox' });
        noneRoleCheckbox.checked = tempRoles.includes('none-set');
        noneRoleLabel.createSpan().setText('None');
        // Add visible roles
        const roleCheckboxes = [
            { checkbox: noneRoleCheckbox, id: 'none-set' }
        ];
        for (const role of visibleRoles) {
            const roleLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
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
                tempRoles.length = 0;
                tempRoles.push('none-set', ...visibleRoles.map(r => r.id));
            }
            else {
                tempRoles.length = 0;
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
                }
                else {
                    const index = tempRoles.indexOf(id);
                    if (index > -1) {
                        tempRoles.splice(index, 1);
                    }
                }
                updateRoleCheckboxes();
            };
        });
        // Action buttons
        this.setupMultiselectActions(dropdown, tempRoles, originalRoles, updateRoleCheckboxes, () => {
            this.updateFiltersCallback({ roles: tempRoles });
            updateDisplay();
        });
    }
    renderStatusFilter(container, addWhiteArrow, allDropdowns) {
        const statusGroup = container.createDiv('compact-filter-group');
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
        let originalStatuses = [...(this.currentFilters.statuses || [])];
        let tempStatuses = [...originalStatuses];
        // Update status display text
        const updateStatusDisplay = () => {
            const selectedStatuses = this.currentFilters.statuses || [];
            if (selectedStatuses.length === 0) {
                statusDisplay.setText('All Statuses');
            }
            else if (selectedStatuses.length === statuses.length) {
                statusDisplay.setText('All Statuses');
            }
            else {
                statusDisplay.setText(`${selectedStatuses.length} of ${statuses.length} Statuses`);
            }
        };
        // Toggle dropdown
        statusDisplay.onclick = (e) => {
            e.stopPropagation();
            const isVisible = statusDropdown.style.display !== 'none';
            if (!isVisible) {
                originalStatuses = [...(this.currentFilters.statuses || [])];
                tempStatuses = [...originalStatuses];
            }
            statusDropdown.style.display = isVisible ? 'none' : 'block';
        };
        this.setupStatusDropdownContent(statusDropdown, statuses, tempStatuses, originalStatuses, updateStatusDisplay);
        updateStatusDisplay();
    }
    setupStatusDropdownContent(dropdown, statuses, tempStatuses, originalStatuses, updateDisplay) {
        const optionsContainer = dropdown.createDiv('compact-multiselect-options');
        // Add "All Statuses" option first
        const allStatusLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
        const allStatusCheckbox = allStatusLabel.createEl('input', { type: 'checkbox' });
        allStatusCheckbox.checked = tempStatuses.length === statuses.length;
        allStatusLabel.createSpan().setText('All Statuses');
        // Add status options
        const statusCheckboxes = [];
        for (const status of statuses) {
            const statusLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
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
                tempStatuses.length = 0;
                tempStatuses.push(...statuses.map(s => s.value));
            }
            else {
                tempStatuses.length = 0;
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
                }
                else {
                    const index = tempStatuses.indexOf(value);
                    if (index > -1) {
                        tempStatuses.splice(index, 1);
                    }
                }
                updateStatusCheckboxes();
            };
        });
        // Action buttons
        this.setupMultiselectActions(dropdown, tempStatuses, originalStatuses, updateStatusCheckboxes, () => {
            this.updateFiltersCallback({ statuses: tempStatuses });
            updateDisplay();
        });
    }
    renderPriorityFilter(container, addWhiteArrow, allDropdowns) {
        const priorityGroup = container.createDiv('compact-filter-group');
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
        let originalPriorities = [...(this.currentFilters.priorities || [])];
        let tempPriorities = [...originalPriorities];
        // Update priority display text
        const updatePriorityDisplay = () => {
            const selectedPriorities = this.currentFilters.priorities || [];
            if (selectedPriorities.length === 0) {
                priorityDisplay.setText('All Priorities');
            }
            else if (selectedPriorities.length === totalPriorities) {
                priorityDisplay.setText('All Priorities');
            }
            else {
                priorityDisplay.setText(`${selectedPriorities.length} of ${totalPriorities} Priorities`);
            }
        };
        // Toggle dropdown
        priorityDisplay.onclick = (e) => {
            e.stopPropagation();
            const isVisible = priorityDropdown.style.display !== 'none';
            if (!isVisible) {
                originalPriorities = [...(this.currentFilters.priorities || [])];
                tempPriorities = [...originalPriorities];
            }
            priorityDropdown.style.display = isVisible ? 'none' : 'block';
        };
        this.setupPriorityDropdownContent(priorityDropdown, priorities, totalPriorities, tempPriorities, originalPriorities, updatePriorityDisplay);
        updatePriorityDisplay();
    }
    setupPriorityDropdownContent(dropdown, priorities, totalPriorities, tempPriorities, originalPriorities, updateDisplay) {
        const optionsContainer = dropdown.createDiv('compact-multiselect-options');
        // Add "All Priorities" option first
        const allPrioritiesLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
        const allPrioritiesCheckbox = allPrioritiesLabel.createEl('input', { type: 'checkbox' });
        allPrioritiesCheckbox.checked = tempPriorities.length === totalPriorities;
        allPrioritiesLabel.createSpan().setText('All Priorities');
        // Add "None" option for priority
        const nonePriorityLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
        const nonePriorityCheckbox = nonePriorityLabel.createEl('input', { type: 'checkbox' });
        nonePriorityCheckbox.checked = tempPriorities.includes('none-set');
        nonePriorityLabel.createSpan().setText('None');
        // Add priority options
        const priorityCheckboxes = [
            { checkbox: nonePriorityCheckbox, value: 'none-set' }
        ];
        for (const priority of priorities) {
            const priorityLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
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
                tempPriorities.length = 0;
                tempPriorities.push('none-set', ...priorities.map(p => p.value));
            }
            else {
                tempPriorities.length = 0;
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
                }
                else {
                    const index = tempPriorities.indexOf(value);
                    if (index > -1) {
                        tempPriorities.splice(index, 1);
                    }
                }
                updatePriorityCheckboxes();
            };
        });
        // Action buttons
        this.setupMultiselectActions(dropdown, tempPriorities, originalPriorities, updatePriorityCheckboxes, () => {
            this.updateFiltersCallback({ priorities: tempPriorities });
            updateDisplay();
        });
    }
    renderDateFilter(container, addWhiteArrow) {
        const dateGroup = container.createDiv('compact-filter-group');
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
            this.updateFiltersCallback({ dateType: dateTypeSelect.value });
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
            this.updateFiltersCallback({
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
            this.updateFiltersCallback({
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
            this.updateFiltersCallback({
                dateRange: {
                    ...this.currentFilters.dateRange,
                    includeNotSet: includeNotSetCheckbox.checked
                }
            });
        };
        const noDatesIcon = includeNotSetLabel.createEl('span');
        setIcon(noDatesIcon, 'calendar-x');
        includeNotSetLabel.title = 'Include tasks without dates';
    }
    renderFilterActions(container) {
        const actionsGroup = container.createDiv('compact-filter-actions');
        // Clear filters button
        const clearFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-clear' });
        const clearFiltersIcon = clearFiltersBtn.createEl('span');
        setIcon(clearFiltersIcon, 'rotate-ccw');
        clearFiltersBtn.title = 'Clear filters';
        clearFiltersBtn.onclick = async () => {
            this.updateFiltersCallback({});
        };
        // Cancel button
        const cancelFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-cancel' });
        const cancelFiltersIcon = cancelFiltersBtn.createEl('span');
        setIcon(cancelFiltersIcon, 'x-circle');
        cancelFiltersBtn.title = 'Cancel';
        cancelFiltersBtn.style.display = this.plugin.settings.autoApplyFilters ? 'none' : 'block';
        cancelFiltersBtn.onclick = () => {
            // Clear all filters
            this.updateFiltersCallback({});
        };
        // Apply Filters button
        const applyFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-apply' });
        const applyFiltersIcon = applyFiltersBtn.createEl('span');
        setIcon(applyFiltersIcon, 'play-circle');
        applyFiltersBtn.title = 'Apply';
        applyFiltersBtn.style.display = this.plugin.settings.autoApplyFilters ? 'none' : 'block';
        applyFiltersBtn.onclick = () => {
            // Apply current filters
            this.updateFiltersCallback(this.currentFilters);
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
                this.updateFiltersCallback(this.currentFilters);
            }
        };
        const autoApplyIcon = autoApplyLabel.createEl('span');
        setIcon(autoApplyIcon, 'fast-forward');
        autoApplyLabel.title = 'Auto apply';
    }
    setupMultiselectActions(dropdown, tempArray, originalArray, updateCheckboxes, onOk) {
        const actions = dropdown.createDiv('compact-multiselect-actions');
        const resetBtn = actions.createEl('button', { cls: 'compact-multiselect-btn' });
        resetBtn.setText('Reset');
        resetBtn.onclick = (e) => {
            e.stopPropagation();
            tempArray.length = 0;
            updateCheckboxes();
        };
        const cancelBtn = actions.createEl('button', { cls: 'compact-multiselect-btn' });
        cancelBtn.setText('Cancel');
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            tempArray.length = 0;
            tempArray.push(...originalArray);
            dropdown.style.display = 'none';
        };
        const okBtn = actions.createEl('button', { cls: 'compact-multiselect-btn compact-multiselect-ok' });
        okBtn.setText('OK');
        okBtn.onclick = (e) => {
            e.stopPropagation();
            onOk();
        };
    }
    setupGlobalClickHandler(allDropdowns) {
        const closeAllDropdowns = () => {
            allDropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        };
        const handleOutsideClick = (event) => {
            const target = event.target;
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
        document.addEventListener('click', handleOutsideClick);
        // Store cleanup function for when view is destroyed
        this.registerCallback(() => {
            document.removeEventListener('click', handleOutsideClick);
        });
    }
    showAssigneeSelector(updateCallback) {
        import('../modals/assignee-selector-modal').then(({ AssigneeSelectorModal }) => {
            new AssigneeSelectorModal(this.plugin.app, this.plugin, (selectedAssignee) => {
                // Determine if it's a person or company based on the symbol
                const isPerson = selectedAssignee.startsWith(this.plugin.settings.contactSymbol);
                const isCompany = selectedAssignee.startsWith(this.plugin.settings.companySymbol);
                if (isPerson) {
                    const currentPeople = this.currentFilters.people || [];
                    const newPeople = currentPeople.includes(selectedAssignee)
                        ? currentPeople.filter(p => p !== selectedAssignee)
                        : [...currentPeople, selectedAssignee];
                    this.updateFiltersCallback({ people: newPeople });
                }
                else if (isCompany) {
                    const currentCompanies = this.currentFilters.companies || [];
                    const newCompanies = currentCompanies.includes(selectedAssignee)
                        ? currentCompanies.filter(c => c !== selectedAssignee)
                        : [...currentCompanies, selectedAssignee];
                    this.updateFiltersCallback({ companies: newCompanies });
                }
                // Update the display
                updateCallback();
            }, { mode: 'readonly', keepOpen: true }).open();
        });
    }
}
