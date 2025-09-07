import { describe, it, expect } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";

describe("TaskUtils.getExistingRoles", () => {
	const mockRoles = [
		{ id: "owner", icon: "👤", name: "Owner" },
		{ id: "approver", icon: "👍", name: "Approver" },
		{ id: "contributor", icon: "👥", name: "Contributor" },
		{ id: "informed", icon: "📢", name: "Informed" },
	];

	it("should detect dataview format roles", () => {
		const line = "- [ ] Task with [👤:: @John] and [👍:: @Jane]";
		const existingRoles = TaskUtils.getExistingRoles(line, mockRoles);

		expect(existingRoles).toContain("owner");
		expect(existingRoles).toContain("approver");
		expect(existingRoles).toHaveLength(2);
	});

	it("should detect legacy format roles", () => {
		const line =
			"- [ ] Task with 👤 [[People/John|@John]] and 👥 [[People/Jane|@Jane]]";
		const existingRoles = TaskUtils.getExistingRoles(line, mockRoles);

		expect(existingRoles).toContain("owner");
		expect(existingRoles).toContain("contributor");
		expect(existingRoles).toHaveLength(2);
	});

	it("should detect mixed format roles", () => {
		const line =
			"- [ ] Task with [👤:: @John] and 👥 [[People/Jane|@Jane]]";
		const existingRoles = TaskUtils.getExistingRoles(line, mockRoles);

		expect(existingRoles).toContain("owner");
		expect(existingRoles).toContain("contributor");
		expect(existingRoles).toHaveLength(2);
	});

	it("should return empty array when no roles present", () => {
		const line = "- [ ] Task without any roles";
		const existingRoles = TaskUtils.getExistingRoles(line, mockRoles);

		expect(existingRoles).toHaveLength(0);
	});

	it("should handle escaped regex characters in role icons", () => {
		const rolesWithSpecialChars = [
			{ id: "special", icon: "🎯*", name: "Special" },
			{ id: "normal", icon: "👤", name: "Normal" },
		];

		const line = "- [ ] Task with [🎯*:: @John] and [👤:: @Jane]";
		const existingRoles = TaskUtils.getExistingRoles(
			line,
			rolesWithSpecialChars
		);

		expect(existingRoles).toContain("special");
		expect(existingRoles).toContain("normal");
		expect(existingRoles).toHaveLength(2);
	});

	it("should not detect roles in task description text", () => {
		const line = "- [ ] Task about 👤 cars and 👍 approval process";
		const existingRoles = TaskUtils.getExistingRoles(line, mockRoles);

		expect(existingRoles).toHaveLength(0);
	});
});
