import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleSuggest } from '../src/editor/role-suggest';
import { DEFAULT_ROLES } from '../src/types';

// Mock Obsidian types
const mockApp = {};
const mockPlugin = {
    getVisibleRoles: vi.fn(() => DEFAULT_ROLES),
    taskRolesService: {
        escapeRegex: vi.fn((str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    }
};

const mockEditor = {
    getLine: vi.fn(),
    replaceRange: vi.fn(),
    setCursor: vi.fn()
};

const mockContext = {
    start: { line: 0, ch: 0 },
    end: { line: 0, ch: 2 },
    query: 'd',
    editor: mockEditor
};

describe('Role Shortcuts', () => {
    let roleSuggest: RoleSuggest;

    beforeEach(() => {
        vi.clearAllMocks();
        roleSuggest = new RoleSuggest(mockApp as any, mockPlugin as any);
        (roleSuggest as any).context = mockContext;
        
        // Mock the isInTaskBlock method
        vi.spyOn(roleSuggest as any, 'isInTaskBlock').mockReturnValue(false);
    });

    describe('Default Role Shortcuts', () => {
        it('should have correct shortcuts for default roles', () => {
            const drivers = DEFAULT_ROLES.find(r => r.id === 'drivers');
            const approvers = DEFAULT_ROLES.find(r => r.id === 'approvers');
            const contributors = DEFAULT_ROLES.find(r => r.id === 'contributors');
            const informed = DEFAULT_ROLES.find(r => r.id === 'informed');

            expect(drivers?.shortcut).toBe('d');
            expect(approvers?.shortcut).toBe('a');
            expect(contributors?.shortcut).toBe('c');
            expect(informed?.shortcut).toBe('i');
        });

        it('should trigger on backslash followed by role shortcut on task line', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Some task \\d');
            
            const result = roleSuggest.onTrigger(
                { line: 0, ch: 18 }, // Cursor after the 'd'
                mockEditor as any
            );
            
            expect(result).toBeTruthy();
            expect(result?.query).toBe('d');
            expect(result?.start).toEqual({ line: 0, ch: 16 });
        });

        it('should not trigger on non-task lines', () => {
            mockEditor.getLine.mockReturnValue('Just some text \\d');
            
            const result = roleSuggest.onTrigger(
                { line: 0, ch: 17 },
                mockEditor as any
            );

            expect(result).toBeNull();
        });

        it('should trigger in task code blocks', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Some task \\d');
            vi.spyOn(roleSuggest as any, 'isInTaskBlock').mockReturnValue(true);
            
            const result = roleSuggest.onTrigger(
                { line: 0, ch: 18 }, // Cursor after the 'd'
                mockEditor as any
            );

            expect(result).toBeTruthy();
            expect(result?.query).toBe('d');
        });
    });

    describe('Role Filtering', () => {
        it('should filter suggestions by shortcut query', () => {
            const suggestions = roleSuggest.getSuggestions({
                ...mockContext,
                query: 'd'
            });

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].id).toBe('drivers');
        });

        it('should return empty array for invalid shortcut', () => {
            const suggestions = roleSuggest.getSuggestions({
                ...mockContext,
                query: 'x'
            });

            expect(suggestions).toHaveLength(0);
        });
    });

    describe('Role Selection', () => {
        it('should insert correct format for normal task lines', () => {
            const driversRole = DEFAULT_ROLES.find(r => r.id === 'drivers')!;
            vi.spyOn(roleSuggest as any, 'isInTaskBlock').mockReturnValue(false);
            
            roleSuggest.selectSuggestion(driversRole);

            // First call clears the trigger, second call inserts the role
            expect(mockEditor.replaceRange).toHaveBeenNthCalledWith(1, '', mockContext.start, mockContext.end);
            expect(mockEditor.replaceRange).toHaveBeenNthCalledWith(2, '[🚗:: ]', expect.any(Object), expect.any(Object));
            expect(mockEditor.setCursor).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should insert correct format for task code blocks', () => {
            const driversRole = DEFAULT_ROLES.find(r => r.id === 'drivers')!;
            vi.spyOn(roleSuggest as any, 'isInTaskBlock').mockReturnValue(true);
            
            roleSuggest.selectSuggestion(driversRole);

            // First call clears the trigger, second call inserts the role
            expect(mockEditor.replaceRange).toHaveBeenNthCalledWith(1, '', mockContext.start, mockContext.end);
            expect(mockEditor.replaceRange).toHaveBeenNthCalledWith(2, '🚗 = ', expect.any(Object), expect.any(Object));
            expect(mockEditor.setCursor).toHaveBeenCalledWith(expect.any(Object));
        });
    });

    describe('Existing Role Detection', () => {
        it('should exclude roles already present on the line', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task [🚗:: @someone] \\a');
            
            const suggestions = roleSuggest.getSuggestions({
                ...mockContext,
                query: 'a'
            });

            // Should get approvers but not drivers (since drivers is already on line)
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].id).toBe('approvers');
        });
    });
});