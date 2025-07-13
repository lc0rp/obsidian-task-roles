import { MarkdownRenderer } from 'obsidian';
import { ViewFilters, ViewLayout, TaskStatus } from '../types';
import { TaskCacheService } from './task-cache.service';
import type TaskRolesPlugin from '../main';

export class TaskQueryService {
    private plugin: TaskRolesPlugin;
    private taskCacheService: TaskCacheService;

    constructor(plugin: TaskRolesPlugin, taskCacheService: TaskCacheService) {
        this.plugin = plugin;
        this.taskCacheService = taskCacheService;
    }

    buildTaskQueryFromFilters(filters: ViewFilters): string {
        const queryParts: string[] = [];

        // Convert role filters to query syntax
        if (filters.roles && filters.roles.length > 0) {
            const roleQueries = filters.roles.map(roleId => {
                if (roleId === 'none-set') {
                    return 'no-role';
                }
                const role = this.plugin.getVisibleRoles().find(r => r.id === roleId);
                return role ? `role:${role.name}` : `role:${roleId}`;
            });
            queryParts.push(`(${roleQueries.join(' OR ')})`);
        }

        // Convert people filters to query syntax
        if (filters.people && filters.people.length > 0) {
            const peopleQueries = filters.people.map(person => `assignee:${person}`);
            queryParts.push(`(${peopleQueries.join(' OR ')})`);
        }

        // Convert company filters to query syntax
        if (filters.companies && filters.companies.length > 0) {
            const companyQueries = filters.companies.map(company => `assignee:${company}`);
            queryParts.push(`(${companyQueries.join(' OR ')})`);
        }

        // Convert status filters to query syntax
        if (filters.statuses && filters.statuses.length > 0) {
            const statusQueries = filters.statuses.map(status => `status:${status}`);
            queryParts.push(`(${statusQueries.join(' OR ')})`);
        }

        // Convert priority filters to query syntax
        if (filters.priorities && filters.priorities.length > 0) {
            const priorityQueries = filters.priorities.map(priority => {
                if (priority === 'none-set') {
                    return 'priority:medium AND no-explicit-priority';
                }
                return `priority:${priority}`;
            });
            queryParts.push(`(${priorityQueries.join(' OR ')})`);
        }

        // Convert tag filters to query syntax
        if (filters.tags && filters.tags.length > 0) {
            const tagQueries = filters.tags.map(tag => `#${tag}`);
            queryParts.push(`(${tagQueries.join(' OR ')})`);
        }

        // Convert date range filters to query syntax
        if (filters.dateRange && filters.dateType) {
            const { from, to, includeNotSet } = filters.dateRange;
            const dateType = filters.dateType;

            const dateParts: string[] = [];

            if (from) {
                dateParts.push(`${dateType}:>=${from.toISOString().split('T')[0]}`);
            }
            if (to) {
                dateParts.push(`${dateType}:<=${to.toISOString().split('T')[0]}`);
            }
            if (includeNotSet) {
                dateParts.push(`no-${dateType}`);
            }

            if (dateParts.length > 0) {
                queryParts.push(`(${dateParts.join(' OR ')})`);
            }
        }

        // Convert text search to query syntax
        if (filters.textSearch && filters.textSearch.trim()) {
            queryParts.push(`"${filters.textSearch.trim()}"`);
        }

        return queryParts.join(' AND ');
    }

