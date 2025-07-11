import { WidgetType } from '@codemirror/view';
import { MarkdownView, setIcon } from 'obsidian';
export class TaskAssignmentWidget extends WidgetType {
    constructor(plugin, lineNumber) {
        super();
        this.plugin = plugin;
        this.lineNumber = lineNumber;
    }
    toDOM(view) {
        const iconContainer = document.createElement('span');
        iconContainer.className = 'task-assignment-icon-container';
        const iconButton = iconContainer.createEl('button', { cls: 'task-assignment-icon-button' });
        iconButton.setAttribute('aria-label', 'Assign task roles');
        iconButton.setAttribute('title', 'Assign task roles');
        setIcon(iconButton.createEl('span', { cls: 'task-assignment-icon' }), 'users');
        iconButton.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                if (!this.plugin) {
                    console.warn('Task assignment plugin not found.');
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
                // Open the assignment modal
                this.plugin.openAssignmentModal(editor);
                return true;
            }
            catch (error) {
                console.error('Error triggering task assignment from inline button: ', error);
            }
        });
        return iconContainer;
    }
}
