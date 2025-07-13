import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo
} from 'obsidian';
import type TaskRolesPlugin from '../main';
import { Role } from '../types';
import { TaskUtils } from '../utils/task-regex';

/**
 * Suggests roles when typing a backslash followed by the role shortcut.
 * Inserts a dataview inline field like `[🚗:: ]` with the cursor positioned
 * before the closing bracket.
 */
export class RoleSuggest extends EditorSuggest<Role> {
    constructor(public app: App, private plugin: TaskRolesPlugin) {
        super(app);
    }

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
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
            .filter((s): s is string => !!s)
            .map(s => this.plugin.taskRolesService.escapeRegex(s))
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

    getSuggestions(context: EditorSuggestContext): Role[] {
        const query = context.query.toLowerCase();
        const roles = this.plugin.getVisibleRoles();

        // Get the current line to check for existing roles
        const line = context.editor.getLine(context.start.line);
        const existingRoleIds = TaskUtils.getExistingRoles(line, roles);

        // Filter out roles that are already present on the line
        const availableRoles = roles.filter(role => !existingRoleIds.includes(role.id));

        // Filter by query
        return availableRoles.filter(r => (r.shortcut ?? '').toLowerCase().startsWith(query));
    }

    renderSuggestion(role: Role, el: HTMLElement): void {
        el.createSpan({ text: `${role.icon} ${role.name}` });
    }

    private isInTaskBlock(editor: Editor, line: number): boolean {
        return this.plugin.isInTaskCodeBlock(editor, line);
    }

    selectSuggestion(role: Role): void {
        const { editor, start } = this.context!;
        const inTask = this.isInTaskBlock(editor, start.line);
        const replacement = inTask ? `${role.icon} = ` : `[${role.icon}:: ]`;
        editor.replaceRange(replacement, start, this.context!.end);
        const cursorPos = {
            line: start.line,
            ch: start.ch + replacement.length
                - (inTask ? 0 : 1)
        };
        editor.setCursor(cursorPos);
    }
}