    buildColumnQueries(layout: ViewLayout, filters: ViewFilters): Array<{ title: string, query: string }> {
        const baseQuery = this.buildTaskQueryFromFilters(filters);
        const columnQueries: Array<{ title: string, query: string }> = [];

        // Determine columns based on current layout
        switch (layout) {
            case ViewLayout.ROLE:
                const visibleRoles = this.plugin.getVisibleRoles();
                for (const role of visibleRoles) {
                    const roleQuery = baseQuery
                        ? `${baseQuery} AND role:${role.name}`
                        : `role:${role.name}`;
                    columnQueries.push({
                        title: role.name,
                        query: roleQuery
                    });
                }
                // Add "No Role" column
                const noRoleQuery = baseQuery
                    ? `${baseQuery} AND no-role`
                    : 'no-role';
                columnQueries.push({
                    title: 'No Role',
                    query: noRoleQuery
                });
                break;

            case ViewLayout.ASSIGNEES:
                // Get unique people from current filters or all people
                const people = filters.people && filters.people.length > 0
                    ? filters.people
                    : this.getUniquePeople();

                for (const person of people) {
                    if (person === 'none-set') {
                        const noAssigneeQuery = baseQuery
                            ? `${baseQuery} AND no-assignee`
                            : 'no-assignee';
                        columnQueries.push({
                            title: 'Unassigned',
                            query: noAssigneeQuery
                        });
                    } else {
                        const personQuery = baseQuery
                            ? `${baseQuery} AND assignee:${person}`
                            : `assignee:${person}`;
                        columnQueries.push({
                            title: person,
                            query: personQuery
                        });
                    }
                }
                break;

            case ViewLayout.STATUS:
                const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.CANCELLED];
                for (const status of statuses) {
                    let statusQuery: string;
                    let statusTitle: string;

                    switch (status) {
                        case TaskStatus.TODO:
                            statusQuery = baseQuery ? `${baseQuery} AND not done` : 'not done';
                            statusTitle = 'To Do';
                            break;
                        case TaskStatus.IN_PROGRESS:
                            statusQuery = baseQuery ? `${baseQuery} AND in-progress` : 'in-progress';
                            statusTitle = 'In Progress';
                            break;
                        case TaskStatus.DONE:
                            statusQuery = baseQuery ? `${baseQuery} AND done` : 'done';
                            statusTitle = 'Done';
                            break;
                        case TaskStatus.CANCELLED:
                            statusQuery = baseQuery ? `${baseQuery} AND cancelled` : 'cancelled';
                            statusTitle = 'Cancelled';
                            break;
                        default:
                            statusQuery = baseQuery || '';
                            statusTitle = status;
                    }

                    columnQueries.push({
                        title: statusTitle,
                        query: statusQuery
                    });
                }
                break;

            case ViewLayout.DATE:
                // Date-based columns
                const dateColumns = [
                    { title: 'Overdue', query: baseQuery ? `${baseQuery} AND due before today` : 'due before today' },
                    { title: 'Today', query: baseQuery ? `${baseQuery} AND due today` : 'due today' },
                    { title: 'This Week', query: baseQuery ? `${baseQuery} AND due this week` : 'due this week' },
                    { title: 'Next Week', query: baseQuery ? `${baseQuery} AND due next week` : 'due next week' },
                    { title: 'No Due Date', query: baseQuery ? `${baseQuery} AND no due date` : 'no due date' }
                ];

                for (const dateColumn of dateColumns) {
                    columnQueries.push(dateColumn);
                }
                break;

            default:
                // Single column with all tasks
                columnQueries.push({
                    title: 'All Tasks',
                    query: baseQuery || ''
                });
        }

        return columnQueries;
    }

    async renderQueryColumn(
        container: HTMLElement,
        columnQuery: { title: string, query: string },
        viewContext: any
    ): Promise<void> {
        const columnDiv = container.createDiv('task-roles-column');
        columnDiv.addClass('task-query-column');

        // Column header
        const headerDiv = columnDiv.createDiv('task-roles-column-header');
        headerDiv.createEl('h3', { text: columnQuery.title });

        // Query display
        const queryContainer = columnDiv.createDiv('task-query-display');

        // Create markdown content for the query
        const queryMarkdown = columnQuery.query
            ? `\`\`\`tasks\n${columnQuery.query}\n\`\`\``
            : `\`\`\`tasks\n# No specific query for this column\n\`\`\``;

        // Render the query using MarkdownRenderer
        await MarkdownRenderer.renderMarkdown(
            queryMarkdown,
            queryContainer,
            "virtual/tasks-preview.md",
            viewContext
        );

        // Add some styling to make it clear this is a query preview
        queryContainer.style.fontSize = '0.9em';
        queryContainer.style.opacity = '0.8';
        queryContainer.style.marginTop = '10px';
    }

    private getUniquePeople(): string[] {
        const allTasks = this.taskCacheService.getAllTasks();
        const people = new Set<string>();

        for (const task of allTasks) {
            if (task.roleAssignments && task.roleAssignments.length > 0) {
                for (const roleAssignment of task.roleAssignments) {
                    for (const assignee of roleAssignment.assignees) {
                        people.add(assignee);
                    }
                }
            } else {
                people.add('none-set');
            }
        }

        return Array.from(people);
    }
} 