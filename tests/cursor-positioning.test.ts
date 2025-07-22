import { describe, it, expect } from 'vitest';
import { TaskUtils } from '../src/utils/task-regex';

describe('TaskUtils.findRoleCursorPosition', () => {
    const testRole = { id: 'drivers', icon: '🚗', name: 'Drivers' };

    it('should find cursor position for role with existing assignees', () => {
        const line = '- [ ] Task with [🚗:: @john, @jane] and more text';
        const result = TaskUtils.findRoleCursorPosition(line, testRole);

        expect(result).toBeTruthy();
        expect(result?.position).toBe(33); // Before the closing bracket
        expect(result?.needsSeparator).toBe(true);
    });

    it('should find cursor position for role without assignees', () => {
        const line = '- [ ] Task with [🚗:: ] and more text';
        const result = TaskUtils.findRoleCursorPosition(line, testRole);

        expect(result).toBeTruthy();
        expect(result?.position).toBe(24); // Before the closing bracket
        expect(result?.needsSeparator).toBe(false);
    });

    it('should handle roles with special characters in icon', () => {
        const roleWithSpecialChars = { id: 'test', icon: '[?]', name: 'Test' };
        const line = '- [ ] Task with [[?]:: @someone] test';
        const result = TaskUtils.findRoleCursorPosition(line, roleWithSpecialChars);

        expect(result).toBeTruthy();
        expect(result?.needsSeparator).toBe(true);
    });

    it('should return null for non-existent role', () => {
        const line = '- [ ] Task with [👍:: @john] test';
        const result = TaskUtils.findRoleCursorPosition(line, testRole);

        expect(result).toBeNull();
    });

    it('should handle legacy format', () => {
        const line = '- [ ] Task with 🚗 [[Contacts/John|@john]] test';
        const result = TaskUtils.findRoleCursorPosition(line, testRole);

        expect(result).toBeTruthy();
        expect(result?.needsSeparator).toBe(false);
    });
});

describe('Shortcut uniqueness validation', () => {
    it('should detect duplicate shortcuts', () => {
        const roles = [
            { id: 'drivers', shortcut: 'd', name: 'Drivers' },
            { id: 'approvers', shortcut: 'a', name: 'Approvers' },
            { id: 'contributors', shortcut: 'c', name: 'Contributors' }
        ];

        const isDuplicate = (shortcut: string, excludeId?: string) => {
            return roles.some(role => 
                role.shortcut === shortcut && role.id !== excludeId
            );
        };

        expect(isDuplicate('d')).toBe(true);
        expect(isDuplicate('d', 'drivers')).toBe(false);
        expect(isDuplicate('x')).toBe(false);
        expect(isDuplicate('')).toBe(false);
    });
});