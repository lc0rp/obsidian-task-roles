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
        const isTaskLine = TaskUtils.isTaskCaseInsensitive(line);

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
            ? new RegExp(`\\\\([${shortcuts}]*)$`)
            : /\\$/;

        const match = before.match(pattern);
        if (!match) {
            return null;
        }

        const query = match[1] || '';
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

        // Check if the query matches exactly one existing role
        const matchingExistingRole = roles.find(r => 
            (r.shortcut ?? '').toLowerCase() === query && existingRoleIds.includes(r.id)
        );

        if (matchingExistingRole) {
            // Role already exists and user typed exact shortcut - return it to trigger cursor positioning
            return [matchingExistingRole];
        }

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
        const line = editor.getLine(start.line);
        const existingRoleIds = TaskUtils.getExistingRoles(line, [role]);
        
        // Check if this role already exists on the line
        if (existingRoleIds.includes(role.id)) {
            // Role already exists, position cursor for adding assignees
            const cursorInfo = TaskUtils.findRoleCursorPosition(line, role);
            if (cursorInfo) {
                // Remove the backslash trigger
                editor.replaceRange('', start, this.context!.end);
                
                // Position cursor at the role
                let cursorPos = {
                    line: start.line,
                    ch: cursorInfo.position - (this.context!.end.ch - start.ch) // Adjust for removed trigger
                };

                // If there are existing assignees, add separator and space
                if (cursorInfo.needsSeparator) {
                    editor.replaceRange(', ', cursorPos, cursorPos);
                    cursorPos.ch += 2;
                } else if (cursorInfo.position > 0) {
                    // Add space if no assignees yet
                    editor.replaceRange(' ', cursorPos, cursorPos);
                    cursorPos.ch += 1;
                }

                editor.setCursor(cursorPos);
                return;
            }
        }

        // Role doesn't exist, create new role assignment
        const inTask = this.isInTaskBlock(editor, start.line);
        const replacement = inTask ? `${role.icon} = ` : `[${role.icon}:: ]`;
        
        // Find the nearest legal insertion point for the new role
        const triggerLength = this.context!.end.ch - start.ch;
        const currentCursorPos = start.ch + triggerLength; // Where cursor will be after removing trigger
        const legalInsertionPos = TaskUtils.findNearestLegalInsertionPoint(line, currentCursorPos);
        
        // Remove the trigger first
        editor.replaceRange('', start, this.context!.end);
        
        // If we need to move to a different position, do so
        if (legalInsertionPos !== currentCursorPos - triggerLength) {
            // Position cursor at legal insertion point
            const insertPos = {
                line: start.line,
                ch: legalInsertionPos
            };
            
            // Insert the role at the legal position
            editor.replaceRange(replacement, insertPos, insertPos);
            
            // Position final cursor
            const finalCursorPos = {
                line: start.line,
                ch: legalInsertionPos + replacement.length - (inTask ? 0 : 1)
            };
            editor.setCursor(finalCursorPos);
        } else {
            // Insert at current position (it's already legal)
            const insertPos = {
                line: start.line,
                ch: start.ch
            };
            
            editor.replaceRange(replacement, insertPos, insertPos);
            const cursorPos = {
                line: start.line,
                ch: start.ch + replacement.length - (inTask ? 0 : 1)
            };
            editor.setCursor(cursorPos);
        }
    }
}