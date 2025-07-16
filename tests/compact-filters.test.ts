import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TFile, WorkspaceLeaf } from 'obsidian';
import { TaskRolesPlugin } from '../src/main';
import { CompactFiltersComponent } from '../src/components/compact-filters';
import { ViewFilters, TaskStatus, TaskPriority } from '../src/types';

// Mock DOM elements
const mockCreateEl = vi.fn();
const mockCreateDiv = vi.fn();
const mockContainer = {
    createEl: mockCreateEl,
    createDiv: mockCreateDiv,
};

// Mock plugin
const mockPlugin = {
    settings: {
        autoApplyFilters: false,
    },
    saveSettings: vi.fn(),
} as any;

describe('CompactFiltersComponent', () => {
    let component: CompactFiltersComponent;
    let mockUpdateFiltersCallback: ReturnType<typeof vi.fn>;
    let mockCurrentFilters: ViewFilters;

    beforeEach(() => {
        mockUpdateFiltersCallback = vi.fn();
        mockCurrentFilters = {
            textSearch: 'test search',
            roles: ['driver'],
            statuses: [TaskStatus.TODO],
            priorities: [TaskPriority.HIGH],
            people: ['@john'],
            companies: ['+company'],
            dateType: 'due',
            dateRange: {
                from: new Date('2023-01-01'),
                to: new Date('2023-12-31'),
                includeNotSet: false,
            },
        };

        // Reset mocks
        vi.clearAllMocks();
        
        // Setup DOM mocks
        mockCreateEl.mockReturnValue({
            createEl: mockCreateEl,
            createDiv: mockCreateDiv,
            style: {},
            title: '',
            onclick: null,
            onchange: null,
            value: '',
            checked: false,
            type: '',
        });
        
        mockCreateDiv.mockReturnValue({
            createEl: mockCreateEl,
            createDiv: mockCreateDiv,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should call updateFiltersCallback with empty filters when reset button is clicked', () => {
        // Create component with current filters
        component = new CompactFiltersComponent(
            mockPlugin,
            mockCurrentFilters,
            mockUpdateFiltersCallback,
            vi.fn()
        );

        // Call clearAllFilters directly to test the behavior
        (component as any).clearAllFilters();
        
        // Verify that updateFiltersCallback was called with empty filters
        expect(mockUpdateFiltersCallback).toHaveBeenCalledWith({
            roles: [],
            people: [],
            companies: [],
            statuses: [],
            priorities: [],
            tags: [],
            dateRange: undefined,
            dateType: undefined,
            textSearch: '',
        });
    });

    it('should call updateFiltersCallback with empty filters when cancel button is clicked', () => {
        // Create component with current filters
        component = new CompactFiltersComponent(
            mockPlugin,
            mockCurrentFilters,
            mockUpdateFiltersCallback,
            vi.fn()
        );

        // Call clearAllFilters directly to test the behavior (both buttons use the same method)
        (component as any).clearAllFilters();
        
        // Verify that updateFiltersCallback was called with empty filters
        expect(mockUpdateFiltersCallback).toHaveBeenCalledWith({
            roles: [],
            people: [],
            companies: [],
            statuses: [],
            priorities: [],
            tags: [],
            dateRange: undefined,
            dateType: undefined,
            textSearch: '',
        });
    });

    it('should update internal currentFilters when clearAllFilters is called', () => {
        // Create component with current filters
        component = new CompactFiltersComponent(
            mockPlugin,
            mockCurrentFilters,
            mockUpdateFiltersCallback,
            vi.fn()
        );

        // Verify initial state has filters
        expect((component as any).currentFilters.textSearch).toBe('test search');
        expect((component as any).currentFilters.roles).toEqual(['driver']);
        
        // Call clearAllFilters
        (component as any).clearAllFilters();
        
        // Verify currentFilters is updated to empty state
        expect((component as any).currentFilters.textSearch).toBe('');
        expect((component as any).currentFilters.roles).toEqual([]);
        expect((component as any).currentFilters.people).toEqual([]);
        expect((component as any).currentFilters.companies).toEqual([]);
        expect((component as any).currentFilters.statuses).toEqual([]);
        expect((component as any).currentFilters.priorities).toEqual([]);
    });
});