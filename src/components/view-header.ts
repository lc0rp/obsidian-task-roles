import { setIcon } from 'obsidian';
import { ViewLayout } from '../types';
import { ViewConfigurationService } from '../services/view-configuration.service';
import { TaskCacheService } from '../services/task-cache.service';
import type TaskRolesPlugin from '../main';

export class ViewHeaderComponent {
    private plugin: TaskRolesPlugin;
    private viewConfigService: ViewConfigurationService;
    private taskCacheService: TaskCacheService;
    private currentLayout: ViewLayout;
    private currentViewName: string | null = null;
    private updateLayoutCallback: (layout: ViewLayout) => void;
    private showSaveViewDialogCallback: () => void;
    private loadSavedViewCallback: (viewId: string) => void;

    constructor(
        plugin: TaskRolesPlugin,
        viewConfigService: ViewConfigurationService,
        taskCacheService: TaskCacheService,
        currentLayout: ViewLayout,
        currentViewName: string | null,
        updateLayoutCallback: (layout: ViewLayout) => void,
        showSaveViewDialogCallback: () => void,
        loadSavedViewCallback: (viewId: string) => void
    ) {
        this.plugin = plugin;
        this.viewConfigService = viewConfigService;
        this.taskCacheService = taskCacheService;
        this.currentLayout = currentLayout;
        this.currentViewName = currentViewName;
        this.updateLayoutCallback = updateLayoutCallback;
        this.showSaveViewDialogCallback = showSaveViewDialogCallback;
        this.loadSavedViewCallback = loadSavedViewCallback;
    }

    render(container: HTMLElement): void {
        const headerEl = container.createDiv('task-roles-header');

        // Title
        const titleEl = headerEl.createDiv('task-roles-title');
        const iconEl = titleEl.createSpan('task-roles-icon');
        setIcon(iconEl, 'users');
        titleEl.createSpan('task-roles-title-text').setText('Task Center');

        // Current view name display
        if (this.currentViewName) {
            const viewNameEl = titleEl.createDiv('task-roles-current-view');
            viewNameEl.createSpan('task-roles-current-view-label').setText('Loaded Config:');
            viewNameEl.createSpan('task-roles-current-view-name').setText(this.currentViewName);
        }

        // Controls
        const controlsEl = headerEl.createDiv('task-roles-controls');

        // Layout selector with label
        const layoutContainer = controlsEl.createDiv('task-roles-layout-container');
        layoutContainer.createSpan('task-roles-layout-label').setText('Show:');

        const layoutSelect = layoutContainer.createEl('select', { cls: 'task-roles-layout-select' });
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
            this.updateLayoutCallback(layoutSelect.value as ViewLayout);
        };

        // Add dropdown arrow icon
        const layoutArrow = layoutContainer.createSpan('task-roles-dropdown-arrow');
        setIcon(layoutArrow, 'chevron-down');

        // Save view button
        const saveViewBtn = controlsEl.createEl('button', { cls: 'task-roles-save-view-btn' });
        saveViewBtn.setText('Save Config');
        saveViewBtn.onclick = () => this.showSaveViewDialogCallback();

        // Saved views dropdown
        const savedViews = this.viewConfigService.getAllViewConfigurations();
        if (savedViews.length > 0) {
            const savedViewsContainer = controlsEl.createDiv('task-roles-layout-container');
            const savedViewsSelect = savedViewsContainer.createEl('select', { cls: 'task-roles-saved-views-select' });
            const defaultOption = savedViewsSelect.createEl('option', { value: '' });
            defaultOption.setText('Load Config...');

            for (const view of savedViews) {
                const option = savedViewsSelect.createEl('option', { value: view.id });
                option.setText(view.name);
            }

            savedViewsSelect.onchange = () => {
                if (savedViewsSelect.value) {
                    this.loadSavedViewCallback(savedViewsSelect.value);
                    savedViewsSelect.value = ''; // Reset selection
                }
            };

            // Add dropdown arrow icon
            const savedViewsArrow = savedViewsContainer.createSpan('task-roles-dropdown-arrow');
            setIcon(savedViewsArrow, 'chevron-down');
        }

        // Divider before refresh button
        controlsEl.createDiv('task-roles-controls-divider');

        // Refresh button (moved to last position)
        const refreshBtn = controlsEl.createEl('button', { cls: 'task-roles-refresh-btn' });
        setIcon(refreshBtn, 'refresh-cw');
        refreshBtn.setAttribute('aria-label', 'Rebuild cache');
        refreshBtn.setAttribute('title', 'Rebuild cache');
        refreshBtn.onclick = () => this.taskCacheService.refreshCache();
    }

    updateCurrentViewName(viewName: string | null): void {
        this.currentViewName = viewName;
    }

    updateCurrentLayout(layout: ViewLayout): void {
        this.currentLayout = layout;
    }
} 