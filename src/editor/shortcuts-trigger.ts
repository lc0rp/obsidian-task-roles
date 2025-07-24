import { ViewPlugin } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { App, MarkdownView } from "obsidian";
import { TaskRolesPluginSettings, Role } from "../types";
import { TaskUtils } from "../utils/task-regex";

export function shortcutsTrigger(app: App, settings: TaskRolesPluginSettings) {
	return ViewPlugin.fromClass(
		class {
			constructor(readonly view: EditorView) {
				this.onKey = this.onKey.bind(this);
				view.dom.addEventListener("keydown", this.onKey, true); // capture phase
			}

			onKey(e: KeyboardEvent) {
				const activeView =
					app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const isTaskLine = TaskUtils.isTaskCaseInsensitive(line);
				const isInTaskBlock = this.isInTaskCodeBlock(
					editor,
					cursor.line
				);

				// Only trigger inside a task line or task/dataview code block
				if (!isTaskLine && !isInTaskBlock) {
					return;
				}

				// Handle direct role shortcuts (\d, \a, \c, \i)
				const visibleRoles = settings.roles.filter(
					(role) =>
						!role.isDefault ||
						!settings.hiddenDefaultRoles.includes(role.id)
				);

				// Check if this key matches a role shortcut and we have a backslash before cursor
				const beforeCursor = line.substring(0, cursor.ch);
				if (
					beforeCursor.endsWith("\\") &&
					this.isRoleShortcutKey(e.key, visibleRoles)
				) {
					const role = visibleRoles.find(
						(r) => r.shortcut === e.key.toLowerCase()
					);
					if (role) {
						e.stopPropagation();
						e.preventDefault();
						this.insertRoleDirectly(
							role,
							editor,
							cursor,
							isInTaskBlock
						);
					}
				}
			}

			private selectRole(
				role: Role,
				editor: any,
				cursor: any,
				isInTaskBlock: boolean
			) {
				const replacement = isInTaskBlock
					? `${role.icon} = `
					: `[${role.icon}:: ]`;

				// Replace the backslash with the role
				const startPos = { line: cursor.line, ch: cursor.ch - 1 };
				editor.replaceRange(replacement, startPos, cursor);

				// Position cursor
				const cursorPos = {
					line: cursor.line,
					ch:
						cursor.ch -
						1 +
						replacement.length -
						(isInTaskBlock ? 0 : 1),
				};
				editor.setCursor(cursorPos);
			}

			/**
			 * Check if the pressed key matches any role shortcut
			 */
			private isRoleShortcutKey(
				key: string,
				visibleRoles: Role[]
			): boolean {
				const lowerKey = key.toLowerCase();
				return visibleRoles.some((role) => role.shortcut === lowerKey);
			}

			/**
			 * Insert role directly without showing popup
			 */
			private insertRoleDirectly(
				role: Role,
				editor: any,
				cursor: any,
				isInTaskBlock: boolean
			) {
				const line = editor.getLine(cursor.line);
				const existingRoleIds = TaskUtils.getExistingRoles(line, [
					role,
				]);

				// Check if this role already exists on the line
				if (existingRoleIds.includes(role.id)) {
					// Role already exists, position cursor for adding assignees
					const cursorInfo = TaskUtils.findRoleCursorPosition(
						line,
						role
					);
					if (cursorInfo) {
						// Remove the backslash trigger
						const backslashPos = cursor.ch - 1;
						const startPos = {
							line: cursor.line,
							ch: backslashPos,
						};
						editor.replaceRange("", startPos, cursor);

						// Position cursor at the role
						// Only adjust for removed backslash if it was before the role position
						let cursorPos = {
							line: cursor.line,
							ch: backslashPos < cursorInfo.position 
								? cursorInfo.position - 1 
								: cursorInfo.position,
						};

						// If there are existing assignees, add separator and space
						if (cursorInfo.needsSeparator) {
							editor.replaceRange(", ", cursorPos, cursorPos);
							cursorPos.ch += 2;
						} else if (cursorInfo.position > 0) {
							// Add space if no assignees yet
							editor.replaceRange(" ", cursorPos, cursorPos);
							cursorPos.ch += 1;
						}

						editor.setCursor(cursorPos);
						return;
					}
				}

				// Role doesn't exist, create new role assignment
				const replacement = isInTaskBlock
					? `${role.icon} = `
					: `[${role.icon}:: ]`;

				// Remove the backslash trigger first
				const startPos = { line: cursor.line, ch: cursor.ch - 1 };
				editor.replaceRange("", startPos, cursor);

				// Get the updated line after backslash removal and find insertion point
				const updatedLine = editor.getLine(cursor.line);
				const currentCursorPos = cursor.ch - 1; // Position after backslash removal
				const legalInsertionPos =
					TaskUtils.findNearestLegalInsertionPoint(
						updatedLine,
						currentCursorPos
					);

				// Check if we need to add spacing around the insertion
				let finalReplacement = replacement;

				// Check if inserting after a role assignment (need space before)
				if (legalInsertionPos > 0 && updatedLine[legalInsertionPos - 1] === ']') {
					// Check if it's not inside a wikilink by looking for role assignment pattern
					const beforePos = legalInsertionPos - 1;
					const textBefore = updatedLine.substring(0, beforePos + 1);
					
					// Only add space if this looks like the end of a role assignment, not a wikilink
					if (textBefore.match(/\[.*::.*\]$/)) {
						finalReplacement = ' ' + replacement;
					}
				}

				// Check if inserting before a role assignment (need space after)
				if (legalInsertionPos < updatedLine.length && updatedLine[legalInsertionPos] === '[') {
					// Check if it's the start of a role assignment
					const textAfter = updatedLine.substring(legalInsertionPos);
					if (textAfter.match(/^\[[^[\]]*::/)) {
						finalReplacement = finalReplacement + ' ';
					}
				}

				// Insert the role at the legal position
				const insertPos = {
					line: cursor.line,
					ch: legalInsertionPos,
				};

				editor.replaceRange(finalReplacement, insertPos, insertPos);

				// Position final cursor
				const finalCursorPos = {
					line: cursor.line,
					ch:
						legalInsertionPos +
						finalReplacement.length -
						(isInTaskBlock ? 0 : 1),
				};
				editor.setCursor(finalCursorPos);
			}

			private isInTaskCodeBlock(editor: any, line: number): boolean {
				// Simple implementation - check for task code blocks
				let inside = false;
				let lang = "";

				for (let i = 0; i <= line; i++) {
					const text = editor.getLine(i).trim();
					const match = text.match(/^```([\w-]*)/);

					if (match) {
						const currentLang = (match[1] || "").toLowerCase();

						if (!inside) {
							inside = true;
							lang = currentLang;
						} else {
							inside = false;
							lang = "";
						}
					}
				}

				return inside && (lang === "tasks" || lang === "dataview");
			}

			destroy() {
				this.view.dom.removeEventListener("keydown", this.onKey, true);
			}
		}
	);
}
