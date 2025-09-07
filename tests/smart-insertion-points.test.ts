import { describe, it, expect } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";

describe("Smart Insertion Point Detection", () => {
	describe("isLegalInsertionPoint", () => {
		it("should allow insertion after task checkbox", () => {
			const line = "- [ ] Task description";
			expect(TaskUtils.isLegalInsertionPoint(line, 6)).toBe(true); // After "- [ ] "
		});

		it("should allow insertion at end of line", () => {
			const line = "- [ ] Task description";
			expect(TaskUtils.isLegalInsertionPoint(line, line.length)).toBe(
				true
			);
		});

		it("should allow insertion after existing role", () => {
			const line = "- [ ] Task [👤:: @user] more text";
			expect(TaskUtils.isLegalInsertionPoint(line, 22)).toBe(true); // After "]"
		});

		it("should NOT allow insertion inside role assignment", () => {
			const line = "- [ ] Task [👤:: @user] text";
			expect(TaskUtils.isLegalInsertionPoint(line, 15)).toBe(false); // Inside [👤:: @user]
		});

		it("should NOT allow insertion inside wikilink", () => {
			const line = "- [ ] Task [👤:: [[People/John|@John]]] text";
			expect(TaskUtils.isLegalInsertionPoint(line, 25)).toBe(false); // Inside wikilink
		});

		it("should NOT allow insertion before task checkbox", () => {
			const line = "- [ ] Task description";
			expect(TaskUtils.isLegalInsertionPoint(line, 0)).toBe(false);
			expect(TaskUtils.isLegalInsertionPoint(line, 2)).toBe(false); // Before checkbox
		});

		it("should NOT allow insertion in middle of word", () => {
			const line = "- [ ] TaskDescription";
			expect(TaskUtils.isLegalInsertionPoint(line, 8)).toBe(false); // Middle of "TaskDescription"
		});

		it("should allow insertion at word boundaries", () => {
			const line = "- [ ] Task Description";
			expect(TaskUtils.isLegalInsertionPoint(line, 10)).toBe(true); // Between "Task" and "Description"
		});
	});

	describe("findAllLegalInsertionPoints", () => {
		it("should find basic insertion points", () => {
			const line = "- [ ] Task description";
			const points = TaskUtils.findAllLegalInsertionPoints(line);

			expect(points).toContain(6); // After checkbox
			expect(points).toContain(22); // End of line
			expect(points.length).toBeGreaterThanOrEqual(2);
		});

		it("should find points after each role", () => {
			const line = "- [ ] Task [👤:: @user][👍:: @approver] text";
			const points = TaskUtils.findAllLegalInsertionPoints(line);

			expect(points).toContain(6); // After checkbox
			expect(points).toContain(23); // After first role
			expect(points).toContain(39); // After second role
		});

		it("should handle roles with spaces", () => {
			const line = "- [ ] Task [👤:: @user] [👍:: @approver] text";
			const points = TaskUtils.findAllLegalInsertionPoints(line);

			expect(points).toContain(23); // After first role
			expect(points).toContain(40); // After second role
		});

		it("should return sorted unique positions", () => {
			const line = "- [ ] Task [👤:: @user] text";
			const points = TaskUtils.findAllLegalInsertionPoints(line);

			// Should be sorted
			for (let i = 1; i < points.length; i++) {
				expect(points[i]).toBeGreaterThan(points[i - 1]);
			}

			// Should be unique
			const uniquePoints = [...new Set(points)];
			expect(points).toEqual(uniquePoints);
		});
	});

	describe("findNearestLegalInsertionPoint", () => {
		it("should return current position if already legal", () => {
			const line = "- [ ] Task description";
			const legalPos = 6; // After checkbox

			expect(
				TaskUtils.findNearestLegalInsertionPoint(line, legalPos)
			).toBe(legalPos);
		});

		it("should find nearest legal position when inside role", () => {
			const line = "- [ ] Task [👤:: @user] text";
			const illegalPos = 15; // Inside role assignment

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				illegalPos
			);
			expect(nearestPos).not.toBe(illegalPos);
			expect(TaskUtils.isLegalInsertionPoint(line, nearestPos)).toBe(
				true
			);
		});

		it("should handle the example from the bug report", () => {
			// Example: cursor is just before the last ]
			const line = "- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]], ] ";
			const cursorPos = line.indexOf("] "); // Just before the last ]

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			// Should move to after the role assignment, not inside it
			expect(nearestPos).toBeGreaterThan(cursorPos);
			expect(TaskUtils.isLegalInsertionPoint(line, nearestPos)).toBe(
				true
			);

			console.log("Line:", line);
			console.log("Cursor position:", cursorPos);
			console.log("Nearest legal position:", nearestPos);
			console.log(
				"Character at nearest position:",
				`"${line[nearestPos]}"`
			);
		});

		it("should prefer positions after existing roles", () => {
			const line = "- [ ] Task [👤:: @user][👍:: @approver] end";
			const cursorPos = 25; // Between roles

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			// Should find a legal position
			expect(TaskUtils.isLegalInsertionPoint(line, nearestPos)).toBe(
				true
			);
		});

		it("should handle multiple roles with spaces", () => {
			const line =
				"- [ ] Task [👤:: @user] [👍:: @approver] [📢:: @informed]";
			const cursorPos = 30; // Inside second role

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			expect(TaskUtils.isLegalInsertionPoint(line, nearestPos)).toBe(
				true
			);
			expect(Math.abs(nearestPos - cursorPos)).toBeGreaterThanOrEqual(0);
		});

		it("should default to after checkbox when no other legal positions", () => {
			const line = "- [ ]"; // Minimal task line
			const cursorPos = 2; // Inside checkbox

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			expect(nearestPos).toBe(5); // After "- [ ] "
		});
	});

	describe("isInsideRoleAssignment", () => {
		it("should detect position inside role assignment", () => {
			const line = "- [ ] Task [👤:: @user] text";

			expect(TaskUtils.isInsideRoleAssignment(line, 15)).toBe(true); // Inside role
			expect(TaskUtils.isInsideRoleAssignment(line, 6)).toBe(false); // Before role
			expect(TaskUtils.isInsideRoleAssignment(line, 23)).toBe(false); // After role
		});

		it("should handle multiple roles", () => {
			const line = "- [ ] Task [👤:: @user][👍:: @approver] text";

			expect(TaskUtils.isInsideRoleAssignment(line, 15)).toBe(true); // Inside first role
			expect(TaskUtils.isInsideRoleAssignment(line, 30)).toBe(true); // Inside second role
			expect(TaskUtils.isInsideRoleAssignment(line, 22)).toBe(false); // Between roles
		});
	});

	describe("isInsideWikilink", () => {
		it("should detect position inside wikilink", () => {
			const line = "- [ ] Task [👤:: [[People/John|@John]]] text";

			expect(TaskUtils.isInsideWikilink(line, 25)).toBe(true); // Inside wikilink
			expect(TaskUtils.isInsideWikilink(line, 16)).toBe(false); // Before wikilink
			expect(TaskUtils.isInsideWikilink(line, 38)).toBe(false); // After wikilink
		});

		it("should handle multiple wikilinks", () => {
			const line = "- [ ] [[Link1]] and [[Link2]] text";

			expect(TaskUtils.isInsideWikilink(line, 10)).toBe(true); // Inside first link
			expect(TaskUtils.isInsideWikilink(line, 25)).toBe(true); // Inside second link
			expect(TaskUtils.isInsideWikilink(line, 15)).toBe(false); // Between links
		});
	});

	describe("findRoleCursorPosition", () => {
		const mockRole = { id: "owner", icon: "👤", name: "Owner" };

		it("should find cursor position for role with no assignees", () => {
			const line = "- [ ] Task [👤:: ]";
			const result = TaskUtils.findRoleCursorPosition(line, mockRole);

			expect(result).not.toBeNull();
			expect(result!.position).toBe(17); // Before the closing ]
			expect(result!.needsSeparator).toBe(false); // No existing assignees
		});

		it("should find cursor position for role with single assignee", () => {
			const line = "- [ ] Task [👤:: @John]";
			const result = TaskUtils.findRoleCursorPosition(line, mockRole);

			expect(result).not.toBeNull();
			expect(result!.position).toBe(22); // Before the closing ]
			expect(result!.needsSeparator).toBe(true); // Has existing assignees
		});

		it("should find cursor position for role with wikilink assignees", () => {
			const line = "- [ ] Task [👤:: [[People/John|@John]]]";
			const result = TaskUtils.findRoleCursorPosition(line, mockRole);

			expect(result).not.toBeNull();
			expect(result!.position).toBe(38); // Before the outermost closing ]
			expect(result!.needsSeparator).toBe(true); // Has existing assignees
		});

		it("should handle complex wikilinks with multiple assignees - bug reproduction", () => {
			// This reproduces the exact bug from the issue
			const line =
				"- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]], [[Task Roles Demo/People/Tommy|@Tommy]]] ➕ 2025-07-22";
			const result = TaskUtils.findRoleCursorPosition(line, mockRole);

			expect(result).not.toBeNull();
			// The position should be right before the final closing bracket of the role assignment
			// Position 88 is the final ] that closes the role assignment (after the wikilinks)
			const expectedPos = 88; // Before the final ]
			expect(result!.position).toBe(expectedPos);
			expect(result!.needsSeparator).toBe(true); // Has existing assignees

			// Verify that inserting ", " at this position would create the expected result
			const insertionText = ", ";
			const actualResult =
				line.slice(0, result!.position) +
				insertionText +
				line.slice(result!.position);
			const expectedResult =
				"- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]], [[Task Roles Demo/People/Tommy|@Tommy]], ] ➕ 2025-07-22";

			expect(actualResult).toBe(expectedResult);
		});

		it("should handle multiple wikilinks with complex paths", () => {
			const line =
				"- [ ] Task [👤:: [[Path/To/Person1|@User1]], [[Another/Long/Path/Person2|@User2]]]";
			const result = TaskUtils.findRoleCursorPosition(line, mockRole);

			expect(result).not.toBeNull();
			expect(result!.position).toBe(81); // Before the outermost closing ]
			expect(result!.needsSeparator).toBe(true);
		});
	});

	describe("Role Insertion Position Bug", () => {
		it("should find correct position when cursor is at end of task line", () => {
			// This reproduces the exact bug from the user report
			const line =
				"- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]], [[Task Roles Demo/People/Tommy|@Tommy]]] ➕ 2025-07-22 ";
			const cursorPos = line.length; // At the very end of the line

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			// Should find position right after the closing bracket of the role assignment
			// Position 88 is after the final ] that closes the role assignment (before the date)
			const expectedPos = 89; // After the final ] and before the space and date
			expect(nearestPos).toBe(expectedPos);
			expect(TaskUtils.isLegalInsertionPoint(line, nearestPos)).toBe(
				true
			);

			// Verify that this position is after the last role but before the date
			const beforePos = line.substring(0, nearestPos);
			const afterPos = line.substring(nearestPos);
			expect(beforePos).toMatch(/\]\s*$/); // Should end with ] and optional space
			expect(afterPos).toMatch(/^.*➕/); // Should start with space and contain date symbol
		});

		it("should prefer position after last role over end of line", () => {
			const line = "- [ ] Task [👤:: @user] some text after";
			const cursorPos = line.length; // At end of line

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				cursorPos
			);

			// Should prefer the position after the role assignment over the end of line
			const afterRolePos = 23; // After [👤:: @user]
			expect(nearestPos).toBe(afterRolePos);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty lines gracefully", () => {
			const line = "";
			expect(TaskUtils.findNearestLegalInsertionPoint(line, 0)).toBe(0);
		});

		it("should handle non-task lines", () => {
			const line = "Not a task line";
			// Should default to position 0 since no checkbox found
			expect(TaskUtils.findNearestLegalInsertionPoint(line, 5)).toBe(0);
		});

		it("should handle positions beyond line length", () => {
			const line = "- [ ] Task";
			const beyondEnd = line.length + 10;

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				beyondEnd
			);
			expect(nearestPos).toBeLessThanOrEqual(line.length);
		});

		it("should handle negative positions", () => {
			const line = "- [ ] Task";
			const negativePos = -5;

			const nearestPos = TaskUtils.findNearestLegalInsertionPoint(
				line,
				negativePos
			);
			expect(nearestPos).toBeGreaterThanOrEqual(0);
		});
	});
});
