import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskRolesService } from '../src/services/task-roles.service';
import { DEFAULT_SETTINGS } from '../src/types/index';

// Mock Obsidian APIs
const mockVault = {
    adapter: {
        exists: vi.fn(),
    },
    create: vi.fn(),
    createFolder: vi.fn(),
};

const appStub = { 
    vault: mockVault,
    workspace: {} 
};

function createService() {
    const service = new TaskRolesService(appStub, DEFAULT_SETTINGS);
    service.refreshAssigneeCache = vi.fn(); // Mock the cache refresh
    return service;
}

describe('TaskRolesService - @me Contact Functions', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
    });

    describe('meContactExists()', () => {
        it('returns true when Me.md exists', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/Me.md');
            });

            const result = await service.meContactExists();
            expect(result).toBe(true);
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/Me.md');
        });

        it('returns true when me.md exists (lowercase)', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/me.md');
            });

            const result = await service.meContactExists();
            expect(result).toBe(true);
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/Me.md');
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/me.md');
        });

        it('returns true when ME.md exists (uppercase)', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/ME.md');
            });

            const result = await service.meContactExists();
            expect(result).toBe(true);
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/Me.md');
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/me.md');
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/ME.md');
        });

        it('returns false when no @me file exists', async () => {
            const service = createService();
            mockVault.adapter.exists.mockResolvedValue(false);

            const result = await service.meContactExists();
            expect(result).toBe(false);
            expect(mockVault.adapter.exists).toHaveBeenCalledTimes(3);
        });

        it('checks all case variations in order', async () => {
            const service = createService();
            mockVault.adapter.exists.mockResolvedValue(false);

            await service.meContactExists();

            expect(mockVault.adapter.exists).toHaveBeenNthCalledWith(1, 'Contacts/Me.md');
            expect(mockVault.adapter.exists).toHaveBeenNthCalledWith(2, 'Contacts/me.md');
            expect(mockVault.adapter.exists).toHaveBeenNthCalledWith(3, 'Contacts/ME.md');
        });

        it('uses custom contact directory from settings', async () => {
            const customSettings = { ...DEFAULT_SETTINGS, contactDirectory: 'MyContacts' };
            const service = new TaskRolesService(appStub, customSettings);
            service.refreshAssigneeCache = vi.fn();
            mockVault.adapter.exists.mockResolvedValue(false);

            await service.meContactExists();

            expect(mockVault.adapter.exists).toHaveBeenCalledWith('MyContacts/Me.md');
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('MyContacts/me.md');
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('MyContacts/ME.md');
        });

        it('stops checking after finding first match', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/Me.md');
            });

            const result = await service.meContactExists();
            expect(result).toBe(true);
            expect(mockVault.adapter.exists).toHaveBeenCalledTimes(1);
            expect(mockVault.adapter.exists).toHaveBeenCalledWith('Contacts/Me.md');
        });
    });

    describe('createMeContact()', () => {
        it('does not create file when Me.md already exists', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/Me.md');
            });

            await service.createMeContact();

            expect(mockVault.create).not.toHaveBeenCalled();
            expect(mockVault.createFolder).not.toHaveBeenCalled();
        });

        it('does not create file when me.md already exists (lowercase)', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/me.md');
            });

            await service.createMeContact();

            expect(mockVault.create).not.toHaveBeenCalled();
            expect(mockVault.createFolder).not.toHaveBeenCalled();
        });

        it('does not create file when ME.md already exists (uppercase)', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                return Promise.resolve(path === 'Contacts/ME.md');
            });

            await service.createMeContact();

            expect(mockVault.create).not.toHaveBeenCalled();
            expect(mockVault.createFolder).not.toHaveBeenCalled();
        });

        it('creates Me.md file when no @me file exists', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                // Directory exists, but no @me files exist
                return Promise.resolve(path === 'Contacts');
            });

            await service.createMeContact();

            expect(mockVault.create).toHaveBeenCalledWith(
                'Contacts/Me.md', 
                '# Me\n\nThis is your personal contact file.'
            );
            expect(service.refreshAssigneeCache).toHaveBeenCalled();
        });

        it('creates directory if it does not exist', async () => {
            const service = createService();
            mockVault.adapter.exists.mockResolvedValue(false);

            await service.createMeContact();

            expect(mockVault.createFolder).toHaveBeenCalledWith('Contacts');
            expect(mockVault.create).toHaveBeenCalledWith(
                'Contacts/Me.md', 
                '# Me\n\nThis is your personal contact file.'
            );
        });

        it('uses custom contact directory from settings', async () => {
            const customSettings = { ...DEFAULT_SETTINGS, contactDirectory: 'People' };
            const service = new TaskRolesService(appStub, customSettings);
            service.refreshAssigneeCache = vi.fn();
            mockVault.adapter.exists.mockResolvedValue(false);

            await service.createMeContact();

            expect(mockVault.createFolder).toHaveBeenCalledWith('People');
            expect(mockVault.create).toHaveBeenCalledWith(
                'People/Me.md', 
                '# Me\n\nThis is your personal contact file.'
            );
        });

        it('always creates file with capitalized name even if other cases exist', async () => {
            const service = createService();
            mockVault.adapter.exists.mockImplementation((path) => {
                // Directory exists, no @me files exist
                return Promise.resolve(path === 'Contacts');
            });

            await service.createMeContact();

            expect(mockVault.create).toHaveBeenCalledWith(
                'Contacts/Me.md', 
                '# Me\n\nThis is your personal contact file.'
            );
        });
    });
});