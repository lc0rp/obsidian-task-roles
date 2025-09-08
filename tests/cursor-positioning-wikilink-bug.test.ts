import { describe, it, expect } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";

describe("Cursor Positioning Bug - Wikilink Format", () => {
	const testRole = { id: "owner", icon: "👤", name: "Owner" };

	describe("Bug Reproduction", () => {
		it("should find correct cursor position for wikilink assignees", () => {
			// This is the exact problematic line from the bug report
			const line = "- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]] ] ";
			const result = TaskUtils.findRoleCursorPosition(line, testRole);

			expect(result).toBeTruthy();
			expect(result?.needsSeparator).toBe(true);

			// The position should be right before the closing bracket of the role assignment
			// Line structure: "- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]] ] "
			//                              ^                                    ^
			//                            start                            expected position

			// Find the actual closing bracket position
			// We need to find the closing ] that matches the opening [ of the role
			let bracketCount = 0;
			let roleClosingPos = -1;
			let inRole = false;

			for (let i = 0; i < line.length; i++) {
				if (line.substring(i).startsWith("[👤:: ")) {
					inRole = true;
					bracketCount = 1;
					i += 5; // Skip past "[👤:: "
					continue;
				}

				if (inRole) {
					if (line[i] === "[") bracketCount++;
					else if (line[i] === "]") bracketCount--;

					if (bracketCount === 0) {
						roleClosingPos = i;
						break;
					}
				}
			}



			expect(result?.position).toBe(roleClosingPos);
		});

		it("should find correct cursor position for multiple wikilink assignees", () => {
			const line =
				"- [ ] Task [👤:: [[People/John|@John]], [[People/Jane|@Jane]] ]";
			const result = TaskUtils.findRoleCursorPosition(line, testRole);

			expect(result).toBeTruthy();
			expect(result?.needsSeparator).toBe(true);

			// Should be at the closing "]" (position 62)
			const roleEnd = 62; // Position of the closing ] of the role assignment
			expect(result?.position).toBe(roleEnd);
		});

		it("should handle single assignee format correctly", () => {
			const line = "- [ ] Task [👤:: @john]";
			const result = TaskUtils.findRoleCursorPosition(line, testRole);

			expect(result).toBeTruthy();
			expect(result?.needsSeparator).toBe(true);

			// Should be right before the closing "]"
			const roleEnd = line.indexOf("]", line.indexOf("[👤:: "));
			expect(result?.position).toBe(roleEnd);
		});

		it("should handle empty role correctly", () => {
			const line = "- [ ] Task [👤:: ]";
			const result = TaskUtils.findRoleCursorPosition(line, testRole);

			expect(result).toBeTruthy();
			expect(result?.needsSeparator).toBe(false);

			// Should be right before the closing "]"
			const roleEnd = line.indexOf("]", line.indexOf("[👤:: "));
			expect(result?.position).toBe(roleEnd);
		});
	});

	describe("Expected Behavior Analysis", () => {
		it("should demonstrate what the regex currently captures", () => {
			const line = "- [ ] T [👤:: [[Task Roles Demo/People/Me|@Me]] ] ";
			const escapedIcon = testRole.icon.replace(
				/[.*+?^${}()|[\]\\]/g,
				"\\$&"
			);

			// This is the current regex from the implementation
			const dataviewPattern = new RegExp(
				`\\[${escapedIcon}::\\s*([^\\]]*)\\]`,
				"g"
			);
			const match = dataviewPattern.exec(line);


			if (match) {
				const assigneesText = match[1].trim();
				const hasAssignees = assigneesText.length > 0;
				const position = match.index + match[0].length - 1;


				// The problem is that the regex `[^\\]]*` stops at the first `]`
				// which is inside the wikilink `[[Task Roles Demo/People/Me|@Me]]`
				// It should continue until it finds the closing bracket of the role
			}
		});
	});
});
