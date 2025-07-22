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
	render(
		container: HTMLElement,
		iconName: string,
	): void {
		const group = container.createDiv('compact-filter-group');
		group.createEl('label', { text: '', cls: 'compact-filter-label' });
		const iconSpan = group.createEl('span', { cls: `compact-filter-icon` });
		setIcon(iconSpan, iconName);
        const dropdownContainer = group.createDiv('compact-multiselect-container');
		const displayButton = dropdownContainer.createEl('button', { cls: 'compact-multiselect-display' });
        // Apply the white arrow to the control so CSS renders correctly.
		this.addWhiteArrow(displayButton);
		this.updateDisplayText(displayButton);
		const dropdown = dropdownContainer.createDiv('compact-multiselect-dropdown'	);
		dropdown.style.display = 'none';

		displayButton.onclick = (e) => {
			e.stopPropagation();
			const isVisible = dropdown.style.display !== 'none';
			if (!isVisible) {
				this.tempValues = [...this.currentValues];
				this.renderDropdownContent(dropdown);
			}
			dropdown.style.display = isVisible ? 'none' : 'block';
		};

		document.addEventListener('click', (e) => {
			if (!group.contains(e.target as Node)) {
				dropdown.style.display = 'none';
			}
		});
	}

	// Adds the white dropdown arrow styling to the control element.
	protected addWhiteArrow(element: HTMLElement): void {
		const whiteArrowSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E`;
		element.style.backgroundImage = `url("${whiteArrowSvg}")`;
	}

	// Renders common dropdown content and action buttons.
	protected renderDropdownContent(dropdown: HTMLElement): void {
		dropdown.empty();
		const optionsContainer = dropdown.createDiv('compact-multiselect-options');
		const options = this.getOptions();

		// "All" option
		const allLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
		const allCheckbox = allLabel.createEl('input', { type: 'checkbox' });
		allCheckbox.checked = this.tempValues.length === options.length;
		allLabel.createSpan().setText('All');
		allCheckbox.onchange = (e) => {
			e.stopPropagation();
			if ((e.target as HTMLInputElement).checked) {
				this.tempValues = options.map(o => o.value);
			} else {
				this.tempValues = [];
			}
			this.refreshCheckboxes(optionsContainer);
		};

		// Individual options
		options.forEach((option) => {
			const optLabel = optionsContainer.createEl('label', { cls: 'compact-multiselect-option' });
			const optCheckbox = optLabel.createEl('input', { type: 'checkbox' });
			optCheckbox.checked = this.tempValues.includes(option.value);
			
			if (option.icon) {
				// Check if icon is a character (length 1-2 for emoji) or a Lucide icon name
				if (option.icon.length <= 2) {
					// Character icon (emoji) - use text concatenation
					optLabel.createSpan().setText(`${option.icon} ${option.label}`);
				} else {
					// Lucide icon - use setIcon()
					const iconSpan = optLabel.createEl('span', { cls: 'compact-multiselect-option-icon' });
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
					this.tempValues = this.tempValues.filter(v => v !== option.value);
				}
				this.refreshCheckboxes(optionsContainer);
			};
		});

		// Action buttons: Reset, Cancel, OK.
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
			dropdown.style.display = 'none';
		};
		const okBtn = actionsDiv.createEl('button', { cls: 'compact-multiselect-btn compact-multiselect-ok' });
		okBtn.setText('OK');
		okBtn.onclick = (e) => {
			e.stopPropagation();
			this.currentValues = [...this.tempValues];
			this.updateCallback(this.currentValues);
			const btn = dropdown.parentElement?.querySelector('button');
			if (btn) {
				this.updateDisplayText(btn);
			}
			dropdown.style.display = 'none';
		};
	}

	// Stub for syncing state; override if needed.
	protected refreshCheckboxes(optionsContainer: HTMLElement): void {
		// ...existing code...
	}

	// Must supply the options for selection.
	protected abstract getOptions(): Option<T>[];
	// Must update the display button text.
	protected abstract updateDisplayText(button: HTMLElement): void;
}