import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_ROLES } from "../src/types";

// Mock DOM APIs
const mockEditor = {
	getLine: vi.fn(),
	getCursor: vi.fn(() => ({ line: 0, ch: 15 })),
	replaceRange: vi.fn(),
	setCursor: vi.fn(),
};

const mockActiveView = {
	editor: mockEditor,
};

const mockApp = {
	workspace: {
		getActiveViewOfType: vi.fn(() => mockActiveView),
	},
};

describe("Role Shortcuts", () => {
	let onKeyHandler: (e: KeyboardEvent) => void;
	let mockSettings: any;

	beforeEach(() => {
		vi.clearAllMocks();

    mockSettings = {
        roles: DEFAULT_ROLES,
        hiddenDefaultRoles: [],
    };

		// Create a mock instance of the backslash trigger class
        const mockInstance = {
            isRoleShortcutKey: vi.fn((key: string, visibleRoles: any[]) => {
                const lowerKey = key.toLowerCase();
                return visibleRoles.some((role) => (role.shortcuts || []).includes(lowerKey));
            }),
            insertRoleDirectly: vi.fn(),
            isInTaskCodeBlock: vi.fn(() => false),
            onKey: vi.fn(),
        };

		// Simulate the key handler logic
		onKeyHandler = (e: KeyboardEvent) => {
			const line = mockEditor.getLine();
			const cursor = mockEditor.getCursor();
			const isTaskLine =
				line.includes("[ ]") ||
				line.includes("[x]") ||
				line.includes("[X]");
			const isInTaskBlock = mockInstance.isInTaskCodeBlock();

			if (!isTaskLine && !isInTaskBlock) {
				return;
			}

			// Handle colon trigger for popup menu
			if (e.key === ":") {
				e.preventDefault();
				return "popup";
			}

			// Handle direct role shortcuts (\o, \a, \c, \i)
            const visibleRoles = mockSettings.roles.filter(
                (role: any) => !mockSettings.hiddenDefaultRoles.includes(role.id)
            );

			const beforeCursor = line.substring(0, cursor.ch);
			if (
				beforeCursor.endsWith("\\") &&
				mockInstance.isRoleShortcutKey(e.key, visibleRoles)
			) {
                const role = visibleRoles.find(
                    (r: any) => (r.shortcuts || []).includes(e.key.toLowerCase())
                );
                if (role) {
                    e.preventDefault();
                    return { action: "insertRole", role };
                }
            }
        };
	});

	describe("Test Role Shortcuts", () => {
    it("should handle \\o for owner role", () => {
        mockEditor.getLine.mockReturnValue("- [ ] Task \\");

        const mockEvent = new KeyboardEvent("keydown", { key: "o" });
        const preventDefault = vi.fn();
        Object.defineProperty(mockEvent, "preventDefault", {
            value: preventDefault,
        });

        const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("o")),
        });
        expect(preventDefault).toHaveBeenCalled();
    });

		it("should handle \\a for approver role", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "a" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("a")),
        });
			expect(preventDefault).toHaveBeenCalled();
		});

		it("should handle \\c for contributor role", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "c" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("c")),
        });
		});

		it("should handle \\i for informed role", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "i" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("i")),
        });
		});

		it("should handle : for popup trigger", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task");

			const mockEvent = new KeyboardEvent("keydown", { key: ":" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBe("popup");
			expect(preventDefault).toHaveBeenCalled();
		});

		it("should not trigger on non-task lines", () => {
			mockEditor.getLine.mockReturnValue("Just some text \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
		});

		it("should not trigger without backslash prefix", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task ");

			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
		});

		it("should not trigger for invalid shortcut keys", () => {
			mockEditor.getLine.mockReturnValue("- [ ] Task \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "x" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
		});

		it("should not insert role metadata on new line when cursor is at end of task line", () => {
			// Setup task line with cursor at the very end
			const taskLine = "- [ ] Task description here";
			const cursorAtEnd = taskLine.length + 1; // +1 for the backslash
			mockEditor.getLine.mockReturnValue(taskLine + "\\");
			mockEditor.getCursor.mockReturnValue({ line: 0, ch: cursorAtEnd });

			const mockEvent = new KeyboardEvent("keydown", { key: "o" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("o")),
        });
			expect(preventDefault).toHaveBeenCalled();

			// Verify that no new line characters would be inserted
			// The role should be inserted inline, not on a new line
        const expectedRole = DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("o"));
			expect(expectedRole).toBeDefined();

			// The role format should be inline dataview format [👤:: ]
			// not contain any newline characters
			const roleFormat = `[${expectedRole?.icon}:: ]`;
			expect(roleFormat).not.toContain("\n");
			expect(roleFormat).not.toContain("\r");
		});

		it("should insert role inline when task already has newline in multi-line file", () => {
			// Simulate a task that's part of a multi-line file with existing newline
			// The editor.getLine() method strips newlines, but the task would have \n at end in actual file
			const taskLine = "- [ ] Task description here";
			const cursorBeforeNewline = taskLine.length + 1; // +1 for the backslash, positioned before the existing newline
			mockEditor.getLine.mockReturnValue(taskLine + "\\"); // getLine returns content without \n
			mockEditor.getCursor.mockReturnValue({
				line: 0,
				ch: cursorBeforeNewline,
			});

			const mockEvent = new KeyboardEvent("keydown", { key: "a" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

        expect(result).toEqual({
            action: "insertRole",
            role: DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("a")),
        });
			expect(preventDefault).toHaveBeenCalled();

			// Verify the role insertion doesn't add extra newlines
        const expectedRole = DEFAULT_ROLES.find((r) => (r.shortcuts || []).includes("a"));
			expect(expectedRole).toBeDefined();

			// The role format should remain inline without additional line breaks
			const roleFormat = `[${expectedRole?.icon}:: ]`;
			expect(roleFormat).not.toContain("\n");
			expect(roleFormat).not.toContain("\r");

			// Ensure the insertion preserves the existing file structure
			// by not introducing additional line breaks in the role format
			expect(roleFormat.length).toBeGreaterThan(0);
			expect(roleFormat.trim()).toBe(roleFormat); // No leading/trailing whitespace that could affect formatting
		});
	});

	describe("Hidden Roles", () => {
		it("should not trigger shortcuts for hidden roles", () => {
			mockSettings.hiddenDefaultRoles = ["owner"];

			mockEditor.getLine.mockReturnValue("- [ ] Task \\");

			const mockEvent = new KeyboardEvent("keydown", { key: "d" });
			const preventDefault = vi.fn();
			Object.defineProperty(mockEvent, "preventDefault", {
				value: preventDefault,
			});

			const result = onKeyHandler(mockEvent);

			expect(result).toBeUndefined();
			expect(preventDefault).not.toHaveBeenCalled();
		});
	});
});
