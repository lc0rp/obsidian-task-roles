import { MarkdownRenderer, setIcon } from 'obsidian';
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
        const queryLines: string[] = [];

        // Convert role filters to query syntax
        if (filters.roles && filters.roles.length > 0) {
            // Skip filtering if "All" is selected (no filter needed)
            const hasAll = filters.roles.includes('all');
            if (!hasAll) {
                const visibleRoles = this.plugin.getVisibleRoles();
                
                if (filters.roles.length === 1) {
                    const roleId = filters.roles[0];
                    if (roleId === 'none-set') {
                        // Use the same pattern as buildColumnQueries for "No Role"
                        const noRoleConditions = visibleRoles.map(role => `description does not include ${role.icon}`);
                        queryLines.push(...noRoleConditions);
                    } else {
                        // Use description includes pattern like buildColumnQueries
                        const role = visibleRoles.find(r => r.id === roleId);
                        if (role) {
                            queryLines.push(`description includes ${role.icon}`);
                        }
                    }
                } else {
                    // Handle multiple role selections
                    const roleQueries: string[] = [];
                    const hasNoneSet = filters.roles.includes('none-set');
                    
                    // Add conditions for specific roles
                    const specificRoles = filters.roles.filter(roleId => roleId !== 'none-set');
                    for (const roleId of specificRoles) {
                        const role = visibleRoles.find(r => r.id === roleId);
                        if (role) {
                            roleQueries.push(`description includes ${role.icon}`);
                        }
                    }
                    
                    // Add "none-set" condition if selected
                    if (hasNoneSet) {
                        const noRoleConditions = visibleRoles.map(role => `description does not include ${role.icon}`);
                        // For "none-set", we need ALL conditions to be true (AND logic)
                        roleQueries.push(`(${noRoleConditions.join(' AND ')})`);
                    }
                    
                    if (roleQueries.length > 0) {
                        queryLines.push(`(${roleQueries.join(' OR ')})`);
                    }
                }
            }
        }

        // Convert people filters to query syntax
        if (filters.people && filters.people.length > 0) {
            if (filters.people.length === 1) {
                queryLines.push(`assignee:${filters.people[0]}`);
            } else {
                const peopleQueries = filters.people.map(person => `assignee:${person}`);
                queryLines.push(`(${peopleQueries.join(' OR ')})`);
            }
        }

        // Convert company filters to query syntax
        if (filters.companies && filters.companies.length > 0) {
            if (filters.companies.length === 1) {
                queryLines.push(`assignee:${filters.companies[0]}`);
            } else {
                const companyQueries = filters.companies.map(company => `assignee:${company}`);
                queryLines.push(`(${companyQueries.join(' OR ')})`);
            }
        }

        // Convert status filters to query syntax
        if (filters.statuses && filters.statuses.length > 0) {
            // In the status view, todo column means not done and not in progress
            // and done column means done and not cancelled.
            if (filters.statuses.length === 1) {
                const status = filters.statuses[0];
                if (status === 'todo') {
                    queryLines.push('not done');
                    queryLines.push('filter by function task.status.type !== \'IN_PROGRESS\''); // Exclude in-progress tasks
                } else if (status === 'done') {
                    queryLines.push('done');
                    queryLines.push('filter by function task.status.type !== \'CANCELLED\''); // Exclude cancelled tasks
                } else if (status === 'in-progress') {
                    queryLines.push('filter by function task.status.type === \'IN_PROGRESS\'');
                } else if (status === 'cancelled') {
                    queryLines.push('filter by function task.status.type === \'CANCELLED\'');
                } else {
                    queryLines.push(`filter by function task.status.type === '${(status as string).toUpperCase()}'`);
                }
            } else {
                // For multiple status filters, check if we can use simple Tasks plugin syntax
                const hasOnlyTodoAndDone = filters.statuses.every(status => status === 'todo' || status === 'done');
                
                if (hasOnlyTodoAndDone) {
                    // Check if both todo and done are selected - this covers all tasks
                    const hasTodo = filters.statuses.includes(TaskStatus.TODO);
                    const hasDone = filters.statuses.includes(TaskStatus.DONE);
                    
                    if (hasTodo && hasDone) {
                        // In filters, todo should mean not done and not in progress (we can skip the in-progress check here, because it is implied)
                        queryLines.push('filter by function task.status.type !== \'IN_PROGRESS\''); // Exclude in-progress tasks
                        // And done should mean done and not cancelled (we can skip the done check here, because it is implied))
                        queryLines.push('filter by function task.status.type !== \'CANCELLED\''); // Exclude cancelled tasks    
                    } else if (hasTodo) {
                        queryLines.push('not done');
                    } else if (hasDone) {
                        queryLines.push('done');
                    }
                } else {
                    // For mixed statuses, use consistent task.status.type for all statuses
                    const statusConditions: string[] = [];
                    for (const status of filters.statuses) {
                        if (status === 'todo') {
                            statusConditions.push('task.status.type === \'TODO\'');
                        } else if (status === 'done') {
                            statusConditions.push('task.status.type === \'DONE\'');
                        } else if (status === 'in-progress') {
                            statusConditions.push('task.status.type === \'IN_PROGRESS\'');
                        } else if (status === 'cancelled') {
                            statusConditions.push('task.status.type === \'CANCELLED\'');
                        } else {
                            statusConditions.push(`task.status.type === '${(status as string).toUpperCase()}'`);
                        }
                    }
                    queryLines.push(`filter by function (${statusConditions.join(' || ')})`);
                }
            }
        }

        // Convert priority filters to query syntax
        if (filters.priorities && filters.priorities.length > 0) {
            if (filters.priorities.length === 1) {
                const priority = filters.priorities[0];
                queryLines.push(`priority is ${priority}`);
            } else {
                const priorityQueries = filters.priorities.map(priority => {
                    return `(priority is ${priority})`;
                });
                queryLines.push(`${priorityQueries.join(' OR ')}`);
            }
        }

        // Convert tag filters to query syntax
        if (filters.tags && filters.tags.length > 0) {
            if (filters.tags.length === 1) {
                queryLines.push(`#${filters.tags[0]}`);
            } else {
                const tagQueries = filters.tags.map(tag => `#${tag}`);
                queryLines.push(`(${tagQueries.join(' OR ')})`);
            }
        }

        // Convert date range filters to query syntax
        if (filters.dateRange && filters.dateType) {
            const { from, to, includeNotSet } = filters.dateRange;
            const dateType = filters.dateType;

            const dateParts: string[] = [];

            // Handle "Include no dates" checkbox
            if (includeNotSet) {
                dateParts.push(`(no ${dateType} date)`);
            }

            // For start date, we say "starts" instead of "start"
            const dateTypeForQuery = dateType === 'start' ? 'starts' : dateType;

            // Handle date range logic
            if (from && to) {
                // Both dates provided - use after/before format for range
                const fromDate = from.toISOString().split('T')[0];
                const toDate = to.toISOString().split('T')[0];
                dateParts.push(`(${dateTypeForQuery} ${fromDate} ${toDate})`);
            } else if (from) {
                // Only from date provided - use after
                const fromDate = from.toISOString().split('T')[0];
                dateParts.push(`(${dateTypeForQuery} ${fromDate})`);
            } else if (to) {
                // Only to date provided - use before
                const toDate = to.toISOString().split('T')[0];
                dateParts.push(`(${dateTypeForQuery} ${toDate})`);
            }

            if (dateParts.length > 0) {
                // No complex logic needed - just join appropriately
                const joinOperator = ' OR ';
                queryLines.push(`${dateParts.join(joinOperator)}`);
                // Handle complex logic for combining no date with date range
                if (0 && includeNotSet && (from || to)) {
                    // Separate no date from actual date filters
                    const noDateParts = dateParts.filter(part => part.includes('no '));
                    const dateParts2 = dateParts.filter(part => !part.includes('no '));
                    
                    if (dateParts2.length > 1) {
                        // Multiple date parts (range) - join with AND, then OR with no date
                        queryLines.push(`(${noDateParts.join(' OR ')} OR (${dateParts2.join(' AND ')}))`);
                    } else if (dateParts2.length === 1) {
                        // Single date part - OR with no date
                        queryLines.push(`(${noDateParts.join(' OR ')} OR ${dateParts2.join(' OR ')})`);
                    } else {
                        // Only no date parts
                        queryLines.push(`(${noDateParts.join(' OR ')})`);
                    }
                } else {
                    
                }
            }
        }

        // Convert text search to query syntax
        if (filters.textSearch && filters.textSearch.trim()) {
            queryLines.push(`"${filters.textSearch.trim()}"`);
        }

        return queryLines.join('\n');
    }

    buildColumnQueries(layout: ViewLayout, filters: ViewFilters): Array<{ title: string, query: string, icon?: string, isEmoji?: boolean }> {
        const baseQuery = this.buildTaskQueryFromFilters(filters);
        const columnQueries: Array<{ title: string, query: string, icon?: string, isEmoji?: boolean }> = [];

        // Determine columns based on current layout
        switch (layout) {
            case ViewLayout.ROLE:
                const visibleRoles = this.plugin.getVisibleRoles();
                for (const role of visibleRoles) {
                    const roleQuery = baseQuery
                        ? `${baseQuery}\ndescription includes ${role.icon}`
                        : `description includes ${role.icon}`;
                    columnQueries.push({
                        title: role.name,
                        query: roleQuery,
                        icon: role.icon,
                        isEmoji: true
                    });
                }
                // Add "No Role" column
                const noRoleConditions = visibleRoles.map(role => `description does not include ${role.icon}`);
                const noRoleQuery = baseQuery
                    ? `${baseQuery}\n${noRoleConditions.join('\n')}`
                    : noRoleConditions.join('\n');
                columnQueries.push({
                    title: 'No Role',
                    query: noRoleQuery,
                    icon: 'user-x',
                    isEmoji: false
                });
                break;

            case ViewLayout.STATUS:
                const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.CANCELLED];
                for (const status of statuses) {
                    let statusQuery: string;
                    let statusTitle: string;
                    let statusIcon: string;

                    switch (status) {
                        case TaskStatus.TODO:
                            statusQuery = baseQuery ? `${baseQuery}\nfilter by function task.status.type === 'TODO'` : `filter by function task.status.type === 'TODO'`;
                            statusTitle = 'To Do';
                            statusIcon = 'circle-dashed';
                            break;
                        case TaskStatus.IN_PROGRESS:
                            statusQuery = baseQuery ? `${baseQuery}\nfilter by function task.status.type === 'IN_PROGRESS'` : `filter by function task.status.type === 'IN_PROGRESS'`;
                            statusTitle = 'In Progress';
                            statusIcon = 'loader-circle';
                            break;
                        case TaskStatus.DONE:
                            statusQuery = baseQuery ? `${baseQuery}\nfilter by function task.status.type === 'DONE'` : `filter by function task.status.type === 'DONE'`;
                            statusTitle = 'Done';
                            statusIcon = 'circle-check-big';
                            break;
                        case TaskStatus.CANCELLED:
                            statusQuery = baseQuery ? `${baseQuery}\nfilter by function task.status.type === 'CANCELLED'` : `filter by function task.status.type === 'CANCELLED'`;
                            statusTitle = 'Cancelled';
                            statusIcon = 'circle-off';
                            break;
                        default:
                            statusQuery = baseQuery || '';
                            statusTitle = status;
                            statusIcon = 'circle';
                    }

                    columnQueries.push({
                        title: statusTitle,
                        query: statusQuery,
                        icon: statusIcon,
                        isEmoji: false
                    });
                }
                break;

            case ViewLayout.DATE:
                // Date-based columns
                const dateColumns = [
                    { title: 'Overdue', query: baseQuery ? `${baseQuery}\ndue before today` : 'due before today', icon: 'clock-alert', isEmoji: false },
                    { title: 'Today', query: baseQuery ? `${baseQuery}\ndue today` : 'due today', icon: 'clock-arrow-down', isEmoji: false },
                    { title: 'This Week', query: baseQuery ? `${baseQuery}\ndue this week` : 'due this week', icon: 'calendar-arrow-down', isEmoji: false },
                    { title: 'Next Week', query: baseQuery ? `${baseQuery}\ndue next week` : 'due next week', icon: 'calendar-arrow-up', isEmoji: false },
                    { title: 'No Due Date', query: baseQuery ? `${baseQuery}\nno due date` : 'no due date', icon: 'calendar', isEmoji: false }
                ];

                for (const dateColumn of dateColumns) {
                    columnQueries.push(dateColumn);
                }
                break;

            default:
                // Single column with all tasks
                columnQueries.push({
                    title: 'All Tasks',
                    query: baseQuery || '',
                    icon: 'list-todo',
                    isEmoji: false
                });
        }

        return columnQueries;
    }

    async renderQueryColumn(
        container: HTMLElement,
        columnQuery: { title: string, query: string, icon?: string, isEmoji?: boolean },
        viewContext: any
    ): Promise<void> {
        const columnDiv = container.createDiv('task-roles-column');
        columnDiv.addClass('task-query-column');

        // Column header
        const headerDiv = columnDiv.createDiv('task-roles-column-header');
        const titleEl = headerDiv.createEl('h3', { cls: 'task-roles-column-title' });
        
        // Add icon if available
        if (columnQuery.icon) {
            if (columnQuery.isEmoji) {
                // Use emoji icon
                const emojiIcon = titleEl.createSpan('column-icon-emoji');
                emojiIcon.setText(columnQuery.icon);
                emojiIcon.style.marginRight = '8px';
                emojiIcon.style.fontSize = '16px';
                emojiIcon.style.lineHeight = '1';
                emojiIcon.style.verticalAlign = 'middle';
            } else {
                // Use Obsidian system icon
                const iconSpan = titleEl.createSpan('column-icon');
                setIcon(iconSpan, columnQuery.icon);
                iconSpan.style.marginRight = '8px';
                iconSpan.style.display = 'inline-flex';
                iconSpan.style.alignItems = 'center';
                iconSpan.style.verticalAlign = 'middle';
                iconSpan.style.width = '16px';
                iconSpan.style.height = '16px';
            }
        }
        
        // Add title text
        const titleText = titleEl.createSpan('column-title-text');
        titleText.setText(columnQuery.title);
        titleText.style.verticalAlign = 'middle';
        
        // Style the title element for better alignment
        titleEl.style.display = 'flex';
        titleEl.style.alignItems = 'center';
        titleEl.style.gap = '0';

        // Query display
        const queryContainer = columnDiv.createDiv('task-query-display');
        
        // Add progressive disclosure classes based on plugin settings
        const styleMode = this.plugin.settings.taskDisplayMode || 'detailed';
        queryContainer.addClass(`tasks-styled--${styleMode}`);

        // Create markdown content for the query
        const queryMarkdown = columnQuery.query
            ? `\`\`\`tasks\n${columnQuery.query}\n\`\`\``
            : `\`\`\`tasks\n# No specific query for this column\n\`\`\``;

        try {
            // Render the query using MarkdownRenderer
            await MarkdownRenderer.renderMarkdown(
                queryMarkdown,
                queryContainer,
                "virtual/tasks-preview.md",
                viewContext
            );

            // Check for Tasks plugin errors in the rendered content
            setTimeout(() => {
                this.checkForTasksPluginErrors(queryContainer, columnQuery.query, columnQuery.title);
            }, 500);

            // Enhance the rendered tasks with better styling
            this.enhanceTaskDisplay(queryContainer);
        } catch (error) {
            // Display formatted error with query debugging
            this.displayQueryError(queryContainer, error, columnQuery.query, columnQuery.title);
        }

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
            
            // Force re-apply our custom CSS after everything is loaded
            this.reapplyCustomCSS(container);
        }, 100);
    }

    private reapplyCustomCSS(container: HTMLElement): void {
        // Force re-apply styles that might be overridden by other plugins
        setTimeout(() => {
            const taskItems = container.querySelectorAll('.task-list-item');
            
            taskItems.forEach((taskItem: Element) => {
                const htmlTaskItem = taskItem as HTMLElement;
                
                // Force re-apply our custom task styling
                htmlTaskItem.style.setProperty('margin', '0 0 8px 0', 'important');
                htmlTaskItem.style.setProperty('padding', '12px', 'important');
                htmlTaskItem.style.setProperty('background', 'var(--background-primary)', 'important');
                htmlTaskItem.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
                htmlTaskItem.style.setProperty('border-radius', '6px', 'important');
                htmlTaskItem.style.setProperty('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.1)', 'important');
                htmlTaskItem.style.setProperty('transition', 'all 0.2s ease', 'important');
                htmlTaskItem.style.setProperty('position', 'relative', 'important');
                htmlTaskItem.style.setProperty('list-style', 'none', 'important');
                htmlTaskItem.style.setProperty('width', '100%', 'important');
                htmlTaskItem.style.setProperty('box-sizing', 'border-box', 'important');
                
                // Force re-apply priority border colors
                if (htmlTaskItem.classList.contains('priority-urgent')) {
                    htmlTaskItem.style.setProperty('border-left', '4px solid var(--text-error)', 'important');
                    htmlTaskItem.style.setProperty('background', 'linear-gradient(90deg, rgba(255, 67, 54, 0.05) 0%, var(--background-primary) 20%)', 'important');
                } else if (htmlTaskItem.classList.contains('priority-high')) {
                    htmlTaskItem.style.setProperty('border-left', '4px solid var(--color-orange)', 'important');
                    htmlTaskItem.style.setProperty('background', 'linear-gradient(90deg, rgba(255, 152, 0, 0.05) 0%, var(--background-primary) 20%)', 'important');
                } else if (htmlTaskItem.classList.contains('priority-medium')) {
                    htmlTaskItem.style.setProperty('border-left', '4px solid var(--color-blue)', 'important');
                    htmlTaskItem.style.setProperty('background', 'linear-gradient(90deg, rgba(33, 150, 243, 0.05) 0%, var(--background-primary) 20%)', 'important');
                } else if (htmlTaskItem.classList.contains('priority-low')) {
                    htmlTaskItem.style.setProperty('border-left', '4px solid var(--color-green)', 'important');
                    htmlTaskItem.style.setProperty('background', 'linear-gradient(90deg, rgba(76, 175, 80, 0.05) 0%, var(--background-primary) 20%)', 'important');
                }
                
                // Force checkbox positioning
                const checkbox = htmlTaskItem.querySelector('input[type="checkbox"]') as HTMLElement;
                if (checkbox) {
                    checkbox.style.setProperty('position', 'absolute', 'important');
                    checkbox.style.setProperty('top', '12px', 'important');
                    checkbox.style.setProperty('left', '12px', 'important');
                    checkbox.style.setProperty('margin', '0', 'important');
                    checkbox.style.setProperty('transform', 'scale(1.0)', 'important');
                }
                
                // Force task content margin
                const taskDescription = htmlTaskItem.querySelector('.task-description, p');
                if (taskDescription) {
                    (taskDescription as HTMLElement).style.setProperty('margin-left', '20px', 'important');
                    (taskDescription as HTMLElement).style.setProperty('margin-bottom', '0', 'important');
                    (taskDescription as HTMLElement).style.setProperty('line-height', '1.3', 'important');
                    (taskDescription as HTMLElement).style.setProperty('font-size', '13px', 'important');
                    (taskDescription as HTMLElement).style.setProperty('color', 'var(--text-normal)', 'important');
                    (taskDescription as HTMLElement).style.setProperty('word-wrap', 'break-word', 'important');
                    (taskDescription as HTMLElement).style.setProperty('overflow-wrap', 'break-word', 'important');
                }
                
                // Force task metadata margin
                const taskMetadata = htmlTaskItem.querySelector('.task-metadata');
                if (taskMetadata) {
                    (taskMetadata as HTMLElement).style.setProperty('margin-left', '20px', 'important');
                    (taskMetadata as HTMLElement).style.setProperty('margin-top', '6px', 'important');
                }
            });
            
            // Force container padding removal
            const containers = container.querySelectorAll('ul.contains-task-list.plugin-tasks-query-result.tasks-layout-hide-urgency, .contains-task-list.plugin-tasks-query-result.tasks-layout-hide-urgency');
            containers.forEach((containerEl: Element) => {
                const htmlContainer = containerEl as HTMLElement;
                htmlContainer.style.setProperty('padding-left', '0', 'important');
                htmlContainer.style.setProperty('margin-left', '0', 'important');
                htmlContainer.style.setProperty('padding', '0', 'important');
                htmlContainer.style.setProperty('margin', '0', 'important');
            });
        }, 200); // Additional delay to ensure other plugins have finished their modifications
    }

    private checkForTasksPluginErrors(container: HTMLElement, query: string, columnTitle: string): void {
        // Check for common Tasks plugin error patterns in the rendered content
        const contentText = container.textContent || '';
        
        // Look for error messages that the Tasks plugin displays
        const errorPatterns = [
            /Tasks query: do not understand/i,
            /Problem line:/i,
            /Error:/i,
            /Invalid query/i,
            /Unknown instruction/i,
            /Malformed query/i
        ];
        
        const hasError = errorPatterns.some(pattern => pattern.test(contentText));
        
        if (hasError) {
            // Extract the error message
            const lines = contentText.split('\n').filter(line => line.trim());
            const errorMessage = lines.join('\n').trim();
            
            // Replace the content with our formatted error
            this.displayQueryError(container, { message: errorMessage }, query, columnTitle);
        }
    }

    private displayQueryError(container: HTMLElement, error: any, query: string, columnTitle: string): void {
        container.empty();
        
        const errorDiv = container.createDiv('task-query-error');
        
        const errorTitle = errorDiv.createDiv('task-query-error-title');
        errorTitle.setText(`Query Error in ${columnTitle}`);
        
        const errorMessage = errorDiv.createDiv();
        const errorText = error?.message || error?.toString() || 'Unknown error occurred';
        errorMessage.setText(errorText);
        
        const queryDiv = errorDiv.createDiv('task-query-error-query');
        const queryLabel = queryDiv.createEl('strong');
        queryLabel.setText('Query:');
        queryDiv.createEl('br');
        queryDiv.createEl('span').setText(query || 'No query specified');
        
        console.error(`Task Roles Plugin - Query Error in ${columnTitle}:`, {
            error: error,
            query: query,
            columnTitle: columnTitle
        });
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