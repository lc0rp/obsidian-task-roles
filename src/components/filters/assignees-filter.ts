import { setIcon } from 'obsidian';
import type TaskRolesPlugin from '../../main';

export interface AssigneesFilterOptions {
	people?: string[];
	companies?: string[];
}

export interface AssigneesFilterCallbacks {
	updateFilters: (filters: { people?: string[]; companies?: string[] }) => void;
}

export class AssigneesFilter {
	private plugin: TaskRolesPlugin;
	private currentFilters: AssigneesFilterOptions;
	private callbacks: AssigneesFilterCallbacks;
	private tooltip: HTMLElement;
	private assigneesInput: HTMLInputElement;
	private clearButton: HTMLElement;

	constructor(plugin: TaskRolesPlugin, filters: AssigneesFilterOptions, callbacks: AssigneesFilterCallbacks) {
		this.plugin = plugin;
		this.currentFilters = filters;
		this.callbacks = callbacks;
	}

	render(container: HTMLElement): void {
		const assigneesGroup = container.createDiv('compact-filter-group');
		assigneesGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		const assigneesIcon = assigneesGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(assigneesIcon, 'users');

		// Create a wrapper for the input and clear button
		const inputWrapper = assigneesGroup.createDiv('compact-filter-input-wrapper');
		this.assigneesInput = inputWrapper.createEl('input', {
			type: 'text',
			placeholder: 'Select assignees',
			cls: 'compact-filter-input compact-filter-assignees'
		});
		this.assigneesInput.readOnly = true;

		// Create clear button
		this.clearButton = inputWrapper.createEl('button', {
			cls: 'compact-filter-clear-btn',
			title: 'Clear assignees'
		});
		const clearIcon = this.clearButton.createEl('span', { cls: 'compact-filter-clear-icon' });
		setIcon(clearIcon, 'x');
		this.clearButton.style.display = 'none'; // Initially hidden

        // Create tooltip for showing full list
		this.tooltip = inputWrapper.createDiv('assignee-tooltip');
		this.tooltip.style.display = 'none';

        // Add hover events for tooltip
		let hoverTimeout: number | null = null;
		inputWrapper.addEventListener('mouseenter', () => {
			const selectedAssignees = this.getSelectedAssignees();
			if (selectedAssignees.length > 3) {
				if (hoverTimeout) clearTimeout(hoverTimeout);
				hoverTimeout = window.setTimeout(() => {
					this.tooltip.style.display = 'block';
				}, 500);
			}
		});
		inputWrapper.addEventListener('mouseleave', () => {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout);
				hoverTimeout = null;
			}
			this.tooltip.style.display = 'none';
		});

        // Initial display update
		this.updateDisplay();

		// Click on input opens the assignee selector if provided
		this.assigneesInput.onclick = () => {
			this.showAssigneeSelector(() => {
				this.updateDisplay();
			});
		};

		// Clear button click event to remove assignees
		this.clearButton.onclick = (e: MouseEvent) => {
			e.stopPropagation();
			this.callbacks.updateFilters({ people: [], companies: [] });
			this.currentFilters.people = [];
			this.currentFilters.companies = [];
			this.updateDisplay();
		};
	}

	updateDisplay(): void {
		const selectedAssignees = this.getSelectedAssignees();
        console.log('Updating assignees display:', selectedAssignees.length, selectedAssignees);
		if (selectedAssignees.length === 0) {
			this.assigneesInput.value = '';
			this.tooltip.style.display = 'none';
		} else if (selectedAssignees.length <= 3) {
			this.assigneesInput.value = selectedAssignees.join(', ');
			this.tooltip.style.display = 'none';
		} else {
			this.assigneesInput.value = `${selectedAssignees.length} selected`;
			this.tooltip.innerHTML = selectedAssignees.join(', ');
            this.tooltip.style.display = 'block';
			// Tooltip visibility is controlled by hover events.
		}
		this.clearButton.style.display = selectedAssignees.length > 0 ? 'block' : 'none';
	}

	private getSelectedAssignees(): string[] {
		return [
			...(this.currentFilters.people || []),
			...(this.currentFilters.companies || [])
		];
	}

	// Allow external updates to the internal filter state.
	setFilters(filters: AssigneesFilterOptions): void {
		this.currentFilters = filters;
		this.updateDisplay();
	}

	// New method: moved showAssigneeSelector into the component.
	private showAssigneeSelector(updateCallback: () => void): void {
		import('../../modals/contact-company-picker-modal').then(({ ContactCompanyPickerModal }) => {
			new ContactCompanyPickerModal(this.plugin.app, this.plugin, (selectedAssignee: string) => {
				console.log('Selected assignee:', selectedAssignee);
				const isPerson = selectedAssignee.startsWith(this.plugin.settings.contactSymbol);
				const isCompany = selectedAssignee.startsWith(this.plugin.settings.companySymbol);
				if (isPerson) {
					const currentPeople = this.currentFilters.people || [];
					console.log('Current people before update:', currentPeople);
					const newPeople = currentPeople.includes(selectedAssignee)
						? currentPeople.filter(p => p !== selectedAssignee)
						: [...currentPeople, selectedAssignee];
					console.log('New people after update:', newPeople);
					this.callbacks.updateFilters({ people: newPeople });
					this.currentFilters.people = newPeople;
				} else if (isCompany) {
					const currentCompanies = this.currentFilters.companies || [];
					const newCompanies = currentCompanies.includes(selectedAssignee)
						? currentCompanies.filter(c => c !== selectedAssignee)
						: [...currentCompanies, selectedAssignee];
					this.callbacks.updateFilters({ companies: newCompanies });
					this.currentFilters.companies = newCompanies;
				}
				updateCallback();
			}, { mode: 'readonly', keepOpen: true }).open();
		});
	}
}