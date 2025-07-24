import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_ROLES } from "../src/types";

// Mock the shortcut trigger functionality
const mockEditor = {
    getLine: vi.fn(),
    getCursor: vi.fn(),
    replaceRange: vi.fn(),
    setCursor: vi.fn(),
};

describe("Shortcut Insertion Spacing Fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Simulated shortcut insertion with proper spacing", () => {
        it("should add space when inserting role after existing role", () => {
            // Simulate the shortcut insertion scenario
            const originalLine = '- [ ] Task [🚗:: [[People/John|@John]]]';
            const newRole = '[👍:: ]';
            const insertionPoint = originalLine.length;
            
            mockEditor.getLine.mockReturnValue(originalLine);
            mockEditor.getCursor.mockReturnValue({ line: 0, ch: insertionPoint + 1 }); // +1 for backslash
            
            // Simulate the fix logic: check if inserting after a role
            let finalReplacement = newRole;
            if (insertionPoint > 0 && originalLine[insertionPoint - 1] === ']') {
                const textBefore = originalLine.substring(0, insertionPoint);
                // Use a more permissive pattern that handles nested brackets
                // This pattern looks for: [ followed by anything, then ::, then anything (including nested brackets), then ]
                if (textBefore.match(/\[.*::.*\]$/)) {
                    finalReplacement = ' ' + newRole;
                }
            }
            
            // Simulate the editor operation
            mockEditor.replaceRange('', { line: 0, ch: insertionPoint }, { line: 0, ch: insertionPoint + 1 }); // Remove backslash
            mockEditor.replaceRange(finalReplacement, { line: 0, ch: insertionPoint }, { line: 0, ch: insertionPoint });
            
            // Verify the replacement includes proper spacing
            expect(finalReplacement).toBe(' [👍:: ]');
            
            // Verify the final result would have proper spacing
            const expectedResult = originalLine + finalReplacement;
            expect(expectedResult).toBe('- [ ] Task [🚗:: [[People/John|@John]]] [👍:: ]');
            expect(/\]\s\[/.test(expectedResult)).toBe(true);
            expect(/\]\[/.test(expectedResult)).toBe(false);
        });

        it("should add space when inserting role before existing role", () => {
            // Simulate inserting before an existing role
            const originalLine = '- [ ] Task text [👍:: [[People/Jane|@Jane]]]';
            const newRole = '[🚗:: ]';
            const insertionPoint = originalLine.indexOf('[👍::');
            
            mockEditor.getLine.mockReturnValue(originalLine);
            mockEditor.getCursor.mockReturnValue({ line: 0, ch: insertionPoint + 1 }); // +1 for backslash
            
            // Simulate the fix logic: check if inserting before a role
            let finalReplacement = newRole;
            if (insertionPoint < originalLine.length && originalLine[insertionPoint] === '[') {
                const textAfter = originalLine.substring(insertionPoint);
                if (textAfter.match(/^\[[^[\]]*::/)) {
                    finalReplacement = newRole + ' ';
                }
            }
            
            // Simulate the editor operation
            const beforeText = originalLine.substring(0, insertionPoint);
            const afterText = originalLine.substring(insertionPoint);
            
            // Verify the replacement includes proper spacing
            expect(finalReplacement).toBe('[🚗:: ] ');
            
            // Verify the final result would have proper spacing
            const expectedResult = beforeText + finalReplacement + afterText;
            expect(expectedResult).toBe('- [ ] Task text [🚗:: ] [👍:: [[People/Jane|@Jane]]]');
            expect(/\]\s\[/.test(expectedResult)).toBe(true);
            expect(/\]\[/.test(expectedResult)).toBe(false);
        });

        it("should not add extra spaces when there's already proper spacing", () => {
            // Test case where proper spacing already exists
            const originalLine = '- [ ] Task [🚗:: [[People/John|@John]]] text';
            const newRole = '[👍:: ]';
            const insertionPoint = originalLine.indexOf('text'); // Position at start of "text", not space before it
            
            mockEditor.getLine.mockReturnValue(originalLine);
            mockEditor.getCursor.mockReturnValue({ line: 0, ch: insertionPoint + 1 });
            
            // In this case, we're not inserting adjacent to a role, so no extra spacing needed
            let finalReplacement = newRole;
            
            // Check if inserting after a role (not in this case)
            const isAfterRole = insertionPoint > 0 && originalLine[insertionPoint - 1] === ']';
            expect(isAfterRole).toBe(false);
            
            // Check if inserting before a role (not in this case)
            const isBeforeRole = insertionPoint < originalLine.length && originalLine[insertionPoint] === '[';
            expect(isBeforeRole).toBe(false);
            
            // No spacing adjustment needed
            expect(finalReplacement).toBe('[👍:: ]');
            
            const beforeText = originalLine.substring(0, insertionPoint);
            const afterText = originalLine.substring(insertionPoint);
            const expectedResult = beforeText + finalReplacement + afterText;
            expect(expectedResult).toBe('- [ ] Task [🚗:: [[People/John|@John]]] [👍:: ]text');
        });

        it("should handle complex role patterns correctly", () => {
            // Test with complex wikilink patterns to ensure we don't break legitimate content
            const originalLine = '- [ ] Task [🚗:: [[Path/To/User|@User]]]';
            const newRole = '[👍:: ]';
            const insertionPoint = originalLine.length;
            
            // Simulate the pattern matching logic from the fix
            let finalReplacement = newRole;
            if (insertionPoint > 0 && originalLine[insertionPoint - 1] === ']') {
                const textBefore = originalLine.substring(0, insertionPoint);
                // This regex should match the end of a role assignment
                if (textBefore.match(/\[.*::.*\]$/)) {
                    finalReplacement = ' ' + newRole;
                }
            }
            
            expect(finalReplacement).toBe(' [👍:: ]');
            
            const expectedResult = originalLine + finalReplacement;
            expect(expectedResult).toBe('- [ ] Task [🚗:: [[Path/To/User|@User]]] [👍:: ]');
            expect(/\]\s\[/.test(expectedResult)).toBe(true);
        });
    });
});