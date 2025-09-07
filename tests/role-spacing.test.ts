import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskRolesService } from "../src/services/task-roles.service";
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from "../src/types/index";

const appStub = { vault: {}, workspace: {} };

function createService() {
	return new TaskRolesService(appStub, DEFAULT_SETTINGS);
}

describe("Role Spacing Issues", () => {
	let service: TaskRolesService;

	beforeEach(() => {
		service = createService();
	});

	describe("formatRoleAssignments spacing", () => {
		it("should have spaces between adjacent roles when formatting multiple roles", () => {
			const roleAssignments = [
				{ roleId: "owner", assignees: ["@John"] },
				{ roleId: "approver", assignees: ["@Jane"] },
			];

			const result = service.formatRoleAssignments(
				roleAssignments,
				DEFAULT_ROLES
			);

			// Should have space between roles
			expect(result).toBe(
				"[👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);
			// Verify there's exactly one space between roles
			expect(result).toMatch(/\]\s\[/);
			// Should not have roles touching without space
			expect(result).not.toMatch(/\]\[/);
		});

		it("should handle three roles with proper spacing", () => {
			const roleAssignments = [
				{ roleId: "owner", assignees: ["@John"] },
				{ roleId: "approver", assignees: ["@Jane"] },
				{ roleId: "contributor", assignees: ["@Bob"] },
			];

			const result = service.formatRoleAssignments(
				roleAssignments,
				DEFAULT_ROLES
			);

			expect(result).toBe(
				"[👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]] [👥:: [[People/Bob|@Bob]]]"
			);
			// Should have exactly two spaces (between three roles)
			const spaceMatches = result.match(/\]\s\[/g);
			expect(spaceMatches).toHaveLength(2);
		});

		it("should not have trailing or leading spaces", () => {
			const roleAssignments = [{ roleId: "owner", assignees: ["@John"] }];

			const result = service.formatRoleAssignments(
				roleAssignments,
				DEFAULT_ROLES
			);

			expect(result.startsWith(" ")).toBe(false);
			expect(result.endsWith(" ")).toBe(false);
		});
	});

	describe("applyRoleAssignmentsToLine spacing", () => {
		it("should add space before role assignment when inserting into line", () => {
			const line = "- [ ] Test task";
			const roleAssignments = [{ roleId: "owner", assignees: ["@John"] }];

			const result = service.applyRoleAssignmentsToLine(
				line,
				roleAssignments,
				DEFAULT_ROLES
			);

			// Should have space before role assignment
			expect(result).toBe("- [ ] Test task [👤:: [[People/John|@John]]]");
			expect(result).toMatch(/task\s\[/);
		});

		it("should maintain spacing when replacing existing roles", () => {
			const line = "- [ ] Test task [👤:: [[People/OldUser|@OldUser]]]";
			const roleAssignments = [
				{ roleId: "approver", assignees: ["@NewUser"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				line,
				roleAssignments,
				DEFAULT_ROLES
			);

			// Should maintain space before role assignment
			expect(result).toBe(
				"- [ ] Test task [👍:: [[People/NewUser|@NewUser]]]"
			);
			expect(result).toMatch(/task\s\[/);
		});

		it("should handle role insertion before metadata with proper spacing", () => {
			const line = "- [ ] Test task 📅 2024-01-01";
			const roleAssignments = [{ roleId: "owner", assignees: ["@John"] }];

			const result = service.applyRoleAssignmentsToLine(
				line,
				roleAssignments,
				DEFAULT_ROLES
			);

			// Should have space before role and space before metadata
			expect(result).toBe(
				"- [ ] Test task [👤:: [[People/John|@John]]] 📅 2024-01-01"
			);
			expect(result).toMatch(/task\s\[.*\]\s📅/);
		});

		it("demonstrates the bug: multiple roles without proper spacing", () => {
			// This test should initially pass but demonstrates potential spacing issues
			const line = "- [ ] Test task";
			const roleAssignments = [
				{ roleId: "owner", assignees: ["@John"] },
				{ roleId: "approver", assignees: ["@Jane"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				line,
				roleAssignments,
				DEFAULT_ROLES
			);

			// Current implementation should have proper spacing
			expect(result).toBe(
				"- [ ] Test task [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);

			// Test specifically for the space between roles
			expect(result).toMatch(/\]\s\[/); // Should have space between role blocks
			expect(result).not.toMatch(/\]\[/); // Should not have roles touching without space

			// Count the spaces between roles more specifically
			const spacesBetweenRoles = result.match(/\]\s\[/g);
			expect(spacesBetweenRoles).toHaveLength(1); // Should have exactly one space between the two roles
		});
	});

	describe("Edge cases that may cause spacing issues", () => {
		it("should handle empty role assignments gracefully", () => {
			const result = service.formatRoleAssignments([], DEFAULT_ROLES);
			expect(result).toBe("");
		});

		it("should handle single role assignment", () => {
			const roleAssignments = [{ roleId: "owner", assignees: ["@John"] }];
			const result = service.formatRoleAssignments(
				roleAssignments,
				DEFAULT_ROLES
			);
			expect(result).toBe("[👤:: [[People/John|@John]]]");
		});

		it("should handle role with multiple assignees", () => {
			const roleAssignments = [
				{ roleId: "owner", assignees: ["@John", "@Jane"] },
			];
			const result = service.formatRoleAssignments(
				roleAssignments,
				DEFAULT_ROLES
			);
			expect(result).toBe(
				"[👤:: [[People/John|@John]], [[People/Jane|@Jane]]]"
			);

			// Verify comma-space separation within role
			expect(result).toMatch(/\@John\]\],\s\[\[People\/Jane/);
		});
	});

	describe("Actual spacing issues that need fixing", () => {
		it("should properly handle shortcut insertion adjacent to existing roles", () => {
			// This test simulates the shortcut trigger scenario
			// When using shortcuts to add roles adjacent to existing ones

			// Simulate a line that already has a role
			const lineWithExistingRole =
				"- [ ] Task [👤:: [[People/John|@John]]]";

			// Simulate what would happen when shortcut adds another role
			// The issue is that the shortcut might not add proper spacing
			const mockRoleAssignments = [
				{ roleId: "owner", assignees: ["@John"] },
				{ roleId: "approver", assignees: ["@Jane"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				"- [ ] Task",
				mockRoleAssignments,
				DEFAULT_ROLES
			);

			// Verify proper spacing between roles
			expect(result).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);
			expect(result).toMatch(/\]\s\[/); // Space between roles
			expect(result).not.toMatch(/\]\[/); // No touching roles
		});

		it("should handle assign modal output with proper spacing", () => {
			// Test the assign modal scenario
			const line = "- [ ] Task description";
			const multipleRoles = [
				{ roleId: "owner", assignees: ["@John"] },
				{ roleId: "approver", assignees: ["@Jane"] },
				{ roleId: "contributor", assignees: ["@Bob"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				line,
				multipleRoles,
				DEFAULT_ROLES
			);

			// Should have proper spacing between all three roles
			expect(result).toBe(
				"- [ ] Task description [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]] [👥:: [[People/Bob|@Bob]]]"
			);

			// Count spaces between roles - should be 2 spaces for 3 roles
			const spacesBetweenRoles = result.match(/\]\s\[/g);
			expect(spacesBetweenRoles).toHaveLength(2);

			// Ensure no roles are touching without spaces
			expect(result).not.toMatch(/\]\[/);
		});

		it("should handle edge case of role insertion at different positions", () => {
			// Test inserting roles in various positions within the line
			const baseTask = "- [ ] Important task";
			const roleAssignments = [
				{ roleId: "owner", assignees: ["@Lead"] },
				{ roleId: "informed", assignees: ["@Manager"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				baseTask,
				roleAssignments,
				DEFAULT_ROLES
			);

			// Should maintain proper spacing regardless of position
			expect(result).toBe(
				"- [ ] Important task [👤:: [[People/Lead|@Lead]]] [📢:: [[People/Manager|@Manager]]]"
			);
			expect(result).toMatch(/\]\s\[/);
			expect(result).not.toMatch(/\]\[/);
		});

		it("should handle role replacement while maintaining spacing", () => {
			// Test replacing existing roles maintains proper spacing
			const existingLine =
				"- [ ] Task [👤:: [[People/OldUser|@OldUser]]][👍:: [[People/AnotherOld|@AnotherOld]]]";
			const newRoles = [
				{ roleId: "contributor", assignees: ["@NewUser"] },
				{ roleId: "informed", assignees: ["@NewManager"] },
			];

			const result = service.applyRoleAssignmentsToLine(
				existingLine,
				newRoles,
				DEFAULT_ROLES
			);

			// Should fix the spacing issue and properly separate new roles
			expect(result).toBe(
				"- [ ] Task [👥:: [[People/NewUser|@NewUser]]] [📢:: [[People/NewManager|@NewManager]]]"
			);
			expect(result).toMatch(/\]\s\[/);
			expect(result).not.toMatch(/\]\[/);
		});
	});
});
