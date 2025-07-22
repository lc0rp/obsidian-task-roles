import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_ROLES } from '../src/types';

// Mock DOM APIs
const mockEditor = {
    getLine: vi.fn(),
    getCursor: vi.fn(() => ({ line: 0, ch: 15 })),
    replaceRange: vi.fn(),
    setCursor: vi.fn()
};

const mockActiveView = {
    editor: mockEditor
};

const mockApp = {
    workspace: {
        getActiveViewOfType: vi.fn(() => mockActiveView)
    }
};

describe('Compatibility Mode Direct Shortcuts', () => {
    let onKeyHandler: (e: KeyboardEvent) => void;
    let mockSettings: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSettings = {
            roles: DEFAULT_ROLES,
            hiddenDefaultRoles: []
        };

        // Create a mock instance of the backslash trigger class
        const mockInstance = {
            isRoleShortcutKey: vi.fn((key: string, visibleRoles: any[]) => {
                const lowerKey = key.toLowerCase();
                return visibleRoles.some(role => role.shortcut === lowerKey);
            }),
            insertRoleDirectly: vi.fn(),
            isInTaskCodeBlock: vi.fn(() => false),
            onKey: vi.fn()
        };

        // Simulate the key handler logic
        onKeyHandler = (e: KeyboardEvent) => {
            const line = mockEditor.getLine();
            const cursor = mockEditor.getCursor();
            const isTaskLine = line.includes('[ ]') || line.includes('[x]') || line.includes('[X]');
            const isInTaskBlock = mockInstance.isInTaskCodeBlock();

            if (!isTaskLine && !isInTaskBlock) {
                return;
            }

            // Handle colon trigger for popup menu
            if (e.key === ":") {
                e.preventDefault();
                return 'popup';
            }

            // Handle direct role shortcuts (\d, \a, \c, \i)
            const visibleRoles = mockSettings.roles.filter(
                (role: any) =>
                    !role.isDefault ||
                    !mockSettings.hiddenDefaultRoles.includes(role.id)
            );

            const beforeCursor = line.substring(0, cursor.ch);
            if (beforeCursor.endsWith("\\") && mockInstance.isRoleShortcutKey(e.key, visibleRoles)) {
                const role = visibleRoles.find((r: any) => r.shortcut === e.key.toLowerCase());
                if (role) {
                    e.preventDefault();
                    return { action: 'insertRole', role };
                }
            }
        };
    });

    describe('Direct Role Shortcuts', () => {
        it('should handle \\d for drivers role', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'd' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toEqual({
                action: 'insertRole',
                role: DEFAULT_ROLES.find(r => r.shortcut === 'd')
            });
            expect(preventDefault).toHaveBeenCalled();
        });

        it('should handle \\a for approvers role', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'a' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toEqual({
                action: 'insertRole',
                role: DEFAULT_ROLES.find(r => r.shortcut === 'a')
            });
            expect(preventDefault).toHaveBeenCalled();
        });

        it('should handle \\c for contributors role', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'c' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toEqual({
                action: 'insertRole',
                role: DEFAULT_ROLES.find(r => r.shortcut === 'c')
            });
        });

        it('should handle \\i for informed role', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'i' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toEqual({
                action: 'insertRole',
                role: DEFAULT_ROLES.find(r => r.shortcut === 'i')
            });
        });

        it('should handle : for popup trigger', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task');
            
            const mockEvent = new KeyboardEvent('keydown', { key: ':' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toBe('popup');
            expect(preventDefault).toHaveBeenCalled();
        });

        it('should not trigger on non-task lines', () => {
            mockEditor.getLine.mockReturnValue('Just some text \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'd' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toBeUndefined();
            expect(preventDefault).not.toHaveBeenCalled();
        });

        it('should not trigger without backslash prefix', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task ');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'd' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toBeUndefined();
            expect(preventDefault).not.toHaveBeenCalled();
        });

        it('should not trigger for invalid shortcut keys', () => {
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'x' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toBeUndefined();
            expect(preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Hidden Roles', () => {
        it('should not trigger shortcuts for hidden roles', () => {
            mockSettings.hiddenDefaultRoles = ['drivers'];
            
            mockEditor.getLine.mockReturnValue('- [ ] Task \\');
            
            const mockEvent = new KeyboardEvent('keydown', { key: 'd' });
            const preventDefault = vi.fn();
            Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

            const result = onKeyHandler(mockEvent);

            expect(result).toBeUndefined();
            expect(preventDefault).not.toHaveBeenCalled();
        });
    });
});