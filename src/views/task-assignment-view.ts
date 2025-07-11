import { WorkspaceLeaf } from 'obsidian';
import { TaskAssignmentViewBase } from './task-assignment-view-base';
import { TaskData, ViewFilters } from '../types';
import { TaskCacheService } from '../services/task-cache.service';
import { ViewConfigurationService } from '../services/view-configuration.service';
import { TaskQueryService } from '../services/task-query.service';
import { SaveViewModal } from '../modals/save-view-modal';
import { CompactFiltersComponent } from '../components/compact-filters';
import { ExpandableFiltersComponent } from '../components/expandable-filters';
import { TaskCardComponent } from '../components/task-card';
import { ViewHeaderComponent } from '../components/view-header';
import type TaskAssignmentPlugin from '../main';

export class TaskAssignmentView extends TaskAssignmentViewBase {
	private viewContainerEl: HTMLElement;
	private viewContentEl: HTMLElement;
	private viewConfigService: ViewConfigurationService;
	private taskQueryService: TaskQueryService;
	private currentViewName: string | null = null;
	private originalFilters: ViewFilters = {};
	
	// Component instances
	private compactFiltersComponent: CompactFiltersComponent;
	private expandableFiltersComponent: ExpandableFiltersComponent;
	private taskCardComponent: TaskCardComponent;
	private viewHeaderComponent: ViewHeaderComponent;

	constructor(leaf: WorkspaceLeaf, plugin: TaskAssignmentPlugin, taskCacheService: TaskCacheService) {
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
		this.expandableFiltersComponent = new ExpandableFiltersComponent(
			this.plugin,
			this.currentFilters,
			this.updateFilters.bind(this)
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
		this.viewContainerEl.addClass('task-assignment-view');

		this.renderHeader();
		this.renderFilters();
		this.renderContent();
	}

	protected async renderAsync(): Promise<void> {
		this.viewContainerEl = this.contentEl;
		this.viewContainerEl.empty();
		this.viewContainerEl.addClass('task-assignment-view');

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
		// Use compact filters if the setting is enabled
		if (this.plugin.settings.useCompactFilters) {
			this.renderCompactFilters();
			return;
		}

		// Otherwise use the original expandable filters
		this.expandableFiltersComponent.render(this.viewContainerEl);
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
		this.currentFilters = { ...this.currentFilters, ...newFilters };
		
		// Only auto-render if Auto Apply is enabled
		if (this.plugin.settings.autoApplyFilters) {
			this.applyFiltersAndClose();
		}
	}

	private async applyFiltersAndClose(): Promise<void> {
		// Force re-render with current filters
		await this.renderAsync();
		
		// Close the filters section
		this.closeFiltersSection();
	}

	private async cancelFiltersAndClose(): Promise<void> {
		// Revert to original filters
		this.currentFilters = { ...this.originalFilters };
		
		// Re-render with original filters
		await this.renderAsync();
		
		// Close the filters section
		this.closeFiltersSection();
	}

	private closeFiltersSection(): void {
		const filtersEl = document.querySelector('.task-assignment-filters');
		if (!filtersEl) return;
		
		const filterToggle = filtersEl.querySelector('.task-assignment-filter-toggle') as HTMLElement;
		const filtersContent = filtersEl.querySelector('.task-assignment-filters-content') as HTMLElement;
		const arrowIcon = filtersEl.querySelector('.task-assignment-filter-arrow') as HTMLElement;
		
		if (filterToggle && filtersContent && arrowIcon) {
			filtersContent.style.display = 'none';
			filterToggle.classList.remove('active');
		}
	}

	private renderContent(): void {
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

	private async renderContentAsync(): Promise<void> {
		this.viewContentEl = this.viewContainerEl.createDiv('task-assignment-content');
		
		// Check if task queries are enabled
		if (this.plugin.settings.useTaskQueries) {
			await this.renderContentFromTaskQueries();
		}
	}

	private async renderContentFromTaskQueries(): Promise<void> {
		// Build queries for each column based on current layout
		const columnQueries = this.taskQueryService.buildColumnQueries(this.currentLayout, this.currentFilters);
		
		// Create columns container
		const columnsContainer = this.viewContentEl.createDiv('task-assignment-columns');
		
		// Render each column with its query
		for (const columnQuery of columnQueries) {
			await this.taskQueryService.renderQueryColumn(columnsContainer, columnQuery, this);
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
		this.taskCardComponent.render(container, task, this);
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
} 