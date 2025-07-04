import { App } from 'obsidian';
import { ViewConfiguration, ViewLayout, ViewFilters, SortOption } from '../types';
import type TaskAssignmentPlugin from '../main';

export class ViewConfigurationService {
	constructor(private app: App, private plugin: TaskAssignmentPlugin) {}

	async saveViewConfiguration(
		name: string,
		layout: ViewLayout,
		filters: ViewFilters,
		sortBy: SortOption,
		overwrite: boolean = false
	): Promise<{ success: boolean; error?: string }> {
		// Check if name already exists
		const existingIndex = this.plugin.settings.savedViews.findIndex(view => view.name === name);
		
		if (existingIndex !== -1 && !overwrite) {
			return { success: false, error: 'A view with this name already exists' };
		}

		const config: ViewConfiguration = {
			id: existingIndex !== -1 ? this.plugin.settings.savedViews[existingIndex].id : this.generateId(),
			name,
			layout,
			filters,
			sortBy,
			createdDate: existingIndex !== -1 ? this.plugin.settings.savedViews[existingIndex].createdDate : new Date()
		};

		if (existingIndex !== -1) {
			// Update existing view
			this.plugin.settings.savedViews[existingIndex] = config;
		} else {
			// Add new view
			this.plugin.settings.savedViews.push(config);
		}

		await this.plugin.saveSettings();
		return { success: true };
	}

	async updateViewConfiguration(
		id: string,
		updates: Partial<Omit<ViewConfiguration, 'id' | 'createdDate'>>
	): Promise<void> {
		const index = this.plugin.settings.savedViews.findIndex(view => view.id === id);
		if (index !== -1) {
			this.plugin.settings.savedViews[index] = {
				...this.plugin.settings.savedViews[index],
				...updates
			};
			await this.plugin.saveSettings();
		}
	}

	async deleteViewConfiguration(id: string): Promise<void> {
		this.plugin.settings.savedViews = this.plugin.settings.savedViews.filter(
			view => view.id !== id
		);
		await this.plugin.saveSettings();
	}

	getViewConfiguration(id: string): ViewConfiguration | undefined {
		return this.plugin.settings.savedViews.find(view => view.id === id);
	}

	getAllViewConfigurations(): ViewConfiguration[] {
		return [...this.plugin.settings.savedViews].sort((a, b) => 
			a.name.localeCompare(b.name)
		);
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}
} 