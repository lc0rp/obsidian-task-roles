import { ItemView, WorkspaceLeaf } from 'obsidian';
import { TaskData, ViewFilters, ViewLayout, ViewColumn, TaskStatus, TaskPriority, DateType, SortOption } from '../types';
import { TaskCacheService } from '../services/task-cache.service';
import type TaskRolesPlugin from '../main';

export abstract class TaskRolesViewBase extends ItemView {
    protected plugin: TaskRolesPlugin;
    protected taskCacheService: TaskCacheService;
    protected currentFilters: ViewFilters = {};
    protected currentLayout: ViewLayout = ViewLayout.STATUS;
    protected currentSort: SortOption = { field: 'urgency', direction: 'desc' };

    constructor(leaf: WorkspaceLeaf, plugin: TaskRolesPlugin, taskCacheService: TaskCacheService) {
        super(leaf);
        this.plugin = plugin;
        this.taskCacheService = taskCacheService;
    }

    getViewType(): string {
        return 'task-roles-view';
    }

    getDisplayText(): string {
        return 'Task Center';
    }

    getIcon(): string {
        return 'users';
    }

    async onOpen(): Promise<void> {
        if (this.plugin.settings.useTaskQueries) {
            await this.renderAsync();
        } else {
            this.render();
        }
    }

    async onClose(): Promise<void> {
        // Cleanup if needed
    }

    protected abstract render(): void;
    protected abstract renderAsync(): Promise<void>;

