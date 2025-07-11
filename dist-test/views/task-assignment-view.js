import { TaskAssignmentViewBase } from './task-assignment-view-base';
import { ViewConfigurationService } from '../services/view-configuration.service';
import { TaskQueryService } from '../services/task-query.service';
import { SaveViewModal } from '../modals/save-view-modal';
import { CompactFiltersComponent } from '../components/compact-filters';
import { ExpandableFiltersComponent } from '../components/expandable-filters';
import { TaskCardComponent } from '../components/task-card';
import { ViewHeaderComponent } from '../components/view-header';
export class TaskAssignmentView extends TaskAssignmentViewBase {
    constructor(leaf, plugin, taskCacheService) {
        super(leaf, plugin, taskCacheService);
        this.currentViewName = null;
        this.originalFilters = {};
        this.viewConfigService = new ViewConfigurationService(this.app, this.plugin);
        this.taskQueryService = new TaskQueryService(this.plugin, this.taskCacheService);
        // Initialize components
        this.initializeComponents();
    }
    initializeComponents() {
        this.compactFiltersComponent = new CompactFiltersComponent(this.plugin, this.currentFilters, this.updateFilters.bind(this), this.register.bind(this));
        this.expandableFiltersComponent = new ExpandableFiltersComponent(this.plugin, this.currentFilters, this.updateFilters.bind(this));
        this.taskCardComponent = new TaskCardComponent(this.plugin, this.taskCacheService, this.app);
        this.viewHeaderComponent = new ViewHeaderComponent(this.plugin, this.viewConfigService, this.taskCacheService, this.currentLayout, this.currentViewName, this.updateLayout.bind(this), this.showSaveViewDialog.bind(this), this.loadSavedView.bind(this));
    }
    render() {
        this.viewContainerEl = this.contentEl;
        this.viewContainerEl.empty();
        this.viewContainerEl.addClass('task-assignment-view');
        this.renderHeader();
        this.renderFilters();
        this.renderContent();
    }
    async renderAsync() {
        this.viewContainerEl = this.contentEl;
        this.viewContainerEl.empty();
        this.viewContainerEl.addClass('task-assignment-view');
        this.renderHeader();
        await this.renderFiltersAsync();
        await this.renderContentAsync();
    }
    renderHeader() {
        // Update component state
        this.viewHeaderComponent.updateCurrentLayout(this.currentLayout);
        this.viewHeaderComponent.updateCurrentViewName(this.currentViewName);
        // Render header using component
        this.viewHeaderComponent.render(this.viewContainerEl);
    }
    async renderFiltersAsync() {
        await this.renderCompactFiltersAsync();
    }
    async renderCompactFiltersAsync() {
        await this.renderCompactFilters();
    }
    renderFilters() {
        // Use compact filters if the setting is enabled
        if (this.plugin.settings.useCompactFilters) {
            this.renderCompactFilters();
            return;
        }
        // Otherwise use the original expandable filters
        this.expandableFiltersComponent.render(this.viewContainerEl);
    }
    async renderCompactFilters() {
        // Store original filters for cancel functionality
        this.originalFilters = { ...this.currentFilters };
        // Update component state and render
        this.compactFiltersComponent = new CompactFiltersComponent(this.plugin, this.currentFilters, this.updateFilters.bind(this), this.register.bind(this));
        await this.compactFiltersComponent.render(this.viewContainerEl);
    }
    // Override updateFilters to respect Auto Apply setting
    updateFilters(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        // Only auto-render if Auto Apply is enabled
        if (this.plugin.settings.autoApplyFilters) {
            this.applyFiltersAndClose();
        }
    }
    async applyFiltersAndClose() {
        // Force re-render with current filters
        await this.renderAsync();
        // Close the filters section
        this.closeFiltersSection();
    }
    async cancelFiltersAndClose() {
        // Revert to original filters
        this.currentFilters = { ...this.originalFilters };
        // Re-render with original filters
        await this.renderAsync();
        // Close the filters section
        this.closeFiltersSection();
    }
    closeFiltersSection() {
        const filtersEl = document.querySelector('.task-assignment-filters');
        if (!filtersEl)
            return;
        const filterToggle = filtersEl.querySelector('.task-assignment-filter-toggle');
        const filtersContent = filtersEl.querySelector('.task-assignment-filters-content');
        const arrowIcon = filtersEl.querySelector('.task-assignment-filter-arrow');
        if (filterToggle && filtersContent && arrowIcon) {
            filtersContent.style.display = 'none';
            filterToggle.classList.remove('active');
        }
    }
    renderContent() {
        this.viewContentEl = this.viewContainerEl.createDiv('task-assignment-content');
        // Check if task queries are enabled
        if (!this.plugin.settings.useTaskQueries) {
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
    }
    async renderContentAsync() {
        this.viewContentEl = this.viewContainerEl.createDiv('task-assignment-content');
        // Check if task queries are enabled
        if (this.plugin.settings.useTaskQueries) {
            await this.renderContentFromTaskQueries();
        }
    }
    async renderContentFromTaskQueries() {
        // Build queries for each column based on current layout
        const columnQueries = this.taskQueryService.buildColumnQueries(this.currentLayout, this.currentFilters);
        // Create columns container
        const columnsContainer = this.viewContentEl.createDiv('task-assignment-columns');
        // Render each column with its query
        for (const columnQuery of columnQueries) {
            await this.taskQueryService.renderQueryColumn(columnsContainer, columnQuery, this);
        }
    }
    renderColumn(container, column) {
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
    renderTaskCard(container, task) {
        this.taskCardComponent.render(container, task, this);
    }
    showSaveViewDialog() {
        new SaveViewModal(this.app, this.viewConfigService, this.currentLayout, this.currentFilters, this.currentSort, () => this.render() // Refresh to show new saved view in dropdown
        ).open();
    }
    loadSavedView(viewId) {
        const config = this.viewConfigService.getViewConfiguration(viewId);
        if (config) {
            this.currentLayout = config.layout;
            this.currentFilters = config.filters;
            this.currentSort = config.sortBy;
            this.currentViewName = config.name;
            this.render();
        }
    }
}
