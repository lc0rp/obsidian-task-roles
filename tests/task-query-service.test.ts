import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueryService } from '../src/services/task-query.service';
import { TaskCacheService } from '../src/services/task-cache.service';
import { ViewFilters } from '../src/types';
import type TaskRolesPlugin from '../src/main';

// Mock the plugin and dependencies
const mockPlugin = {
    getVisibleRoles: () => [
        { id: 'driver', name: 'Driver', icon: '🚗' },
        { id: 'approver', name: 'Approver', icon: '✅' }
    ],
    settings: {
        taskDisplayMode: 'detailed'
    }
} as TaskRolesPlugin;

const mockTaskCacheService = {
    getAllTasks: () => []
} as TaskCacheService;

describe('TaskQueryService Status Filtering Bug', () => {
    let taskQueryService: TaskQueryService;

    beforeEach(() => {
        taskQueryService = new TaskQueryService(mockPlugin, mockTaskCacheService);
    });

    describe('Single Status Filter', () => {
        it('should generate correct query for single done status', () => {
            const filters: ViewFilters = {
                statuses: ['done']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('done');
        });

        it('should generate correct query for single todo status', () => {
            const filters: ViewFilters = {
                statuses: ['todo']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('not done');
        });

        it('should generate correct query for single in-progress status', () => {
            const filters: ViewFilters = {
                statuses: ['in-progress']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('filter by function task.status.type === \'IN_PROGRESS\'');
        });

        it('should generate correct query for single cancelled status', () => {
            const filters: ViewFilters = {
                statuses: ['cancelled']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('filter by function task.status.type === \'CANCELLED\'');
        });
    });

    describe('Multiple Status Filter Bug', () => {
        it('should handle done + todo combination correctly', () => {
            const filters: ViewFilters = {
                statuses: ['done', 'todo']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            // Pure todo/done combinations use simple Tasks plugin syntax
            expect(query).toBe('(done OR not done)');
        });

        it('should handle done + in-progress combination correctly', () => {
            const filters: ViewFilters = {
                statuses: ['done', 'in-progress']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            // Now generates consistent query using task.status.type for all statuses
            expect(query).toBe('filter by function (task.status.type === \'DONE\' || task.status.type === \'IN_PROGRESS\')');
        });

        it('should handle done + cancelled combination correctly', () => {
            const filters: ViewFilters = {
                statuses: ['done', 'cancelled']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            // Now generates consistent query using task.status.type for all statuses
            expect(query).toBe('filter by function (task.status.type === \'DONE\' || task.status.type === \'CANCELLED\')');
        });

        it('should handle todo + in-progress combination correctly', () => {
            const filters: ViewFilters = {
                statuses: ['todo', 'in-progress']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('filter by function (task.status.type === \'TODO\' || task.status.type === \'IN_PROGRESS\')');
        });

        it('should handle all status combinations correctly', () => {
            const filters: ViewFilters = {
                statuses: ['todo', 'in-progress', 'done', 'cancelled']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            // Now uses consistent task.status.type for all statuses
            expect(query).toBe('filter by function (task.status.type === \'TODO\' || task.status.type === \'IN_PROGRESS\' || task.status.type === \'DONE\' || task.status.type === \'CANCELLED\')');
        });
    });

    describe('Status Filter with Other Filters', () => {
        it('should handle done status with role filter', () => {
            const filters: ViewFilters = {
                statuses: ['done'],
                roles: ['driver']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            const lines = query.split('\n');
            expect(lines).toContain('role:Driver');
            expect(lines).toContain('done');
        });

        it('should handle multiple statuses with role filter', () => {
            const filters: ViewFilters = {
                statuses: ['done', 'in-progress'],
                roles: ['driver']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            const lines = query.split('\n');
            expect(lines).toContain('role:Driver');
            expect(lines).toContain('filter by function (task.status.type === \'DONE\' || task.status.type === \'IN_PROGRESS\')');
        });
    });

    describe('Fixed - Consistent Status Handling', () => {
        it('should use consistent status.type for all statuses', () => {
            const filters: ViewFilters = {
                statuses: ['done', 'in-progress', 'todo', 'cancelled']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            // After fix, this now uses task.status.type consistently
            expect(query).toBe('filter by function (task.status.type === \'DONE\' || task.status.type === \'IN_PROGRESS\' || task.status.type === \'TODO\' || task.status.type === \'CANCELLED\')');
        });
    });
});