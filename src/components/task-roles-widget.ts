import { WidgetType } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { MarkdownView, setIcon } from 'obsidian';
import type TaskRolesPlugin from '../main';

export class TaskRolesInlineWidget extends WidgetType {
    constructor(private plugin: TaskRolesPlugin, private lineNumber: number) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const iconContainer = document.createElement('span');
        iconContainer.className = 'task-roles-icon-container';
        const iconButton = iconContainer.createEl('button', { cls: 'task-roles-icon-button' });
        iconButton.setAttribute('aria-label', 'Assign task roles');
        iconButton.setAttribute('title', 'Assign task roles');
        setIcon(iconButton.createEl('span', { cls: 'task-roles-icon' }), 'users');

        iconButton.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                if (!this.plugin) {
                    console.warn('Task roles plugin not found.');
                    return false;
                }

                if (typeof this.lineNumber !== 'number' || this.lineNumber < 0) {
                    console.warn('Invalid line number: ', this.lineNumber);
                    return false;
                }

                const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView) {
                    console.warn('Active view not found');
                    return false;
                }

                const editor = activeView.editor;

                if (!editor) {
                    console.warn('Editor not found');
                    return false;
                }

                const cursor = editor.getCursor();

                // Set cursor to the line where the icon was clicked
                editor.setCursor({ line: this.lineNumber, ch: cursor.ch });

                // TODO: validate that the line is a task

                // Open the roles modal
                this.plugin.openRolesModal(editor);

                return true;
            } catch (error) {
                console.error('Error triggering task roles from inline button: ', error);
            }
        });

        return iconContainer;
    }
}
