import { setIcon } from 'obsidian';
import type TaskRolesPlugin from '../../main';

export interface Option<T> {
    value: T;
    label: string;
    icon?: string;
}

export abstract class MultiSelectFilterBase<T> {
    protected plugin: TaskRolesPlugin;
    protected currentValues: T[];
    protected updateCallback: (values: T[]) => void;
    protected tempValues: T[];

    constructor(
        plugin: TaskRolesPlugin,
        currentValues: T[],
        updateCallback: (values: T[]) => void
    ) {
        this.plugin = plugin;
        this.currentValues = currentValues;
        this.updateCallback = updateCallback;
        this.tempValues = [...currentValues];
    }

    // Render common UI: creates the container, icon, button, dropdown and event handlers.
    render(container: HTMLElement, iconName: string): void {
        const group = container.createDiv('compact-filter-group');
        group.createEl('label', { text: '', cls: 'compact-filter-label' });
        const iconSpan = group.createEl('span', { cls: 'compact-filter-icon' });
        setIcon(iconSpan, iconName);

        const dropdownContainer = group.createDiv('compact-multiselect-container');
        const displayButton = dropdownContainer.createEl('button', {
            cls: 'compact-multiselect-display',
        });
        this.addWhiteArrow(displayButton);
        this.updateDisplayText(displayButton);

        const dropdown = dropdownContainer.createDiv('compact-multiselect-dropdown');
        dropdown.classList.add('task-roles-hidden');

        displayButton.onclick = (e) => {
            e.stopPropagation();
            const isVisible = !dropdown.classList.contains('task-roles-hidden');
            if (!isVisible) {
                this.tempValues = [...this.currentValues];
                this.renderDropdownContent(dropdown);
            }
            dropdown.classList.toggle('task-roles-hidden', isVisible);
        };

        document.addEventListener('click', (e) => {
            if (!group.contains(e.target as Node)) {
                dropdown.classList.add('task-roles-hidden');
            }
        });
    }

    // Adds the white dropdown arrow styling to the control element.
    protected addWhiteArrow(element: HTMLElement): void {
        element.classList.add('has-white-arrow');
    }

    // Renders common dropdown content and action buttons.
    protected renderDropdownContent(dropdown: HTMLElement): void {
        dropdown.empty();
        const optionsContainer = dropdown.createDiv('compact-multiselect-options');
        const options = this.getOptions();

        // "All" option
        const allLabel = optionsContainer.createEl('label', {
            cls: 'compact-multiselect-option',
        });
        const allCheckbox = allLabel.createEl('input', { type: 'checkbox' });
        allCheckbox.checked = this.tempValues.length === options.length;
        allLabel.createSpan().setText('All');
        allCheckbox.onchange = (e) => {
            e.stopPropagation();
            if ((e.target as HTMLInputElement).checked) {
                this.tempValues = options.map((o) => o.value);
            } else {
                this.tempValues = [];
            }
            this.refreshCheckboxes(optionsContainer);
        };

        // Individual options
        options.forEach((option) => {
            const optLabel = optionsContainer.createEl('label', {
                cls: 'compact-multiselect-option',
            });
            const optCheckbox = optLabel.createEl('input', { type: 'checkbox' });
            optCheckbox.checked = this.tempValues.includes(option.value);

            if (option.icon) {
                if (option.icon.length <= 2) {
                    optLabel.createSpan().setText(`${option.icon} ${option.label}`);
                } else {
                    const iconSpan = optLabel.createEl('span', {
                        cls: 'compact-multiselect-option-icon',
                    });
                    setIcon(iconSpan, option.icon);
                    optLabel.createSpan().setText(` ${option.label}`);
                }
            } else {
                optLabel.createSpan().setText(option.label);
            }

            optCheckbox.onchange = (e) => {
                if ((e.target as HTMLInputElement).checked) {
                    if (!this.tempValues.includes(option.value)) {
                        this.tempValues.push(option.value);
                    }
                } else {
                    this.tempValues = this.tempValues.filter((v) => v !== option.value);
                }
                this.refreshCheckboxes(optionsContainer);
            };
        });

        const actionsDiv = dropdown.createDiv('compact-multiselect-actions');
        const resetBtn = actionsDiv.createEl('button', { cls: 'compact-multiselect-btn' });
        resetBtn.setText('Reset');
        resetBtn.onclick = (e) => {
            e.stopPropagation();
            this.tempValues = [];
            this.refreshCheckboxes(optionsContainer);
        };

        const cancelBtn = actionsDiv.createEl('button', { cls: 'compact-multiselect-btn' });
        cancelBtn.setText('Cancel');
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.add('task-roles-hidden');
        };

        const okBtn = actionsDiv.createEl('button', {
            cls: 'compact-multiselect-btn compact-multiselect-ok',
        });
        okBtn.setText('OK');
        okBtn.onclick = (e) => {
            e.stopPropagation();
            this.currentValues = [...this.tempValues];
            this.updateCallback(this.currentValues);
            const btn = dropdown.parentElement?.querySelector('button');
            if (btn) {
                this.updateDisplayText(btn);
            }
            dropdown.classList.add('task-roles-hidden');
        };
    }

    protected refreshCheckboxes(_optionsContainer: HTMLElement): void {
        // ...existing code...
    }

    protected abstract getOptions(): Option<T>[];
    protected abstract updateDisplayText(button: HTMLElement): void;
}

