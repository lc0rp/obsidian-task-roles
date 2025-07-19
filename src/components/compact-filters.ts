import { setIcon } from 'obsidian';
import { ViewFilters, TaskStatus, TaskPriority, DateType } from '../types';
import type TaskRolesPlugin from '../main';
import { RolesFilter } from './filters/roles-filter';
import { StatusFilter } from './filters/status-filter';
import { PriorityFilter } from './filters/priority-filter';
import { AssigneesFilter } from './filters/assignees-filter';
import { DateFilter } from './filters/date-filter';
import { SearchFilter } from './filters/search-filter'; // New import

export class CompactFiltersComponent {
    /**
     * Compact filters component for task roles view.
     */
    private plugin: TaskRolesPlugin;
    private currentFilters: ViewFilters;
    private updateFiltersCallback: (filters: Partial<ViewFilters>) => void;
    private registerCallback: (cleanup: () => void) => void;
    private resetFiltersCallback: () => void;
    private applyFiltersCallback: () => void;
    private displayUpdateFunctions: (() => void)[] = [];

    constructor(
        plugin: TaskRolesPlugin,
        currentFilters: ViewFilters,
        updateFiltersCallback: (filters: Partial<ViewFilters>) => void,
        registerCallback: (cleanup: () => void) => void,
        resetFiltersCallback: () => void,
        applyFiltersCallback: () => void
    ) {
        this.plugin = plugin;
        this.currentFilters = currentFilters;
        this.updateFiltersCallback = updateFiltersCallback;
        this.registerCallback = registerCallback;
        this.resetFiltersCallback = resetFiltersCallback;
        this.applyFiltersCallback = applyFiltersCallback;
    }

    updateFilters(newFilters: ViewFilters): void {
        this.currentFilters = newFilters;
        this.updateAllDisplays();
    }

    private updateAllDisplays(): void {
        this.displayUpdateFunctions.forEach(updateFn => updateFn());
    }

    async render(container: HTMLElement): Promise<void> {
        const filtersEl = container.createDiv('task-roles-compact-filters');

        // Clear any existing display update functions
        this.displayUpdateFunctions = [];

        // Store references to all dropdowns for closing them when clicking outside
        const allDropdowns: HTMLElement[] = [];

        // Function to add white dropdown arrow to multiselect displays
        const addWhiteArrow = (element: HTMLElement) => {
            const whiteArrowSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E`;
            element.style.backgroundImage = `url("${whiteArrowSvg}")`;
        };

        // Create horizontal filter row
        const filtersRow = filtersEl.createDiv('task-roles-compact-filters-row');

        // Search filter - NEW IMPLEMENTATION
        const searchFilter = new SearchFilter(
            this.plugin,
            this.currentFilters,
            (filters) => { this.updateFiltersCallback({ textSearch: filters.textSearch }); }
        );
        const searchFilterUpdate = searchFilter.render(filtersRow);
        this.displayUpdateFunctions.push(searchFilterUpdate);

        // Assignees filter
        const newAssigneeFilter = new AssigneesFilter(
            this.plugin,
            {
                people: this.currentFilters.people || [],
                companies: this.currentFilters.companies || []
            },
            {
                updateFilters: (filters) => { this.updateFiltersCallback(filters); },
            }
        );
        newAssigneeFilter.render(filtersRow);

        // Roles filter
        const rolesFilter = new RolesFilter(
            this.plugin,
            this.currentFilters.roles || [],
            (roles) => { this.updateFiltersCallback({ roles }); }
        );
        rolesFilter.render(filtersRow);

        // Status filter - NEW IMPLEMENTATION
        const statusFilter = new StatusFilter(
            this.plugin,
            this.currentFilters.statuses || [],
            (statuses) => { this.updateFiltersCallback({ statuses }); }
        );
        statusFilter.render(filtersRow);

        // Priority filter
        const priorityFilter = new PriorityFilter(
            this.plugin,
            this.currentFilters.priorities || [],
            (priorities) => { this.updateFiltersCallback({ priorities }); }
        );
        priorityFilter.render(filtersRow);

        // Date filter
        const dateFilterNew = new DateFilter(
            this.plugin,
            this.currentFilters,
            (filters) => { this.updateFiltersCallback(filters); }
        );
        const dateFilterUpdateNew = dateFilterNew.render(filtersRow);
        this.displayUpdateFunctions.push(dateFilterUpdateNew);

        // Filter actions
        this.renderFilterActions(filtersRow);

        // Setup global click handler for dropdowns
        this.setupGlobalClickHandler(allDropdowns);
    }

    private renderSearchInput(container: HTMLElement): () => void {
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
            if (this.plugin.settings.autoApplyFilters) {
                this.updateFiltersCallback({ textSearch: searchInput.value });
            } else {
                this.currentFilters.textSearch = searchInput.value;
            }
        };

        // Return display update function
        return () => {
            searchInput.value = this.currentFilters.textSearch || '';
        };
    }

    private renderFilterActions(container: HTMLElement): void {
        const actionsGroup = container.createDiv('compact-filter-actions');

        // Reset filters button
        const resetFiltersBtn = actionsGroup.createEl('button', { cls: 'compact-filter-btn compact-filter-clear' });
        const resetFiltersIcon = resetFiltersBtn.createEl('span');
        setIcon(resetFiltersIcon, 'rotate-ccw');
        resetFiltersBtn.title = 'Reset filters';
        resetFiltersBtn.onclick = async () => {
            this.resetFiltersCallback();
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
            this.applyFiltersCallback();
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

            // If Auto Apply is enabled, apply filters immediately
            if (autoApplyCheckbox.checked) {
                this.updateFiltersCallback(this.currentFilters);
            }
        };
        const autoApplyIcon = autoApplyLabel.createEl('span');
        setIcon(autoApplyIcon, 'fast-forward');
        autoApplyLabel.title = 'Auto apply';
    }

    private setupMultiselectActions(
        dropdown: HTMLElement,
        tempArray: any[],
        originalArray: any[],
        updateCheckboxes: () => void,
        onOk: () => void
    ): void {
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

    private setupGlobalClickHandler(allDropdowns: HTMLElement[]): void {
        const closeAllDropdowns = () => {
            allDropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        };

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

        document.addEventListener('click', handleOutsideClick);

        // Store cleanup function for when view is destroyed
        this.registerCallback(() => {
            document.removeEventListener('click', handleOutsideClick);
        });
    }
}