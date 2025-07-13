import { App, FuzzySuggestModal } from 'obsidian';
import type TaskRolesPlugin from '../main';

export interface AssigneeSelectorOptions {
    mode: 'readonly' | 'add';
    keepOpen?: boolean;
}

export class AssigneeSelectorModal extends FuzzySuggestModal<string> {
    plugin: TaskRolesPlugin;
    onSelect: (assignee: string) => void;
    contacts: string[] = [];
    companies: string[] = [];
    options: AssigneeSelectorOptions;
    private currentQuery = '';
    private noResults = false; // Flag to indicate that the user pressed ↵ with no matches – create something new
    private disableClose = true; // Flag to prevent closing the modal as long as the user keeps making selections

    constructor(app: App, plugin: TaskRolesPlugin, onSelect: (assignee: string) => void, options: AssigneeSelectorOptions = { mode: 'add', keepOpen: false }) {
        super(app);
        this.plugin = plugin;
        this.onSelect = onSelect;
        this.options = options;
        this.updatePlaceholder();
    }

    private updatePlaceholder() {
        const contactSymbol = this.plugin.settings.contactSymbol;
        const companySymbol = this.plugin.settings.companySymbol;

        if (this.options.mode === 'readonly') {
            this.setPlaceholder(`Type ${contactSymbol}contact or ${companySymbol}company to search.`);
        } else {
            this.setPlaceholder(`Type ${contactSymbol}contact or ${companySymbol}company to search or create.`);
        }
    }

    async onOpen() {
        this.contacts = await this.plugin.taskRolesService.getContactsAndCompanies(this.plugin.settings.contactSymbol);
        this.companies = await this.plugin.taskRolesService.getContactsAndCompanies(this.plugin.settings.companySymbol);
        // Refresh suggestions after async data is loaded
        this.inputEl.dispatchEvent(new Event('input'));
    }

    getItems(): string[] {
        this.currentQuery = this.inputEl.value;
        const items: string[] = [];

        if (this.currentQuery.startsWith(this.plugin.settings.contactSymbol)) {
            const searchTerm = this.currentQuery.substring(1).toLowerCase().replace(/\s+/g, ' ').trim();

            // Add existing contacts that match
            items.push(...this.contacts
                .filter(contact => contact.toLowerCase().includes(searchTerm))
                .map(contact => `${this.plugin.settings.contactSymbol}${contact}`)
            );

            // Add @me as special case
            if ('me'.includes(searchTerm)) {
                if (!items.includes(`${this.plugin.settings.contactSymbol}me`)) {
                    items.unshift(`${this.plugin.settings.contactSymbol}me`);
                }
            }

        } else if (this.currentQuery.startsWith(this.plugin.settings.companySymbol)) {
            const searchTerm = this.currentQuery.substring(1).toLowerCase().replace(/\s+/g, ' ').trim();

            // Add existing companies that match
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

    getEmptyStateText(): string {
        const query = this.currentQuery;

        if (!query.startsWith(this.plugin.settings.contactSymbol) && !query.startsWith(this.plugin.settings.companySymbol)) {
            return `Start typing with ${this.plugin.settings.contactSymbol} or ${this.plugin.settings.companySymbol}.`;
        }

        if (this.options.mode === 'readonly') {
            return 'No results found!';
        }

        // In add mode, show creation hint
        if (query.startsWith(this.plugin.settings.contactSymbol)) {
            return 'No results found, press Enter to create a new contact.';
        } else if (query.startsWith(this.plugin.settings.companySymbol)) {
            return 'No results found, press Enter to create a new company.';
        }

        return 'No results found!';
    }

    onChooseItem(item: string): void {

        if (this.noResults) {
            // user pressed ↵ with no matches – create something new
            // Only allow creation in add mode
            if (this.options.mode !== 'add') {
                return;
            }
            this.noResults = false;  // Reset the noResults flag
        }

        this.onSelect(item); // This will trigger the onSelect callback, which will create the new contact/company if in add mode

        if (this.options.keepOpen) {
            this.disableClose = true; // Prevent closing the modal as long as the user keeps making selections

            // Clear the input but keep modal open
            this.inputEl.value = '';
            this.currentQuery = '';

            // Trigger input event to refresh suggestions
            this.inputEl.dispatchEvent(new Event('input'));
        }
    }

    /** Called automatically when the list is empty */
    onNoSuggestion() {
        super.onNoSuggestion();
        this.emptyStateText = 'No results found.';
        // Only allow creation in add mode
        if (this.options.mode === 'readonly') {
            return;
        }

        const query = this.currentQuery.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!query) {
            return;
        }

        if (this.plugin.settings.debug) {
            console.log("No suggestions for input: ", this.inputEl.value, " with query: ", query, " and query length ", query.length);
        }
        if (!query.startsWith(this.plugin.settings.contactSymbol) && !query.startsWith(this.plugin.settings.companySymbol)) {
            this.emptyStateText = `Start typing with ${this.plugin.settings.contactSymbol} or ${this.plugin.settings.companySymbol}.`;
            return;
        }

        // If the query is only one character, it is + or @, so return
        if (query.length === 1) {
            return;
        }

        if (this.plugin.settings.debug) {
            console.log("No results, setting noResults to true for ", this.inputEl.value, " with query ", query);
        }
        this.noResults = true;

        // In add mode, show creation hint
        if (query.startsWith(this.plugin.settings.contactSymbol)) {
            this.emptyStateText += ' Press ↵ to create a new contact.';
        } else if (query.startsWith(this.plugin.settings.companySymbol)) {
            this.emptyStateText += ' Press ↵ to create a new company.';
        }
    }

    close(): void {
        if (this.options.keepOpen && this.disableClose) {
            this.emptyStateText = 'Make another selection. All done? ESC or X twice to close.';
            this.disableClose = false; // Reset the disableClose flag, so the modal can be closed, as long as the user doesn't make another selection
            return;  // swallow the auto-close
        }
        super.close(); // otherwise shut down normally
    }
} 