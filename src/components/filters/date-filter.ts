import { setIcon } from 'obsidian';
import { DateType, ViewFilters } from '../../types';
import type TaskRolesPlugin from '../../main';

export class DateFilter {
    private plugin: TaskRolesPlugin;
    private currentFilters: Partial<ViewFilters>;
    private updateFiltersCallback: (filters: Partial<ViewFilters>) => void;
    
    constructor(
        plugin: TaskRolesPlugin,
        currentFilters: Partial<ViewFilters>,
        updateFiltersCallback: (filters: Partial<ViewFilters>) => void
    ) {
        this.plugin = plugin;
        this.currentFilters = currentFilters;
        this.updateFiltersCallback = updateFiltersCallback;
    }

    render(container: HTMLElement): () => void {
        const dateGroup = container.createDiv('compact-filter-group');
        // ...existing code: label creation...
        dateGroup.createEl('label', { text: '', cls: 'compact-filter-label' });

        const dateIcon = dateGroup.createEl('span', { cls: 'compact-filter-icon' });
        setIcon(dateIcon, 'calendar');

        const dateContainer = dateGroup.createDiv('compact-date-container');

        // Date type select with arrow (CSS classes remain the same)
        const dateTypeSelect = dateContainer.createEl('select', { cls: 'compact-filter-select compact-date-type' });
        // Optionally, add white arrow style here in CSS or inline if needed

        const dateTypes = [
            { value: DateType.DUE, label: 'Due' },
            { value: DateType.DONE, label: 'Done' },
            { value: DateType.SCHEDULED, label: 'Scheduled' },
            { value: DateType.START, label: 'Start' },
            { value: DateType.CREATED, label: 'Created' },
            { value: DateType.CANCELLED, label: 'Cancelled' },
            { value: DateType.HAPPENS, label: 'Happens' }
        ];
        for (const dt of dateTypes) {
            dateTypeSelect.createEl('option', { value: dt.value, text: dt.label });
        }
        dateTypeSelect.onchange = () => {
            this.updateFiltersCallback({ dateType: dateTypeSelect.value as DateType });
        };

        // Date range inputs
        const fromInput = dateContainer.createEl('input', {
            type: 'date',
            cls: 'compact-filter-date',
            title: 'From date'
        });
        fromInput.onchange = () => {
            const from = fromInput.value ? new Date(fromInput.value) : undefined;
            this.updateFiltersCallback({
                dateRange: {
                    from,
                    to: this.currentFilters.dateRange?.to,
                    includeNotSet: this.currentFilters.dateRange?.includeNotSet || false
                }
            });
        };

        const toInput = dateContainer.createEl('input', {
            type: 'date',
            cls: 'compact-filter-date',
            title: 'To date'
        });
        toInput.onchange = () => {
            const to = toInput.value ? new Date(toInput.value) : undefined;
            this.updateFiltersCallback({
                dateRange: {
                    from: this.currentFilters.dateRange?.from,
                    to,
                    includeNotSet: this.currentFilters.dateRange?.includeNotSet || false
                }
            });
        };

        // Include not set checkbox
        const includeNotSetLabel = dateContainer.createEl('label', { cls: 'compact-date-checkbox' });
        const includeNotSetCheckbox = includeNotSetLabel.createEl('input', { type: 'checkbox' });
        includeNotSetCheckbox.onchange = () => {
            this.updateFiltersCallback({
                dateRange: {
                    from: this.currentFilters.dateRange?.from,
                    to: this.currentFilters.dateRange?.to,
                    includeNotSet: includeNotSetCheckbox.checked
                }
            });
        };
        const notSetIcon = includeNotSetLabel.createEl('span');
        setIcon(notSetIcon, 'calendar-x');
        includeNotSetLabel.title = 'Include tasks without dates';

        // Update display function
        const updateDisplay = () => {
            dateTypeSelect.value = this.currentFilters.dateType || DateType.DUE;
            fromInput.value = this.currentFilters.dateRange?.from ? this.currentFilters.dateRange.from.toISOString().split('T')[0] : '';
            toInput.value = this.currentFilters.dateRange?.to ? this.currentFilters.dateRange.to.toISOString().split('T')[0] : '';
            includeNotSetCheckbox.checked = this.currentFilters.dateRange?.includeNotSet || false;
        };

        updateDisplay();
        return updateDisplay;
    }
}
