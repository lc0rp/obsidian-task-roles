import { EditorSuggest } from 'obsidian';
import { TaskUtils } from '../utils/task-regex';
/**
 * Suggests roles when typing a backslash followed by the role shortcut.
 * Inserts a dataview inline field like `[🚗:: ]` with the cursor positioned
 * before the closing bracket.
 */
export class RoleSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.app = app;
        this.plugin = plugin;
    }
    onTrigger(cursor, editor) {
        const line = editor.getLine(cursor.line);
        const before = line.substring(0, cursor.ch);
        // Check if we're in a task code block or on a task line
        const isInTaskBlock = this.isInTaskBlock(editor, cursor.line);
        const isTaskLine = TaskUtils.isTaskLine(line);
        // Only trigger if we're in a task code block or on a task line
        if (!isInTaskBlock && !isTaskLine) {
            return null;
        }
        const shortcuts = this.plugin.getVisibleRoles()
            .map(r => r.shortcut)
            .filter((s) => !!s)
            .map(s => this.plugin.taskAssignmentService.escapeRegex(s))
            .join('');
        const pattern = shortcuts
            ? new RegExp(`\\\\(?:([${shortcuts}]?)|)$`)
            : /\\$/;
        const match = before.match(pattern);
        if (!match) {
            return null;
        }
        const query = match[1];
        const start = cursor.ch - query.length - 1; // include backslash
        return {
            start: { line: cursor.line, ch: start },
            end: cursor,
            query
        };
    }
    getSuggestions(context) {
        const query = context.query.toLowerCase();
        const roles = this.plugin.getVisibleRoles();
        return roles.filter(r => (r.shortcut ?? '').toLowerCase().startsWith(query));
    }
    renderSuggestion(role, el) {
        el.createSpan({ text: `${role.icon} ${role.name}` });
    }
    isInTaskBlock(editor, line) {
        return this.plugin.isInTaskCodeBlock(editor, line);
    }
    selectSuggestion(role) {
        const { editor, start } = this.context;
        const inTask = this.isInTaskBlock(editor, start.line);
        const replacement = inTask ? `${role.icon} = ` : `[${role.icon}:: ]`;
        editor.replaceRange(replacement, start, this.context.end);
        const cursorPos = {
            line: start.line,
            ch: start.ch + replacement.length
                - (inTask ? 0 : 1)
        };
        editor.setCursor(cursorPos);
    }
}
