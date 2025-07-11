import { Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { TaskAssignmentWidget } from '../components/task-assignment-widget';
export const taskAssignmentExtension = (plugin) => ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = this.buildDecorations(view);
    }
    update(update) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }
    buildDecorations(view) {
        const builder = new RangeSetBuilder();
        for (const { from, to } of view.visibleRanges) {
            for (let pos = from; pos <= to;) {
                const line = view.state.doc.lineAt(pos);
                const lineText = line.text;
                // Check if this line is a task (contains checkbox)
                const taskRegex = /^\s*[-*+]\s*\[[ xX]\]/;
                if (taskRegex.test(lineText)) {
                    // Check if there's content after the checkbox
                    const checkboxMatch = lineText.match(/^\s*[-*+]\s*\[[ xX]\]\s*/);
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
}, {
    decorations: (v) => v.decorations,
});
