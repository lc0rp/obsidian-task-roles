import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskQueryService } from '../src/services/task-query.service';
import { DateType } from '../src/types';

describe('TaskQueryService Date Filters', () => {
    let service: TaskQueryService;
    let mockApp: any;
    let mockSettings: any;

    beforeEach(() => {
        mockApp = {
            workspace: {
                getActiveViewOfType: vi.fn().mockReturnValue(null)
            }
        };

        mockSettings = {
            experimentalFeatures: {
                useTaskQueries: true
            }
        };

        service = new TaskQueryService(mockApp, mockSettings);
    });

    describe('buildTaskQueryFromFilters', () => {
        it('should handle created date range filters correctly', () => {
            const filters = {
                dateType: DateType.CREATED,
                dateRange: {
                    from: new Date('2025-07-15'),
                    to: new Date('2025-07-18'),
                    includeNotSet: false
                }
            };

            const query = service.buildTaskQueryFromFilters(filters);
            
            // Fixed implementation should use proper Tasks plugin syntax
            expect(query).toBe('(created after 2025-07-15 AND created before 2025-07-18)');
        });

        it('should handle due date single date filters correctly', () => {
            const filters = {
                dateType: DateType.DUE,
                dateRange: {
                    from: new Date('2025-07-15'),
                    to: null,
                    includeNotSet: false
                }
            };

            const query = service.buildTaskQueryFromFilters(filters);
            
            // Fixed implementation should use proper Tasks plugin syntax
            expect(query).toBe('(due after 2025-07-15)');
        });

        it('should handle no date filters correctly', () => {
            const filters = {
                dateType: DateType.CREATED,
                dateRange: {
                    from: null,
                    to: null,
                    includeNotSet: true
                }
            };

            const query = service.buildTaskQueryFromFilters(filters);
            
            // Fixed implementation should use proper Tasks plugin syntax
            expect(query).toBe('(no created date)');
        });

        it('should handle date range filters with no dates included', () => {
            const filters = {
                dateType: DateType.DUE,
                dateRange: {
                    from: new Date('2025-07-15'),
                    to: new Date('2025-07-18'),
                    includeNotSet: true
                }
            };

            const query = service.buildTaskQueryFromFilters(filters);
            
            // Fixed implementation should use proper Tasks plugin syntax with correct grouping
            expect(query).toBe('(no due date OR (due after 2025-07-15 AND due before 2025-07-18))');
        });

        it('should handle before date only', () => {
            const filters = {
                dateType: DateType.DUE,
                dateRange: {
                    from: null,
                    to: new Date('2025-07-18'),
                    includeNotSet: false
                }
            };

            const query = service.buildTaskQueryFromFilters(filters);
            
            // Fixed implementation should use proper Tasks plugin syntax
            expect(query).toBe('(due before 2025-07-18)');
        });
    });
});