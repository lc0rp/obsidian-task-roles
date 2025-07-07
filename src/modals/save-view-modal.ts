import { App, Modal, Setting, Notice } from 'obsidian';
import { ViewLayout, ViewFilters, SortOption } from '../types';
import { ViewConfigurationService } from '../services/view-configuration.service';

export class SaveViewModal extends Modal {
	private viewConfigService: ViewConfigurationService;
	private layout: ViewLayout;
	private filters: ViewFilters;
	private sortBy: SortOption;
	private onSave: () => void;

	constructor(
		app: App,
		viewConfigService: ViewConfigurationService,
		layout: ViewLayout,
		filters: ViewFilters,
		sortBy: SortOption,
		onSave: () => void
	) {
		super(app);
		this.viewConfigService = viewConfigService;
		this.layout = layout;
		this.filters = filters;
		this.sortBy = sortBy;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Save View Configuration' });

		let viewName = '';
		const existingViews = this.viewConfigService.getAllViewConfigurations();

		// View name input with datalist for autocomplete
		new Setting(contentEl)
			.setName('Configuration Name')
			.setDesc('Enter a name for this view configuration. Select from existing names to overwrite.')
			.addText(text => {
				const input = text.inputEl;
				input.setAttribute('list', 'existing-views');
				input.setAttribute('placeholder', 'My Custom View');
				
				// Create datalist for autocomplete
				const datalist = contentEl.createEl('datalist');
				datalist.id = 'existing-views';
				
				for (const view of existingViews) {
					const option = datalist.createEl('option');
					option.value = view.name;
				}
				
				text.setValue(viewName)
					.onChange(value => {
						viewName = value;
						// Check if this name exists
						const exists = existingViews.some(v => v.name === value);
						this.updateOverwriteWarning(exists);
					});
				
				return text;
			});

		// Overwrite warning (initially hidden)
		const overwriteWarning = contentEl.createDiv('overwrite-warning');
		overwriteWarning.style.display = 'none';
		overwriteWarning.style.color = 'var(--text-warning)';
		overwriteWarning.style.marginTop = '8px';
		overwriteWarning.style.fontSize = '14px';
		overwriteWarning.setText('⚠️ This will overwrite an existing configuration with the same name.');

		// Show current configuration summary
		const summaryEl = contentEl.createDiv('view-config-summary');
		summaryEl.createEl('h3', { text: 'Current Configuration' });
		
		const configList = summaryEl.createEl('ul');
		configList.createEl('li').setText(`Layout: ${this.layout}`);
		configList.createEl('li').setText(`Sort by: ${this.sortBy.field} (${this.sortBy.direction})`);
		
		// Show active filters
		const activeFilters = this.getActiveFiltersDescription();
		if (activeFilters.length > 0) {
			const filtersItem = configList.createEl('li');
			filtersItem.setText('Active Filters:');
			const filtersList = filtersItem.createEl('ul');
			for (const filter of activeFilters) {
				filtersList.createEl('li').setText(filter);
			}
		} else {
			configList.createEl('li').setText('No active filters');
		}

		// Buttons
		const buttonContainer = contentEl.createDiv('modal-button-container');
		
		const saveButton = buttonContainer.createEl('button', { 
			text: 'Save',
			cls: 'mod-cta'
		});
		saveButton.onclick = async () => {
			if (!viewName.trim()) {
				this.showError('Please enter a configuration name');
				return;
			}

			try {
				const exists = existingViews.some(v => v.name === viewName.trim());
				const result = await this.viewConfigService.saveViewConfiguration(
					viewName.trim(),
					this.layout,
					this.filters,
					this.sortBy,
					exists // Allow overwrite if name exists
				);

				if (result.success) {
					new Notice(exists ? 'View updated successfully' : 'View saved successfully');
					this.onSave();
					this.close();
				} else {
					this.showError(result.error || 'Failed to save view configuration');
				}
			} catch (error) {
				console.error('Error saving view configuration:', error);
				this.showError('Failed to save view configuration');
			}
		};

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.onclick = () => this.close();
	}

	private getActiveFiltersDescription(): string[] {
		const descriptions: string[] = [];

		if (this.filters.textSearch) {
			descriptions.push(`Text search: "${this.filters.textSearch}"`);
		}

		if (this.filters.statuses && this.filters.statuses.length > 0) {
			descriptions.push(`Status: ${this.filters.statuses.join(', ')}`);
		}

		if (this.filters.priorities && this.filters.priorities.length > 0) {
			descriptions.push(`Priority: ${this.filters.priorities.join(', ')}`);
		}

		if (this.filters.roles && this.filters.roles.length > 0) {
			descriptions.push(`Roles: ${this.filters.roles.join(', ')}`);
		}

		if (this.filters.people && this.filters.people.length > 0) {
			descriptions.push(`People: ${this.filters.people.join(', ')}`);
		}

		if (this.filters.companies && this.filters.companies.length > 0) {
			descriptions.push(`Companies: ${this.filters.companies.join(', ')}`);
		}

		if (this.filters.tags && this.filters.tags.length > 0) {
			descriptions.push(`Tags: ${this.filters.tags.join(', ')}`);
		}

		if (this.filters.dateRange) {
			const dateDesc = [];
			if (this.filters.dateRange.from) {
				dateDesc.push(`from ${this.filters.dateRange.from.toLocaleDateString()}`);
			}
			if (this.filters.dateRange.to) {
				dateDesc.push(`to ${this.filters.dateRange.to.toLocaleDateString()}`);
			}
			if (this.filters.dateRange.includeNotSet) {
				dateDesc.push('including tasks without dates');
			}
			if (dateDesc.length > 0) {
				descriptions.push(`Date range: ${dateDesc.join(', ')}`);
			}
		}

		return descriptions;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private updateOverwriteWarning(exists: boolean): void {
		const warning = this.contentEl.querySelector('.overwrite-warning') as HTMLElement;
		if (warning) {
			warning.style.display = exists ? 'block' : 'none';
		}
	}

	private showError(message: string): void {
		// Remove existing error
		const errorEl = this.contentEl.querySelector('.view-name-error');
		if (errorEl) {
			errorEl.remove();
		}

		// Show new error
		const error = this.contentEl.createDiv('view-name-error');
		error.setText(message);
		error.style.color = 'var(--text-error)';
		error.style.marginTop = '8px';
		error.style.fontSize = '14px';
	}
} 