    // Filtering methods
    protected applyFilters(tasks: TaskData[]): TaskData[] {
        return tasks.filter(task => {
            // Role filter
            if (this.currentFilters.roles && this.currentFilters.roles.length > 0) {
                const taskRoles = task.roleAssignments.map(a => a.role.id);
                const hasNoneSetFilter = this.currentFilters.roles.includes('none-set');

                // Check if task matches any of the selected role filters
                let roleMatches = false;

                // Check for "none-set" filter (tasks with no assigned roles)
                if (hasNoneSetFilter && task.roleAssignments.length === 0) {
                    roleMatches = true;
                }

                // Check for explicit role matches
                if (this.currentFilters.roles.some(roleId => roleId !== 'none-set' && taskRoles.includes(roleId))) {
                    roleMatches = true;
                }

                if (!roleMatches) {
                    return false;
                }
            }

            // People filter
            if (this.currentFilters.people && this.currentFilters.people.length > 0) {
                const taskPeople = task.roleAssignments.flatMap(a => a.assignees.filter(assignee => assignee.startsWith(this.plugin.settings.contactSymbol)));
                if (!this.currentFilters.people.some(person => taskPeople.includes(person))) {
                    return false;
                }
            }

            // Companies filter
            if (this.currentFilters.companies && this.currentFilters.companies.length > 0) {
                const taskCompanies = task.roleAssignments.flatMap(a => a.assignees.filter(assignee => assignee.startsWith(this.plugin.settings.companySymbol)));
                if (!this.currentFilters.companies.some(company => taskCompanies.includes(company))) {
                    return false;
                }
            }

            // Status filter
            if (this.currentFilters.statuses && this.currentFilters.statuses.length > 0) {
                const statusMatches = this.currentFilters.statuses.some(filterStatus => {
                    // For DONE and TODO statuses, use direct filtering as they are reliable
                    if (filterStatus === 'done' && task.status === 'done') {
                        return true;
                    }
                    if (filterStatus === 'todo' && task.status === 'todo') {
                        return true;
                    }
                    
                    // For other statuses (IN_PROGRESS, CANCELLED), use function-based approach
                    // This handles patterns like 'TODO,IN_PROGRESS'.includes(task.status.type)
                    const upperCaseStatus = task.status.toUpperCase().replace('-', '_');
                    
                    // Handle function-based filters with includes pattern
                    if (filterStatus.includes(',')) {
                        const allowedStatuses = filterStatus.split(',').map(s => s.trim());
                        return allowedStatuses.includes(upperCaseStatus);
                    }
                    
                    // Handle single status function filters for non-reliable statuses
                    const filterStatusUpper = String(filterStatus).toUpperCase().replace('-', '_');
                    if (upperCaseStatus === 'IN_PROGRESS' && filterStatusUpper === 'IN_PROGRESS') {
                        return true;
                    }
                    if (upperCaseStatus === 'CANCELLED' && filterStatusUpper === 'CANCELLED') {
                        return true;
                    }
                    
                    return false;
                });
                
                if (!statusMatches) {
                    return false;
                }
            }

            // Priority filter
            if (this.currentFilters.priorities && this.currentFilters.priorities.length > 0) {
                // Check if task matches any of the selected priority filters
                if (!this.currentFilters.priorities.includes(task.priority)) {
                    return false;
                }
            }

            // Tags filter
            if (this.currentFilters.tags && this.currentFilters.tags.length > 0) {
                if (!this.currentFilters.tags.some(tag => task.tags.includes(tag))) {
                    return false;
                }
            }

            // Date range filter
            if (this.currentFilters.dateRange && this.currentFilters.dateType) {
                const taskDate = this.getTaskDateByType(task, this.currentFilters.dateType);

                if (!taskDate && !this.currentFilters.dateRange.includeNotSet) {
                    return false;
                }

                if (taskDate) {
                    const { from, to } = this.currentFilters.dateRange;
                    if (from && taskDate < from) return false;
                    if (to && taskDate > to) return false;
                }
            }

            // Text search filter
            if (this.currentFilters.textSearch && this.currentFilters.textSearch.trim()) {
                const searchTerm = this.currentFilters.textSearch.toLowerCase();
                if (!task.searchText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    }

    private getTaskDateByType(task: TaskData, dateType: DateType): Date | undefined {
        switch (dateType) {
            case DateType.DUE:
                return task.dates.due;
            case DateType.DONE:
                return task.dates.done;
            case DateType.SCHEDULED:
                return task.dates.scheduled;
            case DateType.START:
                return task.dates.start;
            case DateType.CREATED:
                return task.dates.created || task.createdDate;
            case DateType.CANCELLED:
                return task.dates.cancelled;
            case DateType.HAPPENS:
                return task.dates.happens || task.dates.start || task.dates.scheduled || task.dates.due;
            default:
                return undefined;
        }
    }


    // Sorting methods
    protected sortTasks(tasks: TaskData[]): TaskData[] {
        return tasks.sort((a, b) => {
            let comparison = 0;

            switch (this.currentSort.field) {
                case 'urgency':
                    comparison = this.compareUrgency(a, b);
                    break;
                case 'description':
                    comparison = a.description.localeCompare(b.description);
                    break;
                case 'created':
                    comparison = a.createdDate.getTime() - b.createdDate.getTime();
                    break;
                case 'modified':
                    comparison = a.modifiedDate.getTime() - b.modifiedDate.getTime();
                    break;
                case 'due': {
                    const aDue = a.dates.due?.getTime() || Infinity;
                    const bDue = b.dates.due?.getTime() || Infinity;
                    comparison = aDue - bDue;
                    break;
                }
                case 'name':
                    comparison = a.description.localeCompare(b.description);
                    break;
                case 'recency':
                    comparison = b.modifiedDate.getTime() - a.modifiedDate.getTime();
                    break;
            }

            return this.currentSort.direction === 'desc' ? -comparison : comparison;
        });
    }

    private compareUrgency(a: TaskData, b: TaskData): number {
        // Priority first
        const priorityOrder = { [TaskPriority.HIGHEST]: 6, [TaskPriority.HIGH]: 5, [TaskPriority.MEDIUM]: 4, [TaskPriority.NONE]: 3, [TaskPriority.LOW]: 2, [TaskPriority.LOWEST]: 1 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by due date (overdue first)
        const now = new Date();
        const aDue = a.dates.due;
        const bDue = b.dates.due;

        if (aDue && bDue) {
            const aOverdue = aDue < now;
            const bOverdue = bDue < now;

            if (aOverdue && !bOverdue) return 1;
            if (!aOverdue && bOverdue) return -1;

            return aDue.getTime() - bDue.getTime();
        }

        if (aDue && !bDue) return 1;
        if (!aDue && bDue) return -1;

        // Finally by description
        return a.description.localeCompare(b.description);
    }

    // Layout methods
    protected organizeTasksByLayout(tasks: TaskData[]): ViewColumn[] {
        switch (this.currentLayout) {
            case ViewLayout.STATUS:
                return this.organizeByStatus(tasks);
            case ViewLayout.ROLE:
                return this.organizeByRole(tasks);
            case ViewLayout.ASSIGNEES:
                return this.organizeByAssignees(tasks);
            case ViewLayout.DATE:
                return this.organizeByDate(tasks);
            default:
                return this.organizeByStatus(tasks);
        }
    }

    private organizeByStatus(tasks: TaskData[]): ViewColumn[] {
        const columns: ViewColumn[] = [
            { id: 'todo', title: 'To Do', tasks: [] },
            { id: 'in-progress', title: 'In Progress', tasks: [] },
            { id: 'done', title: 'Done', tasks: [] },
            { id: 'cancelled', title: 'Cancelled', tasks: [] }
        ];

        for (const task of tasks) {
            // TaskStatus is already normalized to lowercase with hyphens (e.g., 'in-progress')
            // so we can directly use task.status to find the matching column
            const column = columns.find(col => col.id === task.status);
            if (column) {
                column.tasks.push(task);
            }
        }

        // Sort tasks within each column
        for (const column of columns) {
            column.tasks = this.sortTasks(column.tasks);
        }

        return columns;
    }

    private organizeByRole(tasks: TaskData[]): ViewColumn[] {
        const roleColumns = new Map<string, ViewColumn>();
        const visibleRoles = this.plugin.getVisibleRoles();

        // Create columns for each role
        for (const role of visibleRoles) {
            roleColumns.set(role.id, {
                id: role.id,
                title: `${role.icon} ${role.name}`,
                tasks: []
            });
        }

        // Add tasks to appropriate role columns
        for (const task of tasks) {
            for (const roleAssignment of task.roleAssignments) {
                const column = roleColumns.get(roleAssignment.role.id);
                if (column && !column.tasks.includes(task)) {
                    column.tasks.push(task);
                }
            }
        }

        // Convert to array and sort
        const columns = Array.from(roleColumns.values());
        for (const column of columns) {
            column.tasks = this.sortTasks(column.tasks);
        }

        return columns;
    }

    private organizeByAssignees(tasks: TaskData[]): ViewColumn[] {
        const assigneeColumns = new Map<string, ViewColumn>();

        // Collect all assignees (both people and companies) from tasks
        for (const task of tasks) {
            for (const roleAssignment of task.roleAssignments) {
                for (const assignee of roleAssignment.assignees) {
                    if (!assigneeColumns.has(assignee)) {
                        // Determine type for display
                        const isCompany = assignee.startsWith(this.plugin.settings.companySymbol);
                        const displayTitle = isCompany ? `${assignee} (Company)` : assignee;

                        assigneeColumns.set(assignee, {
                            id: assignee,
                            title: displayTitle,
                            tasks: []
                        });
                    }

                    // Avoid duplicate tasks in the same column
                    const column = assigneeColumns.get(assignee)!;
                    if (!column.tasks.includes(task)) {
                        column.tasks.push(task);
                    }
                }
            }
        }

        // Convert to array and sort - companies first, then people
        const columns = Array.from(assigneeColumns.values());
        columns.sort((a, b) => {
            const aIsCompany = a.id.startsWith(this.plugin.settings.companySymbol);
            const bIsCompany = b.id.startsWith(this.plugin.settings.companySymbol);

            // Companies first
            if (aIsCompany && !bIsCompany) return -1;
            if (!aIsCompany && bIsCompany) return 1;

            // Then alphabetical within each group
            return a.title.localeCompare(b.title);
        });

        for (const column of columns) {
            column.tasks = this.sortTasks(column.tasks);
        }

        return columns;
    }

    private organizeByDate(tasks: TaskData[]): ViewColumn[] {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const columns: ViewColumn[] = [
            { id: 'not-set', title: 'Not Set', tasks: [] },
            { id: 'past-due', title: 'Past Due', tasks: [] },
            { id: 'today', title: 'Today', tasks: [] },
            { id: 'this-week', title: 'This Week', tasks: [] },
            { id: 'next-week', title: 'Next Week', tasks: [] },
            { id: 'all', title: 'All', tasks: [] }
        ];

        const dateType = this.currentFilters.dateType || DateType.DUE;

        for (const task of tasks) {
            const taskDate = this.getTaskDateByType(task, dateType);

            if (!taskDate) {
                columns[0].tasks.push(task); // Not set
            } else if (taskDate < today) {
                columns[1].tasks.push(task); // Past due
            } else if (taskDate < tomorrow) {
                columns[2].tasks.push(task); // Today
            } else if (taskDate < nextWeek) {
                columns[3].tasks.push(task); // This week
            } else {
                columns[4].tasks.push(task); // Next week
            }
        }

        // Sort tasks within each column
        for (const column of columns) {
            column.tasks = this.sortTasks(column.tasks);
        }

        return columns;
    }

    // Filter update methods
    protected updateFilters(newFilters: Partial<ViewFilters>): void {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        this.render();
    }

    protected async updateFiltersAsync(newFilters: Partial<ViewFilters>): Promise<void> {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        return this.renderAsync();
    }

    protected updateLayout(newLayout: ViewLayout): void {
        this.currentLayout = newLayout;
        this.render();
    }

    protected async updateLayoutAsync(newLayout: ViewLayout): Promise<void> {
        this.currentLayout = newLayout;
        return this.renderAsync();
    }

    protected updateSort(newSort: SortOption): void {
        this.currentSort = newSort;
        this.render();
    }

    protected async updateSortAsync(newSort: SortOption): Promise<void> {
        this.currentSort = newSort;
        return this.renderAsync();
    }

    // Utility methods
    protected getTaskPriorityClass(priority: TaskPriority): string {
        switch (priority) {
            case TaskPriority.HIGHEST:
                return 'task-priority-urgent';
            case TaskPriority.HIGH:
                return 'task-priority-high';
            case TaskPriority.MEDIUM:
                return 'task-priority-medium';
            case TaskPriority.LOW:
                return 'task-priority-low';
            default:
                return 'task-priority-medium';
        }
    }

    protected getTaskStatusClass(status: TaskStatus): string {
        switch (status) {
            case TaskStatus.TODO:
                return 'task-status-todo';
            case TaskStatus.IN_PROGRESS:
                return 'task-status-in-progress';
            case TaskStatus.DONE:
                return 'task-status-done';
            case TaskStatus.CANCELLED:
                return 'task-status-cancelled';
            default:
                return 'task-status-todo';
        }
    }

    protected formatDate(date: Date | undefined): string {
        if (!date) return '';
        return date.toLocaleDateString();
    }

    protected isOverdue(date: Date | undefined): boolean {
        if (!date) return false;
        return date < new Date();
    }
} 