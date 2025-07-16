import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueryService } from '../src/services/task-query.service';
import { TaskCacheService } from '../src/services/task-cache.service';
import { ViewFilters, ViewLayout } from '../src/types';
import type TaskRolesPlugin from '../src/main';

// Mock the plugin and dependencies
const mockPlugin = {
    getVisibleRoles: () => [
        { id: 'driver', name: 'Driver', icon: '🚗' },
        { id: 'approver', name: 'Approver', icon: '👍' }
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
            // When both todo and done are selected, no status filter is added
            // as this would match all tasks - avoids Boolean combination error
            expect(query).toBe('');
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

    describe('Bug Scenario from Image', () => {
        it('should handle DONE filter in status column layout without errors', () => {
            // This tests the specific scenario where DONE status column combines with other filters
            const filters: ViewFilters = {
                statuses: ['done']
            };

            const query = taskQueryService.buildTaskQueryFromFilters(filters);
            expect(query).toBe('done');
            
            // Also test that this works in a filter function context
            const mixedFilters: ViewFilters = {
                statuses: ['done', 'cancelled']
            };
            
            const mixedQuery = taskQueryService.buildTaskQueryFromFilters(mixedFilters);
            expect(mixedQuery).toBe('filter by function (task.status.type === \'DONE\' || task.status.type === \'CANCELLED\')');
        });
        
        it('should handle DONE in column status filter without breaking other columns', () => {
            // Test that the buildColumnQueries method works correctly with DONE status
            const filters: ViewFilters = {
                roles: ['driver'] // Some base filter
            };
            
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            // Should have 4 status columns
            expect(columns.length).toBe(4);
            
            // Find the DONE column and verify it's properly formatted
            const doneColumn = columns.find(col => col.title === 'Done');
            expect(doneColumn).toBeDefined();
            expect(doneColumn!.query).toBe('role:Driver\nfilter by function task.status.type === \'DONE\'');
        });
    });

    describe('Status Column Separation Issues', () => {
        it('should generate separate queries for each status column', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            expect(columns.length).toBe(4);
            
            // Find each column
            const todoColumn = columns.find(col => col.title === 'To Do');
            const inProgressColumn = columns.find(col => col.title === 'In Progress');
            const doneColumn = columns.find(col => col.title === 'Done');
            const cancelledColumn = columns.find(col => col.title === 'Cancelled');
            
            expect(todoColumn).toBeDefined();
            expect(inProgressColumn).toBeDefined();
            expect(doneColumn).toBeDefined();
            expect(cancelledColumn).toBeDefined();
        });

        it('should ensure TODO column excludes in-progress items', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            const todoColumn = columns.find(col => col.title === 'To Do');
            expect(todoColumn).toBeDefined();
            
            // TODO column should use task.status.type === 'TODO' to exclude in-progress items
            // Currently it uses 'not done' which would include in-progress items
            expect(todoColumn!.query).toBe('filter by function task.status.type === \'TODO\'');
        });

        it('should ensure IN_PROGRESS column excludes todo items', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            const inProgressColumn = columns.find(col => col.title === 'In Progress');
            expect(inProgressColumn).toBeDefined();
            
            // IN_PROGRESS column should only include in-progress items
            expect(inProgressColumn!.query).toBe('filter by function task.status.type === \'IN_PROGRESS\'');
        });

        it('should ensure DONE column excludes cancelled items', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            const doneColumn = columns.find(col => col.title === 'Done');
            expect(doneColumn).toBeDefined();
            
            // DONE column should use task.status.type === 'DONE' to exclude cancelled items
            // Currently it uses 'done' which would include cancelled items
            expect(doneColumn!.query).toBe('filter by function task.status.type === \'DONE\'');
        });

        it('should ensure CANCELLED column excludes done items', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            const cancelledColumn = columns.find(col => col.title === 'Cancelled');
            expect(cancelledColumn).toBeDefined();
            
            // CANCELLED column should only include cancelled items
            expect(cancelledColumn!.query).toBe('filter by function task.status.type === \'CANCELLED\'');
        });

        it('should handle base filters with status columns correctly', () => {
            const filters: ViewFilters = {
                roles: ['driver']
            };
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            // All columns should include the base filter
            const todoColumn = columns.find(col => col.title === 'To Do');
            const doneColumn = columns.find(col => col.title === 'Done');
            
            expect(todoColumn!.query).toBe('role:Driver\nfilter by function task.status.type === \'TODO\'');
            expect(doneColumn!.query).toBe('role:Driver\nfilter by function task.status.type === \'DONE\'');
        });
    });

    describe('User Requirements Verification', () => {
        it('should meet all user requirements for status column separation', () => {
            const filters: ViewFilters = {};
            const columns = taskQueryService.buildColumnQueries(ViewLayout.STATUS, filters);
            
            expect(columns.length).toBe(4);
            
            // Get all columns
            const todoColumn = columns.find(col => col.title === 'To Do');
            const inProgressColumn = columns.find(col => col.title === 'In Progress');
            const doneColumn = columns.find(col => col.title === 'Done');
            const cancelledColumn = columns.find(col => col.title === 'Cancelled');
            
            // Verify all columns exist
            expect(todoColumn).toBeDefined();
            expect(inProgressColumn).toBeDefined();
            expect(doneColumn).toBeDefined();
            expect(cancelledColumn).toBeDefined();
            
            // Verify specific requirements:
            // 1. TODO column doesn't include in-progress items
            expect(todoColumn!.query).toBe('filter by function task.status.type === \'TODO\'');
            
            // 2. IN_PROGRESS column doesn't include todo items
            expect(inProgressColumn!.query).toBe('filter by function task.status.type === \'IN_PROGRESS\'');
            
            // 3. DONE column doesn't include cancelled items
            expect(doneColumn!.query).toBe('filter by function task.status.type === \'DONE\'');
            
            // 4. CANCELLED column doesn't include done items
            expect(cancelledColumn!.query).toBe('filter by function task.status.type === \'CANCELLED\'');
            
            // Verify all columns use consistent filtering approach
            const allQueries = columns.map(col => col.query);
            allQueries.forEach(query => {
                expect(query).toContain('filter by function task.status.type ===');
            });
        });
    });
});