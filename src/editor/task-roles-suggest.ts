import {
    EditorSuggest,
    EditorPosition,
    EditorSuggestTriggerInfo,
    EditorSuggestContext,
    Editor,
    App
} from 'obsidian';
import type TaskRolesPlugin from '../main';

export class TaskRolesSuggest extends EditorSuggest<string> {
    plugin: TaskRolesPlugin;

    constructor(app: App, plugin: TaskRolesPlugin) {
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
            const pattern = new RegExp(`${this.plugin.taskRolesService.escapeRegex(role.icon)}\\s+([${this.plugin.taskRolesService.escapeRegex(this.plugin.settings.contactSymbol)}${this.plugin.taskRolesService.escapeRegex(this.plugin.settings.companySymbol)}][^\\s]*)$`);
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

    getSuggestions(context: EditorSuggestContext): string[] {
        const { query } = context;
        const suggestions: string[] = [];

        if (query.startsWith(this.plugin.settings.contactSymbol)) {
            const contacts = this.plugin.taskRolesService.getCachedContacts();
            const searchTerm = query.substring(1).toLowerCase();

            suggestions.push(...contacts
                .filter((contact: string) => contact.toLowerCase().includes(searchTerm))
                .map((contact: any) => `${this.plugin.settings.contactSymbol}${contact}`)
            );

            if ('me'.includes(searchTerm)) {
                suggestions.unshift(`${this.plugin.settings.contactSymbol}me`);
            }
        } else if (query.startsWith(this.plugin.settings.companySymbol)) {
            const companies = this.plugin.taskRolesService.getCachedCompanies();
            const searchTerm = query.substring(1).toLowerCase();

            suggestions.push(...companies
                .filter((company: string) => company.toLowerCase().includes(searchTerm))
                .map((company: any) => `${this.plugin.settings.companySymbol}${company}`)
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