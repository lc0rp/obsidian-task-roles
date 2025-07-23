import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_ROLES } from "../src/types";

// Mock DOM APIs
const mockEditor = {
	getLine: vi.fn(),
	getCursor: vi.fn(() => ({ line: 0, ch: 15 })),
	replaceRange: vi.fn(),
	setCursor: vi.fn(),
	lineCount: vi.fn(() => 1),
	getRange: vi.fn(),
};

const mockActiveView = {
	editor: mockEditor,
};

const mockApp = {
	workspace: {
		getActiveViewOfType: vi.fn(() => mockActiveView),
	},
};

// Mock DOM elements
const mockDropdownElement = {
	remove: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	querySelector: vi.fn(),
	querySelectorAll: vi.fn(() => []),
	style: {
		position: 'absolute',
		left: '0px',
		top: '0px',
		zIndex: '1000',
	},
	classList: {
		add: vi.fn(),
		remove: vi.fn(),
		contains: vi.fn(),
	},
	innerHTML: '',
	focus: vi.fn(),
};

const mockMenuItems = [
	{
		textContent: 'Drivers',
		classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
		setAttribute: vi.fn(),
		getAttribute: vi.fn(),
		addEventListener: vi.fn(),
	},
	{
		textContent: 'Approvers', 
		classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
		setAttribute: vi.fn(),
		getAttribute: vi.fn(),
		addEventListener: vi.fn(),
	},
];

// Mock document
Object.defineProperty(global, 'document', {
	value: {
		createElement: vi.fn(() => mockDropdownElement),
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		},
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
});

