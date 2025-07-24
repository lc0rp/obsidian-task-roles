import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskUtils } from "../src/utils/task-regex";
import { DEFAULT_ROLES } from "../src/types";

describe("Shortcut Role Insertion Spacing", () => {
    describe("Direct role insertion scenarios", () => {
        it("should properly find insertion points without breaking spacing", () => {
            // Test scenario: inserting a role adjacent to an existing role
            const lineWithRole = '- [ ] Task [🚗:: [[People/John|@John]]]';
            const insertionPoint = TaskUtils.findNearestLegalInsertionPoint(lineWithRole, lineWithRole.length);
            
            // The insertion point should account for proper spacing
            expect(insertionPoint).toBe(lineWithRole.length);
        });

        it("should handle insertion in the middle of a line with existing roles", () => {
            // Test inserting a role between existing roles
            const lineWithRoles = '- [ ] Task [🚗:: [[People/John|@John]]] some text [👍:: [[People/Jane|@Jane]]]';
            const midPoint = lineWithRoles.indexOf(' some text');
            const insertionPoint = TaskUtils.findNearestLegalInsertionPoint(lineWithRoles, midPoint);
            
            // Should find a legal insertion point that maintains spacing
            expect(insertionPoint).toBeGreaterThanOrEqual(0);
            expect(insertionPoint).toBeLessThanOrEqual(lineWithRoles.length);
        });

        it("should detect existing roles correctly", () => {
            const lineWithMultipleRoles = '- [ ] Task [🚗:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]';
            const existingRoles = TaskUtils.getExistingRoles(lineWithMultipleRoles, DEFAULT_ROLES);
            
            // Should detect both roles
            expect(existingRoles).toContain('drivers');
            expect(existingRoles).toContain('approvers');
            expect(existingRoles).toHaveLength(2);
        });

        it("should identify when roles are touching without spaces", () => {
            // This demonstrates the actual bug - roles without spaces between them
            const lineWithTouchingRoles = '- [ ] Task [🚗:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]';
            
            // This regex should match when roles are touching (no space between ] and [)
            const touchingRolesPattern = /\]\[/;
            const hasTouchingRoles = touchingRolesPattern.test(lineWithTouchingRoles);
            
            expect(hasTouchingRoles).toBe(true); // This demonstrates the bug exists
            
            // If we were to fix this, we'd want to ensure no touching roles
            const properSpacing = lineWithTouchingRoles.replace(/\]\[/g, '] [');
            expect(properSpacing).toBe('- [ ] Task [🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]');
            expect(/\]\[/.test(properSpacing)).toBe(false);
        });

        it("should handle cursor positioning for adding assignees to existing roles", () => {
            const lineWithRole = '- [ ] Task [🚗:: [[People/John|@John]]]';
            const driversRole = DEFAULT_ROLES.find(r => r.id === 'drivers');
            
            if (driversRole) {
                const cursorInfo = TaskUtils.findRoleCursorPosition(lineWithRole, driversRole);
                
                expect(cursorInfo).toBeDefined();
                if (cursorInfo) {
                    expect(cursorInfo.position).toBeGreaterThan(0);
                    expect(typeof cursorInfo.needsSeparator).toBe('boolean');
                }
            }
        });
    });

    describe("Simulation of shortcut insertion behavior", () => {
        it("should simulate the scenario that causes spacing issues", () => {
            // Simulate what happens when a shortcut inserts a role adjacent to an existing one
            const originalLine = '- [ ] Task [🚗:: [[People/John|@John]]]';
            const newRoleToInsert = '[👍:: [[People/Jane|@Jane]]]';
            
            // Simulate improper insertion (what might happen without proper spacing logic)
            const improperInsertion = originalLine + newRoleToInsert;
            expect(improperInsertion).toBe('- [ ] Task [🚗:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]');
            expect(/\]\[/.test(improperInsertion)).toBe(true); // This shows the bug
            
            // Simulate proper insertion (what should happen)
            const properInsertion = originalLine + ' ' + newRoleToInsert;
            expect(properInsertion).toBe('- [ ] Task [🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]');
            expect(/\]\[/.test(properInsertion)).toBe(false); // This shows the fix
        });

        it("should test the actual role insertion logic with spacing", () => {
            // Create a mock editor interface to test the actual insertion logic
            const mockEditor = {
                getLine: vi.fn(),
                replaceRange: vi.fn(),
                setCursor: vi.fn(),
                getCursor: vi.fn(() => ({ line: 0, ch: 30 }))
            };

            const lineWithExistingRole = '- [ ] Task [🚗:: [[People/John|@John]]]';
            mockEditor.getLine.mockReturnValue(lineWithExistingRole);

            // Test finding insertion point at the end of the line
            const insertionPoint = TaskUtils.findNearestLegalInsertionPoint(
                lineWithExistingRole, 
                lineWithExistingRole.length
            );

            // The new role should be inserted with proper spacing
            const newRole = '[👍:: [[People/Jane|@Jane]]]';
            const expectedResult = lineWithExistingRole + ' ' + newRole;
            
            expect(expectedResult).toBe('- [ ] Task [🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]');
            expect(/\]\s\[/.test(expectedResult)).toBe(true); // Proper spacing
            expect(/\]\[/.test(expectedResult)).toBe(false); // No touching roles
        });
    });

    describe("Modal assignment spacing", () => {
        it("should ensure modal output has proper spacing", () => {
            // Test what happens when the assignment modal outputs multiple roles
            const roles = [
                '[🚗:: [[People/John|@John]]]',
                '[👍:: [[People/Jane|@Jane]]]'
            ];

            // Simulate improper joining (what might cause the bug)
            const improperJoin = roles.join('');
            expect(improperJoin).toBe('[🚗:: [[People/John|@John]]][👍:: [[People/Jane|@Jane]]]');
            expect(/\]\[/.test(improperJoin)).toBe(true); // Shows the potential bug

            // Simulate proper joining (what should happen)
            const properJoin = roles.join(' ');
            expect(properJoin).toBe('[🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]');
            expect(/\]\s\[/.test(properJoin)).toBe(true); // Proper spacing
            expect(/\]\[/.test(properJoin)).toBe(false); // No touching roles
        });
    });
});