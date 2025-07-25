import { App, MarkdownView } from "obsidian";
import { Role, TaskRolesPluginSettings } from "../types";

export class RoleSuggestionDropdown {
	private app: App;
	private settings: TaskRolesPluginSettings;
	private dropdownElement: HTMLElement | null = null;
	private isVisible = false;
	private availableRoles: Role[] = [];
	private selectedIndex = 0;
	private currentFilter = '';
	private triggerPos: { line: number; ch: number } | null = null;
	private onInsertCallback: ((role: Role) => void) | null = null;
	private autoHideTimeout: number | null = null;
	private useAbsolutePositioning: boolean;

	constructor(app: App, settings: TaskRolesPluginSettings, useAbsolutePositioning: boolean = true) {
		this.app = app;
		this.settings = settings;
		this.useAbsolutePositioning = useAbsolutePositioning;
		this.handleKeydown = this.handleKeydown.bind(this);
		this.handleClickOutside = this.handleClickOutside.bind(this);
	}

	show(cursor: { line: number; ch: number }, existingRoles: string[], onInsert: (role: Role) => void): boolean {
		// Bug fix #1: Ensure only one instance exists - hide existing dropdown first
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
		this.currentFilter = '';
		this.onInsertCallback = onInsert;
		this.isVisible = true;

		this.createDropdownElement();
		this.positionDropdown();
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
		this.currentFilter = '';
		this.triggerPos = null;
		this.onInsertCallback = null;
	}

	isShowing(): boolean {
		return this.isVisible;
	}

