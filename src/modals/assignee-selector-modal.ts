import { App, FuzzySuggestModal } from 'obsidian';
import type TaskAssignmentPlugin from '../main';

export class AssigneeSelectorModal extends FuzzySuggestModal<string> {
	plugin: TaskAssignmentPlugin;
	onSelect: (assignee: string) => void;
	contacts: string[] = [];
	companies: string[] = [];

	constructor(app: App, plugin: TaskAssignmentPlugin, onSelect: (assignee: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSelect = onSelect;
		this.setPlaceholder('Type @ or + to find assignee');
	}

	async onOpen() {
		super.onOpen();
		this.contacts = await this.plugin.taskAssignmentService.getContactsAndCompanies(this.plugin.settings.contactSymbol);
		this.companies = await this.plugin.taskAssignmentService.getContactsAndCompanies(this.plugin.settings.companySymbol);
	}

	getItems(): string[] {
		const query = this.inputEl.value;
		const items: string[] = [];
		
		if (query.startsWith(this.plugin.settings.contactSymbol)) {
			const searchTerm = query.substring(1).toLowerCase();
			items.push(...this.contacts
				.filter(contact => contact.toLowerCase().includes(searchTerm))
				.map(contact => `${this.plugin.settings.contactSymbol}${contact}`)
			);
			
			// Add @me as special case
			if ('me'.includes(searchTerm)) {
				items.unshift(`${this.plugin.settings.contactSymbol}me`);
			}
		} else if (query.startsWith(this.plugin.settings.companySymbol)) {
			const searchTerm = query.substring(1).toLowerCase();
			items.push(...this.companies
				.filter(company => company.toLowerCase().includes(searchTerm))
				.map(company => `${this.plugin.settings.companySymbol}${company}`)
			);
		}
		
		return items;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string): void {
		this.onSelect(item);
	}
} 