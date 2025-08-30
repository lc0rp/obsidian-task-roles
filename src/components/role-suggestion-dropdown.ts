import { App, Editor, MarkdownView } from "obsidian";
import { Role, TaskRolesPluginSettings } from "../types";

export class RoleSuggestionDropdown {
	private app: App;
	private settings: TaskRolesPluginSettings;
	private getVisibleRoles: () => Role[];
	private dropdownElement: HTMLElement | null = null;
	private isVisible = false;
	private availableRoles: Role[] = [];
	private selectedIndex = 0;
	private currentFilter = "";
	private triggerPos: { line: number; ch: number } | null = null;
	private onInsertCallback: ((role: Role) => void) | null = null;
	private autoHideTimeout: number | null = null;

	constructor(app: App, settings: TaskRolesPluginSettings, getVisibleRoles: () => Role[]) {
		this.app = app;
		this.settings = settings;
		this.getVisibleRoles = getVisibleRoles;
		this.handleKeydown = this.handleKeydown.bind(this);
		this.handleClickOutside = this.handleClickOutside.bind(this);
	}

	show(
		cursor: { line: number; ch: number },
		existingRoles: string[],
		onInsert: (role: Role) => void
	): boolean {
		if (this.isVisible) {
			this.hide();
		}

		// Filter out hidden and existing roles
		this.availableRoles = this.getAvailableRoles(existingRoles);

		if (this.availableRoles.length === 0) {
			return false;
		}

		this.triggerPos = cursor;
		this.selectedIndex = 0;
		this.currentFilter = "";
		this.onInsertCallback = onInsert;
		this.isVisible = true;

		this.createDropdownElement();

		const editor =
			this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor || !this.dropdownElement) {
			this.hide();
			return false;
		}
		cursor = editor.getCursor();
		this.positionDropdown(editor, cursor);
		this.renderRoles();
		this.attachEventListeners();

		// Bug fix #2: Add timeout to prevent stuck popups (30 seconds)
		this.autoHideTimeout = window.setTimeout(() => {
			this.hide();
		}, 30000);