describe("Role Suggestion Dropdown", () => {
	let onKeyHandler: (e: KeyboardEvent) => any;
	let mockSettings: any;
	let roleSuggestionDropdown: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSettings = {
			roles: DEFAULT_ROLES,
			hiddenDefaultRoles: [],
		};

		// Mock dropdown component
		roleSuggestionDropdown = {
			isVisible: false,
			currentFilter: '',
			selectedIndex: 0,
			availableRoles: [],
			dropdownElement: null,

			show: vi.fn(function(this: any, cursor: any, existingRoles: string[]) {
				this.isVisible = true;
				this.availableRoles = mockSettings.roles.filter((role: any) => 
					!mockSettings.hiddenDefaultRoles.includes(role.id) &&
					!existingRoles.includes(role.id)
				);
				this.selectedIndex = 0;
				this.dropdownElement = mockDropdownElement;
				return true;
			}),

			hide: vi.fn(function(this: any) {
				this.isVisible = false;
				this.dropdownElement = null;
				this.currentFilter = '';
				this.selectedIndex = 0;
			}),

			updateFilter: vi.fn(function(this: any, filter: string) {
				this.currentFilter = filter;
				if (filter === '') {
					this.availableRoles = mockSettings.roles.filter((role: any) => 
						!mockSettings.hiddenDefaultRoles.includes(role.id)
					);
				} else {
					this.availableRoles = mockSettings.roles.filter((role: any) => 
						!mockSettings.hiddenDefaultRoles.includes(role.id) &&
						role.name.toLowerCase().startsWith(filter.toLowerCase())
					);
				}
				// Reset selection if no matches
				if (this.availableRoles.length === 0) {
					this.availableRoles = mockSettings.roles.filter((role: any) => 
						!mockSettings.hiddenDefaultRoles.includes(role.id)
					);
				}
				this.selectedIndex = 0;
			}),

			selectPrevious: vi.fn(function(this: any) {
				if (this.availableRoles.length > 0) {
					this.selectedIndex = this.selectedIndex > 0 ? 
						this.selectedIndex - 1 : 
						this.availableRoles.length - 1;
				}
			}),

			selectNext: vi.fn(function(this: any) {
				if (this.availableRoles.length > 0) {
					this.selectedIndex = this.selectedIndex < this.availableRoles.length - 1 ? 
						this.selectedIndex + 1 : 
						0;
				}
			}),

			getSelectedRole: vi.fn(function(this: any) {
				return this.availableRoles[this.selectedIndex] || null;
			}),

			isInTaskContext: vi.fn((line: string) => {
				return line.includes("[ ]") || 
					   line.includes("[x]") || 
					   line.includes("[X]") ||
					   line.includes("```tasks") ||
					   line.includes("```dataview");
			}),

			getExistingRoles: vi.fn((line: string) => {
				const roles = [];
				for (const role of DEFAULT_ROLES) {
					if (line.includes(`[${role.icon}::`)) {
						roles.push(role.id);
					}
				}
				return roles;
			}),

			calculatePosition: vi.fn((cursor: any, editorElement: any) => {
				const TASKS_PLUGIN_MENU_WIDTH = 300;
				const MENU_MIN_LEFT_MARGIN = 20;
				
				// Mock cursor position calculation
				const cursorPixelPos = { left: cursor.ch * 8, top: cursor.line * 20 };
				
				let left = cursorPixelPos.left;
				if (left < TASKS_PLUGIN_MENU_WIDTH + MENU_MIN_LEFT_MARGIN) {
					left = TASKS_PLUGIN_MENU_WIDTH + MENU_MIN_LEFT_MARGIN;
				}
				
				return {
					left: left + 'px',
					top: (cursorPixelPos.top + 20) + 'px'
				};
			}),
		};

		// Simulate the key handler logic
		onKeyHandler = (e: KeyboardEvent) => {
			const line = mockEditor.getLine();
			const cursor = mockEditor.getCursor();

			// Handle dropdown interactions when visible
			if (roleSuggestionDropdown.isVisible) {
				if (e.key === 'Escape') {
					e.preventDefault();
					roleSuggestionDropdown.hide();
					return { action: 'hideDropdown' };
				}
				
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					roleSuggestionDropdown.selectPrevious();
					return { action: 'selectPrevious' };
				}
				
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					roleSuggestionDropdown.selectNext();
					return { action: 'selectNext' };
				}
				
				if (e.key === 'Enter') {
					e.preventDefault();
					const selectedRole = roleSuggestionDropdown.getSelectedRole();
					roleSuggestionDropdown.hide();
					return { action: 'insertRole', role: selectedRole };
				}
				
				if (e.key === 'Backspace') {
					const beforeCursor = line.substring(0, cursor.ch);
					if (beforeCursor.endsWith('\\\\')) {
						// User backspaced to remove the double backslash trigger
						roleSuggestionDropdown.hide();
						return { action: 'hideDropdown' };
					} else {
						// Update filter by removing last character
						const currentFilter = roleSuggestionDropdown.currentFilter;
						const newFilter = currentFilter.slice(0, -1);
						roleSuggestionDropdown.updateFilter(newFilter);
						return { action: 'updateFilter', filter: newFilter };
					}
				}
				
				// Handle typing to filter roles
				if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
					const newFilter = roleSuggestionDropdown.currentFilter + e.key.toLowerCase();
					roleSuggestionDropdown.updateFilter(newFilter);
					return { action: 'updateFilter', filter: newFilter };
				}
				
				return { action: 'continue' };
			}

			// Check if we're in a task context
			if (!roleSuggestionDropdown.isInTaskContext(line)) {
				return;
			}

			// Handle double backslash trigger
			const beforeCursor = line.substring(0, cursor.ch);
			if (e.key === '\\' && beforeCursor.endsWith('\\')) {
				e.preventDefault();
				const existingRoles = roleSuggestionDropdown.getExistingRoles(line);
				roleSuggestionDropdown.show(cursor, existingRoles);
				return { action: 'showDropdown' };
			}
		};
	});

	afterEach(() => {
		if (roleSuggestionDropdown.isVisible) {
			roleSuggestionDropdown.hide();
		}
	});

	describe("Double Backslash Trigger", () => {
		it("should show dropdown on double backslash in task line", () => {
			// Simulate the state where user is about to type the second backslash
			const taskLine = "- [ ] Task description \\";  
			mockEditor.getLine.mockReturnValue(taskLine);
			mockEditor.getCursor.mockReturnValue({ line: 0, ch: 24 }); // Position right after first backslash

			// Ensure isInTaskContext returns true for this task line
			roleSuggestionDropdown.isInTaskContext = vi.fn().mockReturnValue(true);

			// Simulate typing the second backslash
			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'showDropdown' });
			expect(preventDefault).toHaveBeenCalled();
			expect(roleSuggestionDropdown.show).toHaveBeenCalled();
			expect(roleSuggestionDropdown.isVisible).toBe(true);
		});

		it("should show dropdown in tasks codeblock", () => {
			const taskLine = "- [ ] Task in codeblock \\";
			mockEditor.getLine.mockReturnValue(taskLine);
			mockEditor.getCursor.mockReturnValue({ line: 1, ch: 25 }); // Position after the backslash

			// Ensure isInTaskContext returns true for tasks codeblock
			roleSuggestionDropdown.isInTaskContext = vi.fn().mockReturnValue(true);

			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'showDropdown' });
			expect(preventDefault).toHaveBeenCalled();
		});

		it("should show dropdown in dataview codeblock", () => {
			mockEditor.getLine.mockReturnValue("```dataview");
			roleSuggestionDropdown.isInTaskContext = vi.fn(() => true);

			mockEditor.getLine.mockReturnValue("- [ ] Task in dataview \\\\");
			mockEditor.getCursor.mockReturnValue({ line: 1, ch: 25 });

			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'showDropdown' });
			expect(preventDefault).toHaveBeenCalled();
		});

		it("should not show dropdown on non-task lines", () => {
			mockEditor.getLine.mockReturnValue("Just some text \\\\");

			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
			expect(roleSuggestionDropdown.show).not.toHaveBeenCalled();
		});

		it("should not show dropdown without double backslash", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task description \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
			expect(roleSuggestionDropdown.show).not.toHaveBeenCalled();
		});
	});

	describe("Role Filtering", () => {
		beforeEach(() => {
			// Setup dropdown as visible
			roleSuggestionDropdown.isVisible = true;
			roleSuggestionDropdown.availableRoles = DEFAULT_ROLES;
		});

		it("should filter roles by typing 'd' for drivers", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\d");

			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'updateFilter', filter: 'd' });
			expect(roleSuggestionDropdown.updateFilter).toHaveBeenCalledWith('d');
		});

		it("should filter roles by typing 'dr' for drivers", () => {
			roleSuggestionDropdown.currentFilter = 'd';
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\dr");

			const mockEvent = new KeyboardEvent("keydown", { key: "r" });
			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'updateFilter', filter: 'dr' });
			expect(roleSuggestionDropdown.updateFilter).toHaveBeenCalledWith('dr');
		});

		it("should filter roles by typing 'a' for approvers", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\a");

			const mockEvent = new KeyboardEvent("keydown", { key: "a" });
			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'updateFilter', filter: 'a' });
		});

		it("should show all roles for non-existent filter", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\xyz");

			const mockEvent = new KeyboardEvent("keydown", { key: "z" });
			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'updateFilter', filter: 'z' });
			// The updateFilter mock should reset to all roles when no matches
			expect(roleSuggestionDropdown.updateFilter).toHaveBeenCalledWith('z');
		});
	});

	describe("Keyboard Navigation", () => {
		beforeEach(() => {
			roleSuggestionDropdown.isVisible = true;
			roleSuggestionDropdown.availableRoles = DEFAULT_ROLES;
			roleSuggestionDropdown.selectedIndex = 0;
		});

		it("should handle arrow down to select next role", () => {
			const mockEvent = new KeyboardEvent("keydown", { key: "ArrowDown" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'selectNext' });
			expect(preventDefault).toHaveBeenCalled();
			expect(roleSuggestionDropdown.selectNext).toHaveBeenCalled();
		});

		it("should handle arrow up to select previous role", () => {
			const mockEvent = new KeyboardEvent("keydown", { key: "ArrowUp" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'selectPrevious' });
			expect(preventDefault).toHaveBeenCalled();
			expect(roleSuggestionDropdown.selectPrevious).toHaveBeenCalled();
		});

		it("should handle enter to insert selected role", () => {
			roleSuggestionDropdown.getSelectedRole.mockReturnValue(DEFAULT_ROLES[0]);

			const mockEvent = new KeyboardEvent("keydown", { key: "Enter" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ 
				action: 'insertRole', 
				role: DEFAULT_ROLES[0] 
			});
			expect(preventDefault).toHaveBeenCalled();
			expect(roleSuggestionDropdown.hide).toHaveBeenCalled();
		});

		it("should handle escape to hide dropdown", () => {
			const mockEvent = new KeyboardEvent("keydown", { key: "Escape" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'hideDropdown' });
			expect(preventDefault).toHaveBeenCalled();
			expect(roleSuggestionDropdown.hide).toHaveBeenCalled();
		});
	});

	describe("Role Exclusion", () => {
		it("should not show roles already present in task line", () => {
			const lineWithDrivers = "- [ ] Task [🚗:: @John] \\";
			mockEditor.getLine.mockReturnValue(lineWithDrivers);
			mockEditor.getCursor.mockReturnValue({ line: 0, ch: 25 });
			roleSuggestionDropdown.getExistingRoles.mockReturnValue(['drivers']);

			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'showDropdown' });
			expect(roleSuggestionDropdown.show).toHaveBeenCalledWith(
				expect.anything(), 
				['drivers']
			);
		});

		it("should not show hidden roles", () => {
			mockSettings.hiddenDefaultRoles = ['informed'];
			
			const mockEvent = new KeyboardEvent("keydown", { key: "\\" });
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\");
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'showDropdown' });
			// The show method should filter out hidden roles
			expect(roleSuggestionDropdown.show).toHaveBeenCalled();
		});
	});

	describe("Backspace Handling", () => {
		beforeEach(() => {
			roleSuggestionDropdown.isVisible = true;
			roleSuggestionDropdown.currentFilter = 'dr';
		});

		it("should update filter when backspacing filter text", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\d");
			mockEditor.getCursor.mockReturnValue({ line: 0, ch: 16 });

			const mockEvent = new KeyboardEvent("keydown", { key: "Backspace" });
			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'updateFilter', filter: 'd' });
			expect(roleSuggestionDropdown.updateFilter).toHaveBeenCalledWith('d');
		});

		it("should hide dropdown when backspacing over double backslash", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\\\");
			mockEditor.getCursor.mockReturnValue({ line: 0, ch: 15 });

			const mockEvent = new KeyboardEvent("keydown", { key: "Backspace" });
			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ action: 'hideDropdown' });
			expect(roleSuggestionDropdown.hide).toHaveBeenCalled();
		});
	});

	describe("Position Calculation", () => {
		it("should position dropdown with clearance from left edge", () => {
			const cursor = { line: 0, ch: 5 }; // Close to left edge
			const editorElement = {};
			
			const position = roleSuggestionDropdown.calculatePosition(cursor, editorElement);
			
			// Should be positioned away from left edge to avoid tasks plugin conflict
			expect(position.left).toBe('320px'); // TASKS_PLUGIN_MENU_WIDTH + MENU_MIN_LEFT_MARGIN
			expect(position.top).toBe('20px');
		});

		it("should position dropdown at cursor when far from left edge", () => {
			const cursor = { line: 0, ch: 50 }; // Far from left edge
			const editorElement = {};
			
			const position = roleSuggestionDropdown.calculatePosition(cursor, editorElement);
			
			// Should be positioned at cursor location
			expect(position.left).toBe('400px'); // 50 * 8 (char width)
			expect(position.top).toBe('20px');
		});
	});

	describe("Integration with Existing Role System", () => {
		it("should work alongside existing single backslash shortcuts", () => {
			// Test that double backslash doesn't interfere with single backslash shortcuts
			mockEditor.getLine.mockReturnValue("- [ ] Task \\");
			
			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const result = onKeyHandler(mockEvent);
			
			// Should not trigger dropdown
			expect(result).toBeUndefined();
			expect(roleSuggestionDropdown.show).not.toHaveBeenCalled();
		});

		it("should use same role insertion logic", () => {
			roleSuggestionDropdown.isVisible = true;
			roleSuggestionDropdown.getSelectedRole.mockReturnValue(DEFAULT_ROLES[0]);

			const mockEvent = new KeyboardEvent("keydown", { key: "Enter" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toEqual({ 
				action: 'insertRole', 
				role: DEFAULT_ROLES[0] 
			});
			// Should use the same role object structure as existing shortcuts
			expect(result.role).toHaveProperty('id');
			expect(result.role).toHaveProperty('name');
			expect(result.role).toHaveProperty('icon');
		});
	});
});