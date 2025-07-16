import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskQueryService } from '../src/services/task-query.service';
import { TaskCacheService } from '../src/services/task-cache.service';
import { ViewFilters, Role } from '../src/types';

// Mock plugin
const mockPlugin = {
    getVisibleRoles: vi.fn(() => [
        { id: 'driver', name: 'Driver', icon: '🚗' },
        { id: 'approver', name: 'Approver', icon: '✅' }
    ] as Role[])
};

const mockTaskCacheService = {} as TaskCacheService;

describe('TaskQueryService', () => {
    let service: TaskQueryService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new TaskQueryService(mockPlugin as any, mockTaskCacheService);
    });

    it('should build query from role filters', () => {
        const filters: ViewFilters = {
            roles: ['driver', 'approver'],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(description includes 🚗 OR description includes ✅)');
    });

    it('should handle "none-set" role filter', () => {
        const filters: ViewFilters = {
            roles: ['none-set'],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('description does not include 🚗\ndescription does not include ✅');
    });

    it('should build query from people filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: ['john', 'jane'],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(assignee:john OR assignee:jane)');
    });

    it('should build query from company filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: [],
            companies: ['acme', 'corp'],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(assignee:acme OR assignee:corp)');
    });

    it('should build query from status filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: [],
            companies: [],
            statuses: ['todo', 'done'],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        // When both todo and done are selected, no status filter is needed
        // as this would match all tasks - avoids Boolean combination error
        expect(query).toBe('');
    });

    it('should build query from tag filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: [],
            companies: [],
            statuses: [],
            tags: ['urgent', 'project'],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(#urgent OR #project)');
    });

    it('should build query from priority filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priorities: ['high', 'medium']
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(priority is high OR priority is medium)');
    });

    it('should combine multiple filter types with AND', () => {
        const filters: ViewFilters = {
            roles: ['driver'],
            people: ['john'],
            companies: [],
            statuses: ['todo'],
            tags: ['urgent'],
            priorities: ['high']
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('description includes 🚗\nassignee:john\nnot done\nfilter by function task.status.type !== \'IN_PROGRESS\'\n(priority is high)\n#urgent');
    });

    it('should return empty string for no filters', () => {
        const filters: ViewFilters = {
            roles: [],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priorities: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('');
    });

    it('should handle unknown role IDs', () => {
        const filters: ViewFilters = {
            roles: ['unknown-role'],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('');
    });

    it('should handle mixed role types', () => {
        const filters: ViewFilters = {
            roles: ['driver', 'none-set', 'unknown-role'],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('(description includes 🚗 OR (description does not include 🚗 AND description does not include ✅))');
    });

    it('should handle todo+done combination with other filters to avoid Boolean combination error', () => {
        const filters: ViewFilters = {
            roles: ['driver'],
            people: [],
            companies: [],
            statuses: ['todo', 'done'], // This should not generate "(done OR not done)" error
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        // Should only include role filter, not status filter to avoid Boolean combination error
        expect(query).toBe('description includes 🚗\nfilter by function task.status.type !== \'IN_PROGRESS\'\nfilter by function task.status.type !== \'CANCELLED\'');
    });

    it('should handle "all" role filter by skipping role filtering', () => {
        const filters: ViewFilters = {
            roles: ['all'],
            people: ['john'],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('assignee:john');
    });

    it('should handle mixed "all" with other roles by skipping role filtering', () => {
        const filters: ViewFilters = {
            roles: ['driver', 'all'],
            people: [],
            companies: [],
            statuses: [],
            tags: [],
            priority: []
        };

        const query = service.buildTaskQueryFromFilters(filters);
        expect(query).toBe('');
    });
});