import { EditorSuggest } from 'obsidian';
export class AssignmentSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onTrigger(cursor, editor) {
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
    getSuggestions(context) {
        const { query } = context;
        const suggestions = [];
        if (query.startsWith(this.plugin.settings.contactSymbol)) {
            const contacts = this.plugin.taskAssignmentService.getCachedContacts();
            const searchTerm = query.substring(1).toLowerCase();
            suggestions.push(...contacts
                .filter(contact => contact.toLowerCase().includes(searchTerm))
                .map(contact => `${this.plugin.settings.contactSymbol}${contact}`));
            if ('me'.includes(searchTerm)) {
                suggestions.unshift(`${this.plugin.settings.contactSymbol}me`);
            }
        }
        else if (query.startsWith(this.plugin.settings.companySymbol)) {
            const companies = this.plugin.taskAssignmentService.getCachedCompanies();
            const searchTerm = query.substring(1).toLowerCase();
            suggestions.push(...companies
                .filter(company => company.toLowerCase().includes(searchTerm))
                .map(company => `${this.plugin.settings.companySymbol}${company}`));
        }
        return suggestions;
    }
    renderSuggestion(suggestion, el) {
        el.createDiv({ text: suggestion });
    }
    selectSuggestion(suggestion, evt) {
        const { context } = this;
        if (!context)
            return;
        const { editor } = context;
        const isContact = suggestion.startsWith(this.plugin.settings.contactSymbol);
        const directory = isContact ? this.plugin.settings.contactDirectory : this.plugin.settings.companyDirectory;
        const cleanName = suggestion.substring(1);
        const link = `[[${directory}/${cleanName}|${suggestion}]]`;
        editor.replaceRange(link, context.start, context.end);
    }
}
