import { setIcon } from 'obsidian';
import { ViewFilters } from '../../types';
import type TaskRolesPlugin from '../../main';

export class SearchFilter {
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
		const searchGroup = container.createDiv('compact-filter-group');
		searchGroup.createEl('label', { text: '', cls: 'compact-filter-label' });
		
		const searchIcon = searchGroup.createEl('span', { cls: 'compact-filter-icon' });
		setIcon(searchIcon, 'search');
		
		const searchContainer = searchGroup.createDiv('compact-search-container');
		
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			cls: 'compact-filter-input',
			placeholder: 'Search...'
		});
		
		// Debounce timer variable
		let debounceTimer: number | null = null;
		
		// Replace immediate search update with debounced callback
		searchInput.oninput = () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = window.setTimeout(() => {
				const value = searchInput.value;
				// Only trigger an update if there are at least 3 characters,
				// otherwise set to an empty search.
				if (value.length >= 3) {
					this.updateFiltersCallback({ textSearch: value });
				} else {
					this.updateFiltersCallback({ textSearch: '' });
				}
			}, 300);
		};
		
		const updateDisplay = () => {
			searchInput.value = this.currentFilters.textSearch || '';
		};
		
		updateDisplay();
		return updateDisplay;
	}
}
