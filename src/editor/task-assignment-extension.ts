import {
    EditorView,
    Decoration,
    DecorationSet,
    ViewPlugin,
    ViewUpdate
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { TaskAssignmentWidget } from '../components/task-assignment-widget';
import { TaskUtils } from '../utils/task-regex';
import type TaskAssignmentPlugin from '../main';

export const taskAssignmentExtension = (plugin: TaskAssignmentPlugin) => ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            for (const { from, to } of view.visibleRanges) {
                for (let pos = from; pos <= to;) {
                    const line = view.state.doc.lineAt(pos);
                    const lineText = line.text;

                    // Check if this line is a task (contains checkbox)
                    if (TaskUtils.isTaskCaseInsensitive(lineText)) {
                        // Check if there's content after the checkbox
                        const checkboxMatch = TaskUtils.getCheckboxPrefix(lineText);
                        if (checkboxMatch) {
                            const afterCheckbox = lineText.substring(checkboxMatch[0].length);

                            // Only add icon if there's content after the checkbox
                            if (afterCheckbox.trim().length > 0) {
                                const lineNumber = view.state.doc.lineAt(pos).number - 1; // Convert to 0-based
                                const widget = Decoration.widget({
                                    widget: new TaskAssignmentWidget(plugin, lineNumber),
                                    side: 1, // Place after the line content
                                });

                                builder.add(line.to, line.to, widget);
                            }
                        }
                    }

                    pos = line.to + 1;
                }
            }

            return builder.finish();
        }
    },
    {
        decorations: (v) => v.decorations,
    }
); 