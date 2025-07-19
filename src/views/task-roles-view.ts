import { WorkspaceLeaf } from 'obsidian';
import { TaskRolesViewBase } from './task-roles-view-base';
import { ViewFilters, ViewLayout } from '../types';
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

    constructor(leaf: WorkspaceLeaf, plugin: TaskRolesPlugin) {
        super(leaf, plugin);
        this.viewConfigService = new ViewConfigurationService(this.app, this.plugin);
        this.taskQueryService = new TaskQueryService(this.plugin);

        // Initialize components
        this.initializeComponents();
    }

    private initializeComponents(): void {
        this.compactFiltersComponent = new CompactFiltersComponent(
            this.plugin,
            this.currentFilters,
            this.updateFilters.bind(this),
            this.register.bind(this),
            this.resetFilters.bind(this),
            this.applyFilters.bind(this)
        );
        this.taskCardComponent = new TaskCardComponent(
            this.plugin,
            this.app
        );
        this.viewHeaderComponent = new ViewHeaderComponent(
            this.plugin,
            this.viewConfigService,
            this.currentLayout,
            this.currentViewName,
            this.updateLayout.bind(this),
            this.showSaveViewDialog.bind(this),
            this.loadSavedView.bind(this)
        );
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
        // Store original filters for cancel functionality
        this.originalFilters = { ...this.currentFilters };

        // Update component state and render
        this.compactFiltersComponent = new CompactFiltersComponent(
            this.plugin,
            this.currentFilters,
            this.updateFilters.bind(this),
            this.register.bind(this),
            this.resetFilters.bind(this),
            this.applyFilters.bind(this)
        );

        await this.compactFiltersComponent.render(this.viewContainerEl);
    }

    // Override updateFilters to respect Auto Apply setting
    protected async updateFilters(newFilters: Partial<ViewFilters>): Promise<void> {
        this.currentFilters = { ...this.currentFilters, ...newFilters };

        // Only auto-render if Auto Apply is enabled
        if (this.plugin.settings.autoApplyFilters) {
            await this.applyFilters();
        }
    }

    private async applyFilters(): Promise<void> {
        // Force re-render with current filters
        await this.renderAsync();
    }

    private async resetFilters(): Promise<void> {
        this.currentFilters = {};
        await this.renderAsync();
    }

    private async cancelFiltersAndClose(): Promise<void> {
        // Revert to original filters
        this.currentFilters = { ...this.originalFilters };

        // Re-render with original filters
        await this.renderAsync();

    }

    private async renderContentAsync(): Promise<void> {
        this.viewContentEl = this.viewContainerEl.createDiv('task-roles-content');
        await this.renderContentFromTaskQueries();
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


    private showSaveViewDialog(): void {
        new TaskRolesSaveViewModal(
            this.app,
            this.viewConfigService,
            this.currentLayout,
            this.currentFilters,
            this.currentSort,
            () => this.renderAsync() // Refresh to show new saved view in dropdown
        ).open();
    }

    private loadSavedView(viewId: string): void {
        const config = this.viewConfigService.getViewConfiguration(viewId);
        if (config) {
            this.currentLayout = config.layout;
            this.currentFilters = config.filters;
            this.currentSort = config.sortBy;
            this.currentViewName = config.name;
            this.renderAsync();
        }
    }

    // Override the base class updateLayout method to handle async rendering
    protected async updateLayout(newLayout: ViewLayout): Promise<void> {
        this.currentLayout = newLayout;
        await this.renderAsync();
    }
}