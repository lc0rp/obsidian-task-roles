import { setIcon } from 'obsidian';
import { ViewLayout } from '../types';
export class ViewHeaderComponent {
    constructor(plugin, viewConfigService, taskCacheService, currentLayout, currentViewName, updateLayoutCallback, showSaveViewDialogCallback, loadSavedViewCallback) {
        this.currentViewName = null;
        this.plugin = plugin;
        this.viewConfigService = viewConfigService;
        this.taskCacheService = taskCacheService;
        this.currentLayout = currentLayout;
        this.currentViewName = currentViewName;
        this.updateLayoutCallback = updateLayoutCallback;
        this.showSaveViewDialogCallback = showSaveViewDialogCallback;
        this.loadSavedViewCallback = loadSavedViewCallback;
    }
    render(container) {
        const headerEl = container.createDiv('task-assignment-header');
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
            this.updateLayoutCallback(layoutSelect.value);
        };
        // Add dropdown arrow icon
        const layoutArrow = layoutContainer.createSpan('task-assignment-dropdown-arrow');
        setIcon(layoutArrow, 'chevron-down');
        // Save view button
        const saveViewBtn = controlsEl.createEl('button', { cls: 'task-assignment-save-view-btn' });
        saveViewBtn.setText('Save Config');
        saveViewBtn.onclick = () => this.showSaveViewDialogCallback();
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
                    this.loadSavedViewCallback(savedViewsSelect.value);
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
    updateCurrentViewName(viewName) {
        this.currentViewName = viewName;
    }
    updateCurrentLayout(layout) {
        this.currentLayout = layout;
    }
}
