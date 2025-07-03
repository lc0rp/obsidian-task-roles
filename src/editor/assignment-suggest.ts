import { 
	EditorSuggest,
	EditorPosition,
	EditorSuggestTriggerInfo,
	EditorSuggestContext,
	Editor,
	App
} from 'obsidian';
import type TaskAssignmentPlugin from '../main';

export class AssignmentSuggest extends EditorSuggest<string> {
	plugin: TaskAssignmentPlugin;

	constructor(app: App, plugin: TaskAssignmentPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);
		
		// Check if we're in a task line
		if (!/^\s*- \[[ x]\]/.test(line)) {
			return null;
		}
		
		// Look for role icon followed by space and @ or +
		const roles = this.plugin.getVisibleRoles();
		for (const role of roles) {
			const pattern = new RegExp(`${this.plugin.taskAssignmentService.escapeRegex(role.icon)}\\s+([${this.plugin.taskAssignmentService.escapeRegex(this.plugin.settings.contactSymbol)}${this.plugin.taskAssignmentService.escapeRegex(this.plugin.settings.companySymbol)}][^\\s]*)$`);
			const match = beforeCursor.match(pattern);
			
			if (match) {
				const query = match[1];
				const start = cursor.ch - query.length;
				return {
					start: { line: cursor.line, ch: start },
					end: cursor,
					query
				};
			}
		}
		
		return null;
	}

	async getSuggestions(context: EditorSuggestContext): Promise<string[]> {
		const { query } = context;
		const suggestions: string[] = [];
		
		if (query.startsWith(this.plugin.settings.contactSymbol)) {
			const contacts = await this.plugin.taskAssignmentService.getContactsAndCompanies(this.plugin.settings.contactSymbol);
			const searchTerm = query.substring(1).toLowerCase();
			
			suggestions.push(...contacts
				.filter(contact => contact.toLowerCase().includes(searchTerm))
				.map(contact => `${this.plugin.settings.contactSymbol}${contact}`)
			);
			
			if ('me'.includes(searchTerm)) {
				suggestions.unshift(`${this.plugin.settings.contactSymbol}me`);
			}
		} else if (query.startsWith(this.plugin.settings.companySymbol)) {
			const companies = await this.plugin.taskAssignmentService.getContactsAndCompanies(this.plugin.settings.companySymbol);
			const searchTerm = query.substring(1).toLowerCase();
			
			suggestions.push(...companies
				.filter(company => company.toLowerCase().includes(searchTerm))
				.map(company => `${this.plugin.settings.companySymbol}${company}`)
			);
		}
		
		return suggestions;
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		el.createDiv({ text: suggestion });
	}

	selectSuggestion(suggestion: string, evt: MouseEvent | KeyboardEvent): void {
		const { context } = this;
		if (!context) return;
		
		const { editor } = context;
		const isContact = suggestion.startsWith(this.plugin.settings.contactSymbol);
		const directory = isContact ? this.plugin.settings.contactDirectory : this.plugin.settings.companyDirectory;
		const cleanName = suggestion.substring(1);
		const link = `[[${directory}/${cleanName}|${suggestion}]]`;
		
		editor.replaceRange(link, context.start, context.end);
	}
} 