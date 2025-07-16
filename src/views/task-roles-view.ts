import { WorkspaceLeaf } from 'obsidian';
import { TaskRolesViewBase } from './task-roles-view-base';
import { TaskData, ViewFilters, ViewLayout } from '../types';
import { TaskCacheService } from '../services/task-cache.service';
import { ViewConfigurationService } from '../services/view-configuration.service';
import { TaskQueryService } from '../services/task-query.service';
import { TaskRolesSaveViewModal } from '../modals/save-view-modal';
import { CompactFiltersComponent } from '../components/compact-filters';
import { TaskCardComponent } from '../components/task-card';
import { ViewHeaderComponent } from '../components/view-header';
import type TaskRolesPlugin from '../main';

export class TaskRolesView extends TaskRolesViewBase {
    private viewContainerEl: HTMLElement;
    private viewContentEl: HTMLElement;
    private viewConfigService: ViewConfigurationService;
    private taskQueryService: TaskQueryService;
    private currentViewName: string | null = null;
    private originalFilters: ViewFilters = {};

    // Component instances
    private compactFiltersComponent: CompactFiltersComponent;
    private taskCardComponent: TaskCardComponent;
    private viewHeaderComponent: ViewHeaderComponent;

    constructor(leaf: WorkspaceLeaf, plugin: TaskRolesPlugin, taskCacheService: TaskCacheService) {
        super(leaf, plugin, taskCacheService);
        this.viewConfigService = new ViewConfigurationService(this.app, this.plugin);
        this.taskQueryService = new TaskQueryService(this.plugin, this.taskCacheService);

        // Initialize components
        this.initializeComponents();
    }

    private initializeComponents(): void {
        this.compactFiltersComponent = new CompactFiltersComponent(
            this.plugin,
            this.currentFilters,
            this.updateFilters.bind(this),
            this.register.bind(this)
        );
        this.taskCardComponent = new TaskCardComponent(
            this.plugin,
            this.taskCacheService,
            this.app
        );
        this.viewHeaderComponent = new ViewHeaderComponent(
            this.plugin,
            this.viewConfigService,
            this.taskCacheService,
            this.currentLayout,
            this.currentViewName,
            this.updateLayout.bind(this),
            this.showSaveViewDialog.bind(this),
            this.loadSavedView.bind(this)
        );
    }

    protected render(): void {
        this.viewContainerEl = this.contentEl;
        this.viewContainerEl.empty();
        this.viewContainerEl.addClass('task-roles-view');

        this.renderHeader();
        this.renderFilters();
        this.renderContent();
    }

    protected async renderAsync(): Promise<void> {
        this.viewContainerEl = this.contentEl;
        this.viewContainerEl.empty();
        this.viewContainerEl.addClass('task-roles-view');

        this.renderHeader();
        await this.renderFiltersAsync();
        await this.renderContentAsync();
    }

    private renderHeader(): void {
        // Update component state
        this.viewHeaderComponent.updateCurrentLayout(this.currentLayout);
        this.viewHeaderComponent.updateCurrentViewName(this.currentViewName);

        // Render header using component
        this.viewHeaderComponent.render(this.viewContainerEl);
    }

    private async renderFiltersAsync(): Promise<void> {
        await this.renderCompactFiltersAsync();
    }

    private async renderCompactFiltersAsync(): Promise<void> {
        await this.renderCompactFilters();
    }

    private renderFilters(): void {
        this.renderCompactFilters();
    }

    private async renderCompactFilters(): Promise<void> {
        // Store original filters for cancel functionality
        this.originalFilters = { ...this.currentFilters };

        // Update component state and render
        this.compactFiltersComponent = new CompactFiltersComponent(
            this.plugin,
            this.currentFilters,
            this.updateFilters.bind(this),
            this.register.bind(this)
        );

        await this.compactFiltersComponent.render(this.viewContainerEl);
    }

