import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo
} from 'obsidian';
import type TaskAssignmentPlugin from '../main';
import { Role } from '../types';

/**
 * Suggests roles when typing a backslash followed by the role shortcut.
 * Inserts a dataview inline field like `[🚗:: ]` with the cursor positioned
 * before the closing bracket.
 */
export class RoleSuggest extends EditorSuggest<Role> {
    constructor(public app: App, private plugin: TaskAssignmentPlugin) {
        super(app);
    }

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const before = line.substring(0, cursor.ch);
        const match = before.match(/\\([a-zA-Z]*)$/);
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
        return roles.filter(r => (r.shortcut ?? '').toLowerCase().startsWith(query));
    }

    renderSuggestion(role: Role, el: HTMLElement): void {
        el.createSpan({ text: `${role.icon} ${role.name}` });
    }

    selectSuggestion(role: Role): void {
        const { editor, start } = this.context!;
        const replacement = `[${role.icon}:: ]`;
        editor.replaceRange(replacement, start, this.context!.end);
        const cursorPos = {
            line: start.line,
            ch: start.ch + replacement.length - 1
        };
        editor.setCursor(cursorPos);
    }
}