	handleKeydown(e: KeyboardEvent): boolean {
		if (!this.isVisible) return false;

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				e.stopPropagation();
				this.hide();
				return true;

			case 'ArrowUp':
				e.preventDefault();
				e.stopPropagation();
				this.selectPrevious();
				return true;

			case 'ArrowDown':
				e.preventDefault();
				e.stopPropagation();
				this.selectNext();
				return true;

			case 'Enter':
				e.preventDefault();
				e.stopPropagation();
				this.insertSelectedRole();
				return true;

			case 'Backspace':
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
		if (beforeCursor.endsWith('\\\\')) {
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
		
		if (filter === '') {
			// Show all available roles when filter is empty
			this.availableRoles = this.getAvailableRoles([]);
		} else {
			// Filter roles by name
			const allRoles = this.getAvailableRoles([]);
			const filteredRoles = allRoles.filter(role => 
				role.name.toLowerCase().startsWith(filter.toLowerCase())
			);

			// If no matches, show all roles (as specified in requirements)
			this.availableRoles = filteredRoles.length > 0 ? filteredRoles : allRoles;
		}

		this.selectedIndex = 0;
		this.renderRoles();
	}

	private selectPrevious(): void {
		if (this.availableRoles.length === 0) return;
		
		this.selectedIndex = this.selectedIndex > 0 
			? this.selectedIndex - 1 
			: this.availableRoles.length - 1;
		
		this.updateSelection();
	}

	private selectNext(): void {
		if (this.availableRoles.length === 0) return;
		
		this.selectedIndex = this.selectedIndex < this.availableRoles.length - 1 
			? this.selectedIndex + 1 
			: 0;
		
		this.updateSelection();
	}

	private insertSelectedRole(): void {
		if (this.availableRoles.length === 0 || !this.onInsertCallback) return;

		const selectedRole = this.availableRoles[this.selectedIndex];
		this.hide();
		this.onInsertCallback(selectedRole);
	}

	private createDropdownElement(): void {
		this.dropdownElement = document.createElement('div');
		this.dropdownElement.className = 'task-roles-suggestion-dropdown';
		this.dropdownElement.style.cssText = `
			position: absolute;
			background: var(--background-primary);
			border: 1px solid var(--background-modifier-border);
			border-radius: 8px;
			box-shadow: var(--shadow-s);
			padding: 4px 0;
			min-width: 200px;
			max-height: 300px;
			overflow-y: auto;
			z-index: 1000;
			font-size: var(--font-ui-small);
		`;

		document.body.appendChild(this.dropdownElement);
	}

	private positionDropdown(): void {
		if (!this.dropdownElement || !this.triggerPos) return;

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		// Get the editor element to calculate position
		const editorElement = activeView.containerEl.querySelector('.cm-editor');
		if (!editorElement) return;

		// Bug fix #5: Fix positioning logic - use character count not pixel count
		const position = this.calculatePosition(this.triggerPos, editorElement);
		
		// Ensure dropdown doesn't go off screen
		const dropdownRect = this.dropdownElement.getBoundingClientRect();
		const maxLeft = window.innerWidth - dropdownRect.width - 20;
		const maxTop = window.innerHeight - dropdownRect.height - 20;

		this.dropdownElement.style.left = Math.min(parseInt(position.left), maxLeft) + 'px';
		this.dropdownElement.style.top = Math.min(parseInt(position.top), maxTop) + 'px';
	}

	calculatePosition(cursor: { line: number; ch: number }, editorElement: Element): { left: string; top: string } {
		// Calculate cursor position in pixels
		const charWidth = 8; // Approximate character width
		const lineHeight = 20; // Approximate line height
		const editorRect = editorElement.getBoundingClientRect();
		
		const cursorX = cursor.ch * charWidth;
		let cursorY = cursor.line * lineHeight;

		// Conditionally account for scroll offset based on flag
		if (this.useAbsolutePositioning) {
			const scroller = editorElement.querySelector('.cm-scroller') as HTMLElement;
			if (scroller && scroller.scrollTop) {
				cursorY -= scroller.scrollTop;
			}
		}

		// Bug fix #5: Position at cursor when > 40 characters from left, otherwise offset
		let left = editorRect.left + cursorX;
		if (cursor.ch < 40) {
			// Cursor is < 40 characters from left edge, position with offset
			left = editorRect.left + (40 * charWidth);
		}

		const top = editorRect.top + cursorY + lineHeight;

		return {
			left: left + 'px',
			top: top + 'px'
		};
	}

	private renderRoles(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.innerHTML = '';

		this.availableRoles.forEach((role, index) => {
			const item = document.createElement('div');
			item.className = 'task-roles-suggestion-item';
			
			// Highlight the current filter in the role name
			let displayName = role.name;
			if (this.currentFilter) {
				const regex = new RegExp(`(${this.currentFilter})`, 'gi');
				displayName = role.name.replace(regex, '<mark>$1</mark>');
			}

			item.innerHTML = `
				<span class="role-icon">${role.icon}</span>
				<span class="role-name">${displayName}</span>
			`;
			
			item.style.cssText = `
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 6px 12px;
				cursor: pointer;
				border-radius: 4px;
				margin: 0 4px;
				${index === this.selectedIndex ? 'background: var(--background-modifier-hover);' : ''}
			`;

			// Add hover effect
			item.addEventListener('mouseenter', () => {
				this.selectedIndex = index;
				this.updateSelection();
			});

			// Add click handler
			item.addEventListener('click', (e) => {
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
			const noRolesItem = document.createElement('div');
			noRolesItem.textContent = 'No roles available';
			noRolesItem.style.cssText = `
				padding: 12px;
				text-align: center;
				color: var(--text-muted);
				font-style: italic;
			`;
			this.dropdownElement.appendChild(noRolesItem);
		}
	}

	private updateSelection(): void {
		if (!this.dropdownElement) return;

		const items = this.dropdownElement.querySelectorAll('.task-roles-suggestion-item');
		items.forEach((item, index) => {
			const element = item as HTMLElement;
			if (index === this.selectedIndex) {
				element.style.background = 'var(--background-modifier-hover)';
			} else {
				element.style.background = '';
			}
		});
	}

	private getAvailableRoles(existingRoles: string[]): Role[] {
		return this.settings.roles.filter(role => {
			// Filter out hidden default roles
			if (role.isDefault && this.settings.hiddenDefaultRoles.includes(role.id)) {
				return false;
			}
			
			// Filter out roles already present in task
			if (existingRoles.includes(role.id)) {
				return false;
			}

			return true;
		});
	}

	private attachEventListeners(): void {
		document.addEventListener('keydown', this.handleKeydown, true);
		document.addEventListener('click', this.handleClickOutside, true);
	}

	private detachEventListeners(): void {
		document.removeEventListener('keydown', this.handleKeydown, true);
		document.removeEventListener('click', this.handleClickOutside, true);
	}

	handleClickOutside(e: MouseEvent): void {
		if (!this.dropdownElement || !this.isVisible) return;

		const target = e.target as Node;
		if (!this.dropdownElement.contains(target)) {
			this.hide();
		}
	}
}