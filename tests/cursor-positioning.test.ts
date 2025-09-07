import { describe, it, expect } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";

describe("TaskUtils.findRoleCursorPosition", () => {
	const testRole = { id: "owner", icon: "👤", name: "Owner" };

	it("should find cursor position for role with existing assignees", () => {
		const line = "- [ ] Task with [👤:: @john, @jane] and more text";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeTruthy();
		expect(result?.position).toBe(34); // Before the closing bracket
		expect(result?.needsSeparator).toBe(true);
	});

	it("should find cursor position for role without assignees", () => {
		const line = "- [ ] Task with [👤:: ] and more text";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeTruthy();
		expect(result?.position).toBe(22); // Before the closing bracket
		expect(result?.needsSeparator).toBe(false);
	});

	it("should handle roles with special characters in icon", () => {
		const roleWithSpecialChars = { id: "test", icon: "[?]", name: "Test" };
		const line = "- [ ] Task with [[?]:: @someone] test";
		const result = TaskUtils.findRoleCursorPosition(
			line,
			roleWithSpecialChars
		);

		expect(result).toBeTruthy();
		expect(result?.needsSeparator).toBe(true);
	});

	it("should return null for non-existent role", () => {
		const line = "- [ ] Task with [👍:: @john] test";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeNull();
	});

	it("should handle legacy format", () => {
		const line = "- [ ] Task with 👤 [[People/John|@john]] test";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeTruthy();
		expect(result?.needsSeparator).toBe(false);
	});

	it("should handle wikilinks with multiple assignees correctly", () => {
		const line =
			"- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]], [[Task Roles Demo/People/Tommy|@Tommy]]] ➕ 2025-07-22";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeTruthy();
		expect(result?.position).toBe(88); // Before the closing bracket of the role assignment
		expect(result?.needsSeparator).toBe(true);
	});

	it("should handle wikilinks with nested brackets in path", () => {
		const line =
			"- [ ] T [👤:: [[Complex/Path [with brackets]/Person|@Person]]] test";
		const result = TaskUtils.findRoleCursorPosition(line, testRole);

		expect(result).toBeTruthy();
		expect(result?.position).toBe(61); // Before the closing bracket of the role assignment
		expect(result?.needsSeparator).toBe(true);
	});
});

describe("Shortcut uniqueness validation", () => {
	it("should detect duplicate shortcuts", () => {
		const roles = [
			{ id: "owner", shortcut: "d", name: "Owner" },
			{ id: "approver", shortcut: "a", name: "Approver" },
			{ id: "contributor", shortcut: "c", name: "Contributor" },
		];

		const isDuplicate = (shortcut: string, excludeId?: string) => {
			return roles.some(
				(role) => role.shortcut === shortcut && role.id !== excludeId
			);
		};

		expect(isDuplicate("d")).toBe(true);
		expect(isDuplicate("d", "owner")).toBe(false);
		expect(isDuplicate("x")).toBe(false);
		expect(isDuplicate("")).toBe(false);
	});
});
