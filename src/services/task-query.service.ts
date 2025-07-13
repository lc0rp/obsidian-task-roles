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
        const titleEl = headerDiv.createEl('h3', { text: columnQuery.title, cls: 'task-roles-column-title' });

        // Query display
        const queryContainer = columnDiv.createDiv('task-query-display');
        
        // Add progressive disclosure classes based on plugin settings
        const styleMode = this.plugin.settings.taskDisplayMode || 'detailed';
        queryContainer.addClass(`tasks-styled--${styleMode}`);

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

        // Enhance the rendered tasks with better styling
        this.enhanceTaskDisplay(queryContainer);

        // Add column content wrapper
        const columnContent = columnDiv.createDiv('task-roles-column-content');
        columnContent.appendChild(queryContainer);
    }

    private enhanceTaskDisplay(container: HTMLElement): void {
        // Use a timeout to allow the markdown renderer to complete
        setTimeout(() => {
            const taskItems = container.querySelectorAll('.task-list-item');
            
            taskItems.forEach((taskItem: Element) => {
                const htmlTaskItem = taskItem as HTMLElement;
                
                // Extract task content for analysis
                const taskContent = this.extractTaskContent(htmlTaskItem);
                
                // Add priority classes based on content
                this.addPriorityClasses(htmlTaskItem, taskContent);
                
                // Add metadata elements
                this.addTaskMetadata(htmlTaskItem, taskContent);
                
                // Add progressive disclosure controls
                this.addProgressiveDisclosure(htmlTaskItem);
            });
        }, 100);
    }

    private extractTaskContent(taskItem: HTMLElement): string {
        const textContent = taskItem.textContent || '';
        return textContent.trim();
    }

    private addPriorityClasses(taskItem: HTMLElement, content: string): void {
        // Detect priority from content
        if (content.includes('🔴') || content.includes('[urgent]') || content.includes('!!!')) {
            taskItem.addClass('priority-urgent');
            this.addPriorityBadge(taskItem, 'urgent');
        } else if (content.includes('🟡') || content.includes('[high]') || content.includes('!!')) {
            taskItem.addClass('priority-high');
            this.addPriorityBadge(taskItem, 'high');
        } else if (content.includes('🟢') || content.includes('[low]') || content.includes('!')) {
            taskItem.addClass('priority-low');
            this.addPriorityBadge(taskItem, 'low');
        } else {
            taskItem.addClass('priority-medium');
            this.addPriorityBadge(taskItem, 'medium');
        }
    }

    private addPriorityBadge(taskItem: HTMLElement, priority: string): void {
        const existingBadge = taskItem.querySelector('.task-priority');
        if (existingBadge) return;

        const priorityBadge = taskItem.createDiv('task-priority');
        priorityBadge.textContent = priority.toUpperCase();
    }

    private addTaskMetadata(taskItem: HTMLElement, content: string): void {
        const metadataContainer = taskItem.createDiv('task-metadata');
        
        // Extract and add dates
        this.addDateMetadata(metadataContainer, content);
        
        // Extract and add roles/assignees
        this.addRoleAssigneeMetadata(metadataContainer, content);
        
        // Extract and add tags
        this.addTagMetadata(metadataContainer, content);
    }

    private addDateMetadata(container: HTMLElement, content: string): void {
        // Due date pattern: 📅 YYYY-MM-DD
        const dueDateMatch = content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        if (dueDateMatch) {
            const dateEl = container.createDiv('task-date');
            const dueDate = new Date(dueDateMatch[1]);
            const today = new Date();
            
            if (dueDate < today) {
                dateEl.addClass('overdue');
            }
            
            dateEl.textContent = `Due: ${dueDateMatch[1]}`;
        }

        // Scheduled date pattern: ⏰ YYYY-MM-DD
        const scheduledMatch = content.match(/⏰\s*(\d{4}-\d{2}-\d{2})/);
        if (scheduledMatch) {
            const dateEl = container.createDiv('task-date');
            dateEl.textContent = `Scheduled: ${scheduledMatch[1]}`;
        }
    }

    private addRoleAssigneeMetadata(container: HTMLElement, content: string): void {
        // Role pattern: @role(role-name)
        const roleMatches = content.matchAll(/@role\(([^)]+)\)/g);
        for (const match of roleMatches) {
            const roleEl = container.createDiv('task-role');
            roleEl.textContent = match[1];
        }

        // Assignee patterns: @person or &company
        const assigneeMatches = content.matchAll(/[@&]([^\s,]+)/g);
        for (const match of assigneeMatches) {
            if (match[0].startsWith('@role(')) continue; // Skip role matches
            
            const assigneeEl = container.createDiv('task-assignee');
            if (match[0].startsWith('&')) {
                assigneeEl.addClass('company');
            }
            assigneeEl.textContent = match[1];
        }
    }

    private addTagMetadata(container: HTMLElement, content: string): void {
        // Tag pattern: #tag
        const tagMatches = content.matchAll(/#([^\s]+)/g);
        for (const match of tagMatches) {
            const tagEl = container.createDiv('task-tag');
            tagEl.textContent = `#${match[1]}`;
        }
    }

    private addProgressiveDisclosure(taskItem: HTMLElement): void {
        const metadata = taskItem.querySelector('.task-metadata');
        if (!metadata) return;

        // Add click handler for minimal mode
        taskItem.addEventListener('mouseenter', () => {
            if (taskItem.closest('.tasks-styled--minimal')) {
                (metadata as HTMLElement).style.display = 'flex';
            }
        });

        taskItem.addEventListener('mouseleave', () => {
            if (taskItem.closest('.tasks-styled--minimal')) {
                (metadata as HTMLElement).style.display = 'none';
            }
        });
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