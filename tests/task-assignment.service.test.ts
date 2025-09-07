import { describe, it, expect } from "vitest";
import { TaskRolesService } from "../src/services/task-roles.service";
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from "../src/types/index";

const appStub = { vault: {}, workspace: {} };

function createService() {
	return new TaskRolesService(appStub, DEFAULT_SETTINGS);
}

describe("TaskRolesService", () => {
	it("parseRoleAssignments returns single role", () => {
		const service = createService();
		const input = "[👤:: [[People/John|@John]]]";
		const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
		expect(result).toEqual([
			{ role: DEFAULT_ROLES[0], assignees: ["@John"] },
		]);
	});

	it("applyRoleAssignmentsToLine inserts assigned roles before metadata", () => {
		const service = createService();
		const line = "- [ ] Test task 🔴 📅 2024-01-01";
		const roleAssignments = [{ roleId: "owner", assignees: ["@John"] }];
		const result = service.applyRoleAssignmentsToLine(
			line,
			roleAssignments,
			DEFAULT_ROLES
		);
		expect(result).toBe(
			"- [ ] Test task [👤:: [[People/John|@John]]] 🔴 📅 2024-01-01"
		);
	});

	it("parseRoleAssignments handles multiple roles", () => {
		const service = createService();
		const input =
			"[👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]";
		const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
		expect(result).toEqual([
			{ role: DEFAULT_ROLES[0], assignees: ["@John"] },
			{ role: DEFAULT_ROLES[1], assignees: ["@Jane"] },
		]);
	});

	it("formatRoleAssignments sorts by role order", () => {
		const service = createService();
		const roleAssignments = [
			{ roleId: "approver", assignees: ["@Jane"] },
			{ roleId: "owner", assignees: ["@John"] },
		];
		const output = service.formatRoleAssignments(
			roleAssignments,
			DEFAULT_ROLES
		);
		expect(output).toBe(
			"[👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
		);
	});

	it("escapeRegex escapes special characters", () => {
		const service = createService();
		const escaped = service.escapeRegex(".*+?^${}()|[]\\");
		const expected = "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\";
		expect(escaped).toBe(expected);
	});

	it("applyRoleAssignmentsToLine removes existing assigned roles with nested brackets", () => {
		const service = createService();
		const line =
			"- [ ] Task [👤:: [[3-Resources/People/Luke|@Luke]], [[3-Resources/People/Mum|@Mum]]] 📅 2024-01-01";
		const roleAssignments = [
			{ roleId: "approver", assignees: ["@Manager"] },
		];
		const result = service.applyRoleAssignmentsToLine(
			line,
			roleAssignments,
			DEFAULT_ROLES
		);
		expect(result).toBe(
			"- [ ] Task [👍:: [[People/Manager|@Manager]]] 📅 2024-01-01"
		);
	});
});