		return true;
	}

	hide(): void {
		if (!this.isVisible) return;

		this.isVisible = false;
		this.detachEventListeners();

		// Bug fix #3: Clear timeout when manually closed
		if (this.autoHideTimeout !== null) {
			window.clearTimeout(this.autoHideTimeout);
			this.autoHideTimeout = null;
		}

		if (this.dropdownElement) {
			this.dropdownElement.remove();
			this.dropdownElement = null;
		}

		this.availableRoles = [];
		this.selectedIndex = 0;
		this.currentFilter = "";
		this.triggerPos = null;
		this.onInsertCallback = null;
	}

	isShowing(): boolean {
		return this.isVisible;
	}

	handleKeydown(e: KeyboardEvent): boolean {
		if (!this.isVisible) return false;

		switch (e.key) {
			case "Escape":
				e.preventDefault();
				e.stopPropagation();
				this.hide();
				return true;

			case "ArrowUp":
				e.preventDefault();
				e.stopPropagation();
				this.selectPrevious();
				return true;

			case "ArrowDown":
				e.preventDefault();
				e.stopPropagation();
				this.selectNext();
				return true;

			case "Enter":
				e.preventDefault();
				e.stopPropagation();
				this.insertSelectedRole();
				return true;

			case "Backspace":
				return this.handleBackspace();

			default:
				// Handle typing for filtering
				if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
					this.updateFilter(this.currentFilter + e.key.toLowerCase());
					return true;
				}
				break;
		}

		return false;
	}

	private handleBackspace(): boolean {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return false;

		const editor = activeView.editor;
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);

		// Check if user is backspacing over the double backslash trigger
		if (beforeCursor.endsWith("\\\\")) {
			// User is about to remove the trigger, hide dropdown
			this.hide();
			return false; // Let the backspace proceed
		}

		// Update filter by removing last character
		if (this.currentFilter.length > 0) {
			this.updateFilter(this.currentFilter.slice(0, -1));
			return true; // Prevent the backspace from affecting the editor
		}

		return false;
	}

	private updateFilter(filter: string): void {
		this.currentFilter = filter;

		if (filter === "") {
			// Show all available roles when filter is empty
			this.availableRoles = this.getAvailableRoles([]);
		} else {
			// Filter roles by name
			const allRoles = this.getAvailableRoles([]);
			const filteredRoles = allRoles.filter((role) =>
				role.name.toLowerCase().startsWith(filter.toLowerCase())
			);

			// If no matches, show all roles (as specified in requirements)
			this.availableRoles =
				filteredRoles.length > 0 ? filteredRoles : allRoles;
		}

		this.selectedIndex = 0;
		this.renderRoles();
	}

	private selectPrevious(): void {
		if (this.availableRoles.length === 0) return;

		this.selectedIndex =
			this.selectedIndex > 0
				? this.selectedIndex - 1
				: this.availableRoles.length - 1;

		this.updateSelection();
	}

	private selectNext(): void {
		if (this.availableRoles.length === 0) return;

		this.selectedIndex =
			this.selectedIndex < this.availableRoles.length - 1
				? this.selectedIndex + 1
				: 0;

		this.updateSelection();
	}

	private insertSelectedRole(): void {
		if (this.availableRoles.length === 0 || !this.onInsertCallback) return;

		const selectedRole = this.availableRoles[this.selectedIndex];
		this.onInsertCallback(selectedRole);
		this.hide();
	}

	private createDropdownElement(): void {
		this.dropdownElement = document.createElement("div");
		this.dropdownElement.className = "task-roles-suggestion-dropdown";

		document.body.appendChild(this.dropdownElement);
	}

	private isCovered(el: HTMLElement): boolean {
		if (!el) return false;

		const partialCoverage = this.isCoveredPartial(el);

		return partialCoverage.partiallyCovered || partialCoverage.fullyCovered;
	}

	private isCoveredCenter(el: HTMLElement): boolean {
		const rect = el.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const topElem = document.elementFromPoint(centerX, centerY);
		return topElem !== el && !el.contains(topElem);
	}

	private isCoveredPartial(
		el: HTMLElement,
		samplePoints = 10
	): {
		partiallyCovered: boolean;
		fullyCovered: boolean;
		coveredRatio: number;
	} {
		const rect = el.getBoundingClientRect();
		const stepX = rect.width / (samplePoints + 1);
		const stepY = rect.height / (samplePoints + 1);

		let coveredPoints = 0;
		let totalPoints = 0;

		for (let i = 1; i <= samplePoints; i++) {
			for (let j = 1; j <= samplePoints; j++) {
				const x = rect.left + stepX * i;
				const y = rect.top + stepY * j;
				const topElem = document.elementFromPoint(x, y);

				totalPoints++;

				if (topElem !== el && !el.contains(topElem)) {
					coveredPoints++;
				}
			}
		}

		return {
			partiallyCovered: coveredPoints > 0 && coveredPoints < totalPoints,
			fullyCovered: coveredPoints === totalPoints,
			coveredRatio: coveredPoints / totalPoints,
		};
	}

	private positionDropdown(
		editor: Editor,
		cursor: { line: number; ch: number }
	): void {
		if (!this.dropdownElement || !this.triggerPos) return;

		// Use fixed position based on cursor
		// @ts-ignore
		const coords = editor.coordsAtPos(cursor);
		const left = coords.left;
		const top = coords.bottom; // Use bottom of cursor for dropdown top

		// Adjust for potential overflow, ensuring dropdown doesn't go off screen
		const dropdownRect = this.dropdownElement.getBoundingClientRect();
		const maxLeft = window.innerWidth - dropdownRect.width - 20;
		const maxTop = window.innerHeight - dropdownRect.height - 20;

		this.dropdownElement.style.left = Math.min(left, maxLeft) + "px";
		this.dropdownElement.style.top = Math.min(top, maxTop) + "px";

		// Check if dropdown is covered by other elements
		this.checkForCoverage();

		return;
	}

	private checkForCoverage(): void {
		if (!this.dropdownElement) return;
		if (this.isCovered(this.dropdownElement)) {
			if (this.settings.debug) {
				console.warn(
					"Dropdown is covered by other elements, adjusting position..."
				);
			}

			// Loop 10 times adding 30px to left position
			for (let i = 0; i < 10; i++) {
				const newLeft = parseInt(this.dropdownElement.style.left) + 30;
				this.dropdownElement.style.left = newLeft + "px";

				if (!this.isCovered(this.dropdownElement)) {
					if (this.settings.debug) {
						console.warn("Adjusted position to avoid coverage:", {
							left: this.dropdownElement.style.left,
							top: this.dropdownElement.style.top,
						});
					}
					break;
				}
			}
		}
	}

	private renderRoles(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.innerHTML = "";

		this.availableRoles.forEach((role, index) => {
			const item = document.createElement("div");
			item.className = "task-roles-suggestion-item";

			// Highlight the current filter in the role name
			let displayName = role.name;
			if (this.currentFilter) {
				const regex = new RegExp(`(${this.currentFilter})`, "gi");
				displayName = role.name.replace(regex, "<mark>$1</mark>");
			}

			item.innerHTML = `
				<span class="role-icon">${role.icon}</span>
				<span class="role-name">${displayName}</span>
			`;

			// Set selected class if this is the selected index
			if (index === this.selectedIndex) {
				item.classList.add("selected");
			}

			// Add hover effect
			item.addEventListener("mouseenter", () => {
				this.selectedIndex = index;
				this.updateSelection();
			});

			// Add click handler
			item.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.selectedIndex = index;
				this.insertSelectedRole();
			});

			if (this.dropdownElement) {
				this.dropdownElement.appendChild(item);
			}
		});

		// Show message if no roles available
		if (this.availableRoles.length === 0 && this.dropdownElement) {
			const noRolesItem = document.createElement("div");
			noRolesItem.textContent = "No roles available";
			noRolesItem.className = "task-roles-suggestion-no-roles";
			this.dropdownElement.appendChild(noRolesItem);
		}
	}

	private updateSelection(): void {
		if (!this.dropdownElement) return;

		const items = this.dropdownElement.querySelectorAll(
			".task-roles-suggestion-item"
		);
		items.forEach((item, index) => {
			const element = item as HTMLElement;
			if (index === this.selectedIndex) {
				element.classList.add("selected");
			} else {
				element.classList.remove("selected");
			}
		});
	}

	private getAvailableRoles(existingRoles: string[]): Role[] {
		// Use the plugin's getVisibleRoles method which respects Simple Assignee Role mode
		return this.getVisibleRoles().filter((role) => {
			// Filter out roles already present in task
			if (existingRoles.includes(role.id)) {
				return false;
			}

			return true;
		});
	}

	private attachEventListeners(): void {
		document.addEventListener("keydown", this.handleKeydown, true);
		document.addEventListener("click", this.handleClickOutside, true);
	}

	private detachEventListeners(): void {
		document.removeEventListener("keydown", this.handleKeydown, true);
		document.removeEventListener("click", this.handleClickOutside, true);
	}

	handleClickOutside(e: MouseEvent): void {
		if (!this.dropdownElement || !this.isVisible) return;

		const target = e.target as Node;
		if (!this.dropdownElement.contains(target)) {
			this.hide();
		}
	}
}
