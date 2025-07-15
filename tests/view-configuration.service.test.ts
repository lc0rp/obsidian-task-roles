import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewConfigurationService } from '../src/services/view-configuration.service';
import { App } from 'obsidian';
import { ViewConfiguration, ViewLayout, ViewFilters, SortOption } from '../src/types';

// Mock plugin
const mockPlugin = {
    settings: {
        savedViews: [] as ViewConfiguration[]
    },
    saveSettings: vi.fn(() => Promise.resolve())
};

const mockApp = {} as App;

describe('ViewConfigurationService', () => {
    let service: ViewConfigurationService;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPlugin.settings.savedViews = [];
        service = new ViewConfigurationService(mockApp, mockPlugin as any);
    });

    it('should save a new view configuration', async () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        const result = await service.saveViewConfiguration(
            'Test View',
            layout,
            filters,
            sortBy
        );

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockPlugin.settings.savedViews).toHaveLength(1);
        expect(mockPlugin.settings.savedViews[0].name).toBe('Test View');
        expect(mockPlugin.saveSettings).toHaveBeenCalledOnce();
    });

    it('should prevent saving duplicate view names without overwrite', async () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        // Save first view
        await service.saveViewConfiguration('Test View', layout, filters, sortBy);

        // Try to save another view with same name
        const result = await service.saveViewConfiguration('Test View', layout, filters, sortBy);

        expect(result.success).toBe(false);
        expect(result.error).toBe('A view with this name already exists');
        expect(mockPlugin.settings.savedViews).toHaveLength(1);
    });

    it('should allow overwriting existing view', async () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        // Save first view
        await service.saveViewConfiguration('Test View', layout, filters, sortBy);
        const originalId = mockPlugin.settings.savedViews[0].id;

        // Overwrite with new configuration
        const newLayout: ViewLayout = { type: 'list', columns: 1 };
        const result = await service.saveViewConfiguration(
            'Test View',
            newLayout,
            filters,
            sortBy,
            true // overwrite
        );

        expect(result.success).toBe(true);
        expect(mockPlugin.settings.savedViews).toHaveLength(1);
        expect(mockPlugin.settings.savedViews[0].layout.type).toBe('list');
        expect(mockPlugin.settings.savedViews[0].id).toBe(originalId);
    });

    it('should update existing view configuration', async () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        // Save initial view
        await service.saveViewConfiguration('Test View', layout, filters, sortBy);
        const viewId = mockPlugin.settings.savedViews[0].id;

        // Update the view
        const updates = {
            name: 'Updated Test View',
            layout: { type: 'list' as const, columns: 1 }
        };

        await service.updateViewConfiguration(viewId, updates);

        expect(mockPlugin.settings.savedViews[0].name).toBe('Updated Test View');
        expect(mockPlugin.settings.savedViews[0].layout.type).toBe('list');
        expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(2);
    });

    it('should delete view configuration', async () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        // Save two views
        await service.saveViewConfiguration('View 1', layout, filters, sortBy);
        await service.saveViewConfiguration('View 2', layout, filters, sortBy);
        
        expect(mockPlugin.settings.savedViews).toHaveLength(2);

        const viewId = mockPlugin.settings.savedViews[0].id;
        await service.deleteViewConfiguration(viewId);

        expect(mockPlugin.settings.savedViews).toHaveLength(1);
        expect(mockPlugin.settings.savedViews[0].name).toBe('View 2');
    });

    it('should get view configuration by id', () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        const config: ViewConfiguration = {
            id: 'test-id',
            name: 'Test View',
            layout,
            filters,
            sortBy,
            createdDate: new Date()
        };

        mockPlugin.settings.savedViews = [config];

        const result = service.getViewConfiguration('test-id');
        expect(result).toEqual(config);

        const notFound = service.getViewConfiguration('nonexistent');
        expect(notFound).toBeUndefined();
    });

    it('should get all view configurations', () => {
        const layout: ViewLayout = { type: 'cards', columns: 3 };
        const filters: ViewFilters = { status: [], priority: [], tags: [], roles: [] };
        const sortBy: SortOption = { field: 'priority', direction: 'desc' };

        const config1: ViewConfiguration = {
            id: 'test-id-1',
            name: 'Test View 1',
            layout,
            filters,
            sortBy,
            createdDate: new Date()
        };

        const config2: ViewConfiguration = {
            id: 'test-id-2',
            name: 'Test View 2',
            layout,
            filters,
            sortBy,
            createdDate: new Date()
        };

        mockPlugin.settings.savedViews = [config1, config2];

        const result = service.getAllViewConfigurations();
        expect(result).toHaveLength(2);
        expect(result).toEqual([config1, config2]);
    });
});