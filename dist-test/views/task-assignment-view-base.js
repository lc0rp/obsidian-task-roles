import { ItemView } from 'obsidian';
import { ViewLayout, TaskStatus, TaskPriority, DateType } from '../types';
export class TaskAssignmentViewBase extends ItemView {
    constructor(leaf, plugin, taskCacheService) {
        super(leaf);
        this.currentFilters = {};
        this.currentLayout = ViewLayout.STATUS;
        this.currentSort = { field: 'urgency', direction: 'desc' };
        this.plugin = plugin;
        this.taskCacheService = taskCacheService;
    }
    getViewType() {
        return 'task-assignment-view';
    }
    getDisplayText() {
        return 'Task Center';
    }
    getIcon() {
        return 'users';
    }
    async onOpen() {
        if (this.plugin.settings.useTaskQueries) {
            await this.renderAsync();
        }
        else {
            this.render();
        }
    }
    async onClose() {
        // Cleanup if needed
    }
    // Filtering methods
    applyFilters(tasks) {
        return tasks.filter(task => {
            // Role filter
            if (this.currentFilters.roles && this.currentFilters.roles.length > 0) {
                const taskRoles = task.assignments.map(a => a.role.id);
                const hasNoneSetFilter = this.currentFilters.roles.includes('none-set');
                // Check if task matches any of the selected role filters
                let roleMatches = false;
                // Check for "none-set" filter (tasks with no role assignments)
                if (hasNoneSetFilter && task.assignments.length === 0) {
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
                const taskPeople = task.assignments.flatMap(a => a.assignees.filter(assignee => assignee.startsWith(this.plugin.settings.contactSymbol)));
                if (!this.currentFilters.people.some(person => taskPeople.includes(person))) {
                    return false;
                }
            }
            // Companies filter
            if (this.currentFilters.companies && this.currentFilters.companies.length > 0) {
                const taskCompanies = task.assignments.flatMap(a => a.assignees.filter(assignee => assignee.startsWith(this.plugin.settings.companySymbol)));
                if (!this.currentFilters.companies.some(company => taskCompanies.includes(company))) {
                    return false;
                }
            }
            // Status filter
            if (this.currentFilters.statuses && this.currentFilters.statuses.length > 0) {
                if (!this.currentFilters.statuses.includes(task.status)) {
                    return false;
                }
            }
            // Priority filter
            if (this.currentFilters.priorities && this.currentFilters.priorities.length > 0) {
                const hasNoneSetFilter = this.currentFilters.priorities.includes('none-set');
                const hasExplicitPriority = this.hasExplicitPriority(task);
                // Check if task matches any of the selected priority filters
                let priorityMatches = false;
                // Check for "none-set" filter (tasks with MEDIUM priority but no explicit priority indicators)
                if (hasNoneSetFilter && task.priority === TaskPriority.MEDIUM && !hasExplicitPriority) {
                    priorityMatches = true;
                }
                // Check for explicit priority matches
                if (this.currentFilters.priorities.some(p => p !== 'none-set' && p === task.priority)) {
                    priorityMatches = true;
                }
                if (!priorityMatches) {
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
                    if (from && taskDate < from)
                        return false;
                    if (to && taskDate > to)
                        return false;
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
    getTaskDateByType(task, dateType) {
        switch (dateType) {
            case DateType.CREATED:
                return task.dates.created || task.createdDate;
            case DateType.DUE:
                return task.dates.due;
            case DateType.COMPLETED:
                return task.dates.completed;
            case DateType.SCHEDULED:
                return task.dates.scheduled;
            default:
                return undefined;
        }
    }
    hasExplicitPriority(task) {
        // Check if task content contains explicit priority indicators
        const content = task.content.toLowerCase();
        return content.includes('🔴') || content.includes('🟡') || content.includes('🟢') ||
            content.includes('[urgent]') || content.includes('[high]') || content.includes('[low]') ||
            content.includes('!!!') || content.includes('!!');
    }
    // Sorting methods
    sortTasks(tasks) {
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
    compareUrgency(a, b) {
        // Priority first
        const priorityOrder = { [TaskPriority.URGENT]: 4, [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0)
            return priorityDiff;
        // Then by due date (overdue first)
        const now = new Date();
        const aDue = a.dates.due;
        const bDue = b.dates.due;
        if (aDue && bDue) {
            const aOverdue = aDue < now;
            const bOverdue = bDue < now;
            if (aOverdue && !bOverdue)
                return 1;
            if (!aOverdue && bOverdue)
                return -1;
            return aDue.getTime() - bDue.getTime();
        }
        if (aDue && !bDue)
            return 1;
        if (!aDue && bDue)
            return -1;
        // Finally by description
        return a.description.localeCompare(b.description);
    }
    // Layout methods
    organizeTasksByLayout(tasks) {
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
    organizeByStatus(tasks) {
        const columns = [
            { id: 'todo', title: 'To Do', tasks: [] },
            { id: 'in-progress', title: 'In Progress', tasks: [] },
            { id: 'done', title: 'Done', tasks: [] },
            { id: 'cancelled', title: 'Cancelled', tasks: [] }
        ];
        for (const task of tasks) {
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
    organizeByRole(tasks) {
        const roleColumns = new Map();
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
            for (const assignment of task.assignments) {
                const column = roleColumns.get(assignment.role.id);
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
    organizeByAssignees(tasks) {
        const assigneeColumns = new Map();
        // Collect all assignees (both people and companies) from tasks
        for (const task of tasks) {
            for (const assignment of task.assignments) {
                for (const assignee of assignment.assignees) {
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
                    const column = assigneeColumns.get(assignee);
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
            if (aIsCompany && !bIsCompany)
                return -1;
            if (!aIsCompany && bIsCompany)
                return 1;
            // Then alphabetical within each group
            return a.title.localeCompare(b.title);
        });
        for (const column of columns) {
            column.tasks = this.sortTasks(column.tasks);
        }
        return columns;
    }
    organizeByDate(tasks) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const columns = [
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
            }
            else if (taskDate < today) {
                columns[1].tasks.push(task); // Past due
            }
            else if (taskDate < tomorrow) {
                columns[2].tasks.push(task); // Today
            }
            else if (taskDate < nextWeek) {
                columns[3].tasks.push(task); // This week
            }
            else {
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
    updateFilters(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        this.render();
    }
    async updateFiltersAsync(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        return this.renderAsync();
    }
    updateLayout(newLayout) {
        this.currentLayout = newLayout;
        this.render();
    }
    async updateLayoutAsync(newLayout) {
        this.currentLayout = newLayout;
        return this.renderAsync();
    }
    updateSort(newSort) {
        this.currentSort = newSort;
        this.render();
    }
    async updateSortAsync(newSort) {
        this.currentSort = newSort;
        return this.renderAsync();
    }
    // Utility methods
    getTaskPriorityClass(priority) {
        switch (priority) {
            case TaskPriority.URGENT:
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
    getTaskStatusClass(status) {
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
    formatDate(date) {
        if (!date)
            return '';
        return date.toLocaleDateString();
    }
    isOverdue(date) {
        if (!date)
            return false;
        return date < new Date();
    }
}
