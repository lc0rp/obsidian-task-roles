import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";
import { DEFAULT_ROLES } from "../src/types";

describe("Spacing Bug Demonstration", () => {
	describe("Shortcut insertion spacing issue", () => {
		it("should demonstrate the spacing issue when inserting role after existing role", () => {
			// This simulates the exact scenario described in the issue
			const lineWithRole = "- [ ] Task [👤:: [[People/John|@John]]]";

			// When inserting a new role at the end, the insertion point is found correctly
			const insertionPoint = TaskUtils.findNearestLegalInsertionPoint(
				lineWithRole,
				lineWithRole.length
			);
			expect(insertionPoint).toBe(lineWithRole.length);

			// However, when we insert the new role directly at this point...
			const newRole = "[👍:: [[People/Jane|@Jane]]]";
			const resultWithoutSpacing =
				lineWithRole.substring(0, insertionPoint) +
				newRole +
				lineWithRole.substring(insertionPoint);

			// This creates touching roles (the bug!)
			expect(resultWithoutSpacing).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]"
			);
			expect(/\]\[/.test(resultWithoutSpacing)).toBe(true); // Demonstrates the bug

			// The fix should ensure proper spacing
			const resultWithSpacing =
				lineWithRole.substring(0, insertionPoint) +
				" " +
				newRole +
				lineWithRole.substring(insertionPoint);
			expect(resultWithSpacing).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);
			expect(/\]\s\[/.test(resultWithSpacing)).toBe(true); // Shows the proper spacing
			expect(/\]\[/.test(resultWithSpacing)).toBe(false); // No touching roles
		});

		it("should demonstrate the issue when inserting in the middle of roles", () => {
			// Test inserting between two existing roles
			const lineWithRoles =
				"- [ ] Task [👤:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]";
			const midpoint = lineWithRoles.indexOf("[👍::");

			// Insert a new role between the existing ones
			const newRole = "[👥:: [[People/Bob|@Bob]]]";
			const resultWithoutSpacing =
				lineWithRoles.substring(0, midpoint) +
				newRole +
				lineWithRoles.substring(midpoint);

			// This would create multiple touching roles
			expect(resultWithoutSpacing).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]][👥:: [[People/Bob|@Bob]]][👍:: [[People/Jane|@Jane]]]"
			);
			expect((resultWithoutSpacing.match(/\]\[/g) || []).length).toBe(2); // Two instances of touching roles

			// The fix should add proper spacing
			const resultWithSpacing =
				lineWithRoles.substring(0, midpoint) +
				newRole +
				" " +
				lineWithRoles.substring(midpoint);
			expect(resultWithSpacing).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]][👥:: [[People/Bob|@Bob]]] [👍:: [[People/Jane|@Jane]]]"
			);
			expect((resultWithSpacing.match(/\]\[/g) || []).length).toBe(1); // Still one instance, but this is better
		});
	});

	describe("What the fix should do", () => {
		it("should check if insertion point is adjacent to existing role", () => {
			const lineWithRole = "- [ ] Task [👤:: [[People/John|@John]]]";
			const insertionPoint = lineWithRole.length;

			// The fix should detect that we're inserting right after a role closing bracket
			const isAfterRole =
				insertionPoint > 0 && lineWithRole[insertionPoint - 1] === "]";
			expect(isAfterRole).toBe(true);

			// And ensure we add a space when inserting
			const newRole = "[👍:: [[People/Jane|@Jane]]]";
			const properInsertion = lineWithRole + " " + newRole;
			expect(properInsertion).toBe(
				"- [ ] Task [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);
		});

		it("should check if insertion point is before an existing role", () => {
			const lineWithRole = "- [ ] Task text [👍:: [[People/Jane|@Jane]]]";
			const insertionPoint = lineWithRole.indexOf("[👍::");

			// The fix should detect that we're inserting right before a role opening bracket
			const isBeforeRole =
				insertionPoint < lineWithRole.length &&
				lineWithRole[insertionPoint] === "[";
			expect(isBeforeRole).toBe(true);

			// And ensure we add a space when inserting
			const newRole = "[👤:: [[People/John|@John]]]";
			const properInsertion =
				lineWithRole.substring(0, insertionPoint) +
				newRole +
				" " +
				lineWithRole.substring(insertionPoint);
			expect(properInsertion).toBe(
				"- [ ] Task text [👤:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]"
			);
		});
	});
});
