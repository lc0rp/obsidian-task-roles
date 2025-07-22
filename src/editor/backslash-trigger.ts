import { ViewPlugin } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { App, MarkdownView } from "obsidian";
import { TaskRolesPluginSettings, Role } from "../types";
import { TaskUtils } from "../utils/task-regex";

export function backslashTrigger(app: App, settings: TaskRolesPluginSettings) {
	return ViewPlugin.fromClass(
		class {
			constructor(readonly view: EditorView) {
				this.onKey = this.onKey.bind(this);
				view.dom.addEventListener("keydown", this.onKey, true); // capture phase
			}

			onKey(e: KeyboardEvent) {
				const activeView = app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const isTaskLine = TaskUtils.isTaskCaseInsensitive(line);
				const isInTaskBlock = this.isInTaskCodeBlock(editor, cursor.line);

				// Only trigger inside a task line or task/dataview code block
				if (!isTaskLine && !isInTaskBlock) {
					return;
				}

				// Handle colon trigger for popup menu
				if (e.key === ":") {
					e.stopPropagation(); // keep Tasks quiet
					e.preventDefault();
					this.openRoleSelector();
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
				if (beforeCursor.endsWith("\\") && this.isRoleShortcutKey(e.key, visibleRoles)) {
					const role = visibleRoles.find(r => r.shortcut === e.key.toLowerCase());
					if (role) {
						e.stopPropagation();
						e.preventDefault();
						this.insertRoleDirectly(role, editor, cursor, isInTaskBlock);
					}
				}
			}

			private openRoleSelector() {
				// Get the active markdown view
				const activeView =
					app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const cursor = editor.getCursor();

				// Check if we're in a task code block
				const isInTaskBlock = this.isInTaskCodeBlock(
					editor,
					cursor.line
				);

				// Get visible roles
				const visibleRoles = settings.roles.filter(
					(role) =>
						!role.isDefault ||
						!settings.hiddenDefaultRoles.includes(role.id)
				);

				// Get the current line to check for existing roles
				const line = editor.getLine(cursor.line);
				const existingRoleIds = TaskUtils.getExistingRoles(
					line,
					visibleRoles
				);

				// Filter out roles that are already present on the line
				const availableRoles = visibleRoles.filter(
					(role) => !existingRoleIds.includes(role.id)
				);

				// Create a simple popup with role options
				this.showRolePopup(
					availableRoles,
					editor,
					cursor,
					isInTaskBlock
				);
			}

			private showRolePopup(
				roles: Role[],
				editor: any,
				cursor: any,
				isInTaskBlock: boolean
			) {
				// Create popup container
				const popup = document.createElement("div");
				popup.className = "backslash-trigger-popup";
				popup.style.cssText = `
        position: fixed;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        box-shadow: var(--shadow-s);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        min-width: 200px;
      `;

				// Add role options
				roles.forEach((role, index) => {
					const option = document.createElement("div");
					option.className = "backslash-trigger-option";
					option.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        `;

					option.innerHTML = `<span>${role.icon}</span> <span>${role.name}</span>`;

					if (index === 0) {
						option.style.backgroundColor =
							"var(--background-modifier-hover)";
						option.classList.add("selected");
					}

					option.addEventListener("click", () => {
						this.selectRole(role, editor, cursor, isInTaskBlock);
						popup.remove();
					});

					popup.appendChild(option);
				});

				// Position popup near cursor
				const coords = editor.coordsAtPos(cursor);
				if (coords) {
					popup.style.left = coords.left + "px";
					popup.style.top = coords.bottom + 5 + "px";
				}

				document.body.appendChild(popup);

				// Handle keyboard navigation
				let selectedIndex = 0;
				const options = popup.querySelectorAll(
					".backslash-trigger-option"
				);

				const keyHandler = (e: KeyboardEvent) => {
					if (e.key === "Escape") {
						popup.remove();
						document.removeEventListener("keydown", keyHandler);
					} else if (e.key === "ArrowDown") {
						e.preventDefault();
						options[selectedIndex].classList.remove("selected");
						(
							options[selectedIndex] as HTMLElement
						).style.backgroundColor = "";
						selectedIndex = (selectedIndex + 1) % options.length;
						options[selectedIndex].classList.add("selected");
						(
							options[selectedIndex] as HTMLElement
						).style.backgroundColor =
							"var(--background-modifier-hover)";
					} else if (e.key === "ArrowUp") {
						e.preventDefault();
						options[selectedIndex].classList.remove("selected");
						(
							options[selectedIndex] as HTMLElement
						).style.backgroundColor = "";
						selectedIndex =
							(selectedIndex - 1 + options.length) %
							options.length;
						options[selectedIndex].classList.add("selected");
						(
							options[selectedIndex] as HTMLElement
						).style.backgroundColor =
							"var(--background-modifier-hover)";
					} else if (e.key === "Enter") {
						e.preventDefault();
						const selectedRole = roles[selectedIndex];
						this.selectRole(
							selectedRole,
							editor,
							cursor,
							isInTaskBlock
						);
						popup.remove();
						document.removeEventListener("keydown", keyHandler);
					}
				};

				document.addEventListener("keydown", keyHandler);

				// Close popup on click outside
				const clickHandler = (e: MouseEvent) => {
					if (!popup.contains(e.target as Node)) {
						popup.remove();
						document.removeEventListener("click", clickHandler);
						document.removeEventListener("keydown", keyHandler);
					}
				};

				setTimeout(() => {
					document.addEventListener("click", clickHandler);
				}, 0);
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
			private isRoleShortcutKey(key: string, visibleRoles: Role[]): boolean {
				const lowerKey = key.toLowerCase();
				return visibleRoles.some(role => role.shortcut === lowerKey);
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
				const existingRoleIds = TaskUtils.getExistingRoles(line, [role]);

				// Check if this role already exists on the line
				if (existingRoleIds.includes(role.id)) {
					// Role already exists, position cursor for adding assignees
					const cursorInfo = TaskUtils.findRoleCursorPosition(line, role);
					if (cursorInfo) {
						// Remove the backslash trigger
						const startPos = { line: cursor.line, ch: cursor.ch - 1 };
						editor.replaceRange('', startPos, cursor);
						
						// Position cursor at the role
						let cursorPos = {
							line: cursor.line,
							ch: cursorInfo.position - 1 // Adjust for removed backslash
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
				const replacement = isInTaskBlock ? `${role.icon} = ` : `[${role.icon}:: ]`;

				// Find the nearest legal insertion point for the new role
				const currentCursorPos = cursor.ch; // Current cursor position
				const legalInsertionPos = TaskUtils.findNearestLegalInsertionPoint(line, currentCursorPos);
				
				// Remove the backslash trigger first
				const startPos = { line: cursor.line, ch: cursor.ch - 1 };
				editor.replaceRange('', startPos, cursor);
				
				// If we need to move to a different position, do so
				if (legalInsertionPos !== currentCursorPos - 1) {
					// Position cursor at legal insertion point
					const insertPos = {
						line: cursor.line,
						ch: legalInsertionPos
					};
					
					// Insert the role at the legal position
					editor.replaceRange(replacement, insertPos, insertPos);
					
					// Position final cursor
					const finalCursorPos = {
						line: cursor.line,
						ch: legalInsertionPos + replacement.length - (isInTaskBlock ? 0 : 1)
					};
					editor.setCursor(finalCursorPos);
				} else {
					// Insert at current position (after removing backslash, it's legal)
					const insertPos = {
						line: cursor.line,
						ch: cursor.ch - 1
					};
					
					editor.replaceRange(replacement, insertPos, insertPos);
					const cursorPos = {
						line: cursor.line,
						ch: cursor.ch - 1 + replacement.length - (isInTaskBlock ? 0 : 1)
					};
					editor.setCursor(cursorPos);
				}
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