    // Override updateFilters to respect Auto Apply setting
    protected updateFilters(newFilters: Partial<ViewFilters>): void {
        // Check if this is a complete filter reset (all properties defined)
        const isCompleteReset = newFilters.textSearch !== undefined && 
                              newFilters.roles !== undefined &&
                              newFilters.people !== undefined &&
                              newFilters.companies !== undefined &&
                              newFilters.statuses !== undefined &&
                              newFilters.priorities !== undefined &&
                              newFilters.tags !== undefined &&
                              newFilters.dateRange !== undefined &&
                              newFilters.dateType !== undefined;

        if (isCompleteReset) {
            // Complete replacement for reset/clear operations
            this.currentFilters = newFilters as ViewFilters;
        } else {
            // Partial merge for individual filter updates
            this.currentFilters = { ...this.currentFilters, ...newFilters };
        }

        // Only auto-render if Auto Apply is enabled
        if (this.plugin.settings.autoApplyFilters) {
            this.applyFiltersAndClose();
        }
    }

    private async applyFiltersAndClose(): Promise<void> {
        // Force re-render with current filters
        await this.renderAsync();

    }

    private async cancelFiltersAndClose(): Promise<void> {
        // Revert to original filters
        this.currentFilters = { ...this.originalFilters };

        // Re-render with original filters
        await this.renderAsync();

    }


    private renderContent(): void {
        this.viewContentEl = this.viewContainerEl.createDiv('task-roles-content');

        // Check if task queries are enabled
        if (!this.plugin.settings.useTaskQueries) {
            // Get filtered and organized tasks
            const allTasks = this.taskCacheService.getAllTasks();
            const filteredTasks = this.applyFilters(allTasks);
            const columns = this.organizeTasksByLayout(filteredTasks);

            // Render columns
            const columnsContainer = this.viewContentEl.createDiv('task-roles-columns');

            for (const column of columns) {
                this.renderColumn(columnsContainer, column);
            }
        }
    }

    private async renderContentAsync(): Promise<void> {
        this.viewContentEl = this.viewContainerEl.createDiv('task-roles-content');

        // Check if task queries are enabled
        if (this.plugin.settings.useTaskQueries) {
            await this.renderContentFromTaskQueries();
        }
    }

    private async renderContentFromTaskQueries(): Promise<void> {
        // Build queries for each column based on current layout
        const columnQueries = this.taskQueryService.buildColumnQueries(this.currentLayout, this.currentFilters);

        // Create columns container
        const columnsContainer = this.viewContentEl.createDiv('task-roles-columns');

        // Render each column with its query
        for (const columnQuery of columnQueries) {
            await this.taskQueryService.renderQueryColumn(columnsContainer, columnQuery, this);
        }
    }

    private renderColumn(container: HTMLElement, column: any): void {
        const columnEl = container.createDiv('task-roles-column');

        // Column header
        const headerEl = columnEl.createDiv('task-roles-column-header');
        headerEl.createSpan('task-roles-column-title').setText(column.title);
        headerEl.createSpan('task-roles-column-count').setText(`(${column.tasks.length})`);

        // Column content
        const contentEl = columnEl.createDiv('task-roles-column-content');

        for (const task of column.tasks) {
            this.renderTaskCard(contentEl, task);
        }
    }

    private renderTaskCard(container: HTMLElement, task: TaskData): void {
        this.taskCardComponent.render(container, task, this);
    }

    private showSaveViewDialog(): void {
        new TaskRolesSaveViewModal(
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
            if (this.plugin.settings.useTaskQueries) {
                this.renderAsync();
            } else {
                this.render();
            }
        }
    }

    // Override the base class updateLayout method to handle async rendering
    protected updateLayout(newLayout: ViewLayout): void {
        this.currentLayout = newLayout;
        if (this.plugin.settings.useTaskQueries) {
            this.renderAsync();
        } else {
            this.render();
        }
    }
} 