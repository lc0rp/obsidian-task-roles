import { App, TFile, Notice } from 'obsidian';
import { TaskData, TaskStatus, TaskPriority, TaskDates, Role, ParsedRoleAssignment } from '../types';
import { TaskRolesService } from './task-roles.service';
import { TaskUtils } from '../utils/task-regex';

export class TaskCacheService {
    private cache: Map<string, TaskData> = new Map();
    private cacheFilePath = '.obsidian/task-roles-cache.json';
    private isUpdating = false;

    constructor(
        private app: App,
        private taskRolesService: TaskRolesService,
        private visibleRoles: Role[],
        private debug: boolean,
        private disableTaskCaching: boolean = false
    ) {
        if (!this.disableTaskCaching) {
            this.setupEventListeners();
        }
    }

    private setupEventListeners() {
        // Listen for file changes
        this.app.vault.on('modify', (file: TFile) => {
            if (file.extension === 'md') {
                this.updateTasksFromFile(file);
            }
        });

        this.app.vault.on('create', (file: TFile) => {
            if (file.extension === 'md') {
                this.updateTasksFromFile(file);
            }
        });

        this.app.vault.on('delete', (file: TFile) => {
            if (file.extension === 'md') {
                this.removeTasksFromFile(file);
            }
        });

        this.app.vault.on('rename', (file: TFile, oldPath: string) => {
            if (file.extension === 'md') {
                this.handleFileRename(file, oldPath);
            }
        });
    }

    async initializeCache(): Promise<void> {
        if (this.disableTaskCaching) {
            if (this.debug) {
                console.log('Task caching is disabled');
            }
            return;
        }

        try {
            await this.loadCacheFromFile();
        } catch (error) {
            if (this.debug) {
                console.log('No existing cache found, building new cache...');
            }
            await this.refreshCache();
        }
    }

    async refreshCache(): Promise<void> {
        if (this.disableTaskCaching) {
            if (this.debug) {
                console.log('Task caching is disabled, skipping cache refresh');
            }
            return;
        }

        if (this.isUpdating) return;

        this.isUpdating = true;
        new Notice('Refreshing task cache...');

        try {
            this.cache.clear();

            const markdownFiles = this.app.vault.getMarkdownFiles();
            await Promise.all(markdownFiles.map((file: TFile) =>
                this.updateTasksFromFile(file).catch(error => {
                    console.error(`Error updating tasks from file ${file.path}:`, error);
                })
            ));

            await this.saveCacheToFile();
            new Notice('Task cache refreshed successfully');
        } catch (error) {
            console.error('Error refreshing cache:', error);
            new Notice('Error refreshing task cache');
        } finally {
            this.isUpdating = false;
        }
    }

    private async updateTasksFromFile(file: TFile): Promise<void> {
        if (this.disableTaskCaching) {
            return;
        }

        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            // Remove existing tasks from this file
            this.removeTasksFromFile(file);

            // Parse tasks from file
            const fileTasks = this.parseTasksFromContent(file, lines);

            // Add new tasks to cache
            for (const task of fileTasks) {
                this.cache.set(task.id, task);
            }

            // Save cache periodically (debounced)
            this.debouncedSave();
        } catch (error) {
            console.error(`Error updating tasks from file ${file.path}:`, error);
        }
    }

    private removeTasksFromFile(file: TFile): void {
        const tasksToRemove = Array.from(this.cache.values())
            .filter(task => task.filePath === file.path);

        for (const task of tasksToRemove) {
            this.cache.delete(task.id);
        }
    }

    private handleFileRename(file: TFile, oldPath: string): void {
        const tasksToUpdate = Array.from(this.cache.values())
            .filter(task => task.filePath === oldPath);

        for (const task of tasksToUpdate) {
            task.filePath = file.path;
            task.modifiedDate = new Date();
        }

        this.debouncedSave();
    }

    private parseTasksFromContent(file: TFile, lines: string[]): TaskData[] {
        const tasks: TaskData[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const taskParsed = TaskUtils.parseTask(line);

            if (taskParsed) {
                const task = this.parseTaskFromLine(file, i, line, taskParsed.content, taskParsed.status);
                if (task) {
                    tasks.push(task);
                }
            }
        }

        return tasks;
    }

    private parseTaskFromLine(
        file: TFile,
        lineNumber: number,
        fullLine: string,
        content: string,
        statusChar: string
    ): TaskData | null {
        try {
            const taskId = `${file.path}:${lineNumber}`;

            // Parse status
            const status = this.parseTaskStatus(statusChar, content);

            // Parse assigned roles
            const roleAssignments = this.taskRolesService.parseRoleAssignments(content, this.visibleRoles);

            // Parse description (remove assigned roles and metadata)
            const description = this.extractTaskDescription(content);

            // Parse priority and tags
            const priority = this.parseTaskPriority(content);
            const tags = this.parseTaskTags(content);

            // Parse dates
            const dates = this.parseTaskDates(content);

            // Get file dates
            const createdDate = new Date(file.stat.ctime);
            const modifiedDate = new Date(file.stat.mtime);

            const searchText = this.buildSearchText(description, file.path, tags, roleAssignments);

            return {
                id: taskId,
                filePath: file.path,
                lineNumber,
                content: fullLine,
                description,
                searchText,
                status,
                priority,
                tags,
                roleAssignments,
                dates,
                createdDate,
                modifiedDate
            };
        } catch (error) {
            console.error(`Error parsing task from line ${lineNumber} in ${file.path}:`, error);
            return null;
        }
    }

    private parseTaskStatus(statusChar: string, content: string): TaskStatus {
        if (statusChar === 'x' || statusChar === 'X') {
            return TaskStatus.DONE;
        }

        // Check for custom status indicators in content
        if (content.includes('🚧') || content.includes('[in-progress]')) {
            return TaskStatus.IN_PROGRESS;
        }

        if (content.includes('❌') || content.includes('[cancelled]')) {
            return TaskStatus.CANCELLED;
        }

        return TaskStatus.TODO;
    }

    private parseTaskPriority(content: string): TaskPriority {
        if (content.includes('🔴') || content.includes('[urgent]') || content.includes('!!!')) {
            return TaskPriority.HIGHEST;
        }

        if (content.includes('🟡') || content.includes('[high]') || content.includes('!!')) {
            return TaskPriority.HIGH;
        }

        if (content.includes('🟢') || content.includes('[low]')) {
            return TaskPriority.LOW;
        }

        return TaskPriority.MEDIUM;
    }

    private parseTaskTags(content: string): string[] {
        const tagRegex = /#[\w-]+/g;
        const matches = content.match(tagRegex);
        return matches ? matches.map(tag => tag.substring(1)) : [];
    }

    private parseTaskDates(content: string): TaskDates {
        const dates: TaskDates = {};

        // Parse various date formats
        const datePatterns = [
            { type: 'due', pattern: /due:\s*(\d{4}-\d{2}-\d{2})/i },
            { type: 'scheduled', pattern: /scheduled:\s*(\d{4}-\d{2}-\d{2})/i },
            { type: 'completed', pattern: /completed:\s*(\d{4}-\d{2}-\d{2})/i },
            { type: 'due', pattern: /📅\s*(\d{4}-\d{2}-\d{2})/i },
            { type: 'due', pattern: /\[due::\s*(\d{4}-\d{2}-\d{2})\]/i }
        ];

        for (const { type, pattern } of datePatterns) {
            const match = content.match(pattern);
            if (match) {
                const dateStr = match[1];
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    dates[type as keyof TaskDates] = date;
                }
            }
        }

        return dates;
    }

    private extractTaskDescription(content: string): string {
        // Remove assigned roles, dates, priority indicators, and tags
        let description = content;

        // Remove role assigned roles - both old and new formats
        const allIcons = this.visibleRoles.map(r => this.taskRolesService.escapeRegex(r.icon)).join('');

        // Remove old format assigned roles (icon + wiki-links)
        for (const role of this.visibleRoles) {
            const regex = new RegExp(`\\s*${this.taskRolesService.escapeRegex(role.icon)}\\s+[^${allIcons}]*`, 'gu');
            description = description.replace(regex, '');
        }

        // Remove new format assigned roles (dataview inline)
        for (const role of this.visibleRoles) {
            const escapedIcon = this.taskRolesService.escapeRegex(role.icon);
            const regex = new RegExp(`\\s*\\[${escapedIcon}::[^\\]]*\\]`, 'gu');
            description = description.replace(regex, '');
        }

        // Remove HTML comments from old format
        description = description
            .replace(/<!--TA-->/g, '')
            .replace(/<!--\/TA-->/g, '');

        // Remove dates, priority, and tags
        description = description
            .replace(/\s*(due|scheduled|completed):\s*\d{4}-\d{2}-\d{2}/gi, '')
            .replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/gi, '')
            .replace(/\s*\[due::\s*\d{4}-\d{2}-\d{2}\]/gi, '')
            .replace(/\s*[🔴🟡🟢]/gu, '')
            .replace(/\s*\[(urgent|high|low|in-progress|cancelled)\]/gi, '')
            .replace(/\s*!{1,3}/g, '')
            .replace(/\s*#[\w-]+/g, '')
            .trim();

        return description;
    }

    private buildSearchText(description: string, filePath: string, tags: string[], roleAssignments: ParsedRoleAssignment[]): string {
        return [
            description,
            filePath,
            ...tags,
            ...roleAssignments.flatMap(a => a.assignees)
        ].join(' ').toLowerCase();
    }

    private saveTimeout: number | null = null;

    private debouncedSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveCacheToFile();
        }, 1000) as any;
    }

    private async saveCacheToFile(): Promise<void> {
        try {
            const cacheData = {
                version: 1,
                lastUpdated: new Date().toISOString(),
                tasks: Array.from(this.cache.values()).map(task => ({
                    ...task,
                    createdDate: task.createdDate.toISOString(),
                    modifiedDate: task.modifiedDate.toISOString(),
                    dates: {
                        created: task.dates.created?.toISOString(),
                        due: task.dates.due?.toISOString(),
                        completed: task.dates.completed?.toISOString(),
                        scheduled: task.dates.scheduled?.toISOString()
                    }
                }))
            };

            await this.app.vault.adapter.write(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.error('Error saving cache to file:', error);
        }
    }

    private async loadCacheFromFile(): Promise<void> {
        try {
            const cacheContent = await this.app.vault.adapter.read(this.cacheFilePath);
            const cacheData = JSON.parse(cacheContent);

            if (cacheData.version === 1 && cacheData.tasks) {
                this.cache.clear();

                for (const taskData of cacheData.tasks) {
                    const task: TaskData = {
                        ...taskData,
                        createdDate: new Date(taskData.createdDate),
                        modifiedDate: new Date(taskData.modifiedDate),
                        dates: {
                            created: taskData.dates.created ? new Date(taskData.dates.created) : undefined,
                            due: taskData.dates.due ? new Date(taskData.dates.due) : undefined,
                            completed: taskData.dates.completed ? new Date(taskData.dates.completed) : undefined,
                            scheduled: taskData.dates.scheduled ? new Date(taskData.dates.scheduled) : undefined
                        }
                    };

                    if (!task.searchText) {
                        task.searchText = this.buildSearchText(task.description, task.filePath, task.tags, task.roleAssignments);
                    }

                    this.cache.set(task.id, task);
                }
            }
        } catch (error) {
            throw new Error('Failed to load cache from file.');
        }
    }

    // Public methods for views
    getAllTasks(): TaskData[] {
        return Array.from(this.cache.values());
    }

    getTaskById(id: string): TaskData | undefined {
        return this.cache.get(id);
    }

    getTasksByFilter(filter: (task: TaskData) => boolean): TaskData[] {
        return Array.from(this.cache.values()).filter(filter);
    }

    async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
        const task = this.cache.get(taskId);
        if (!task) return;

        try {
            const file = this.app.vault.getAbstractFileByPath(task.filePath);
            if (!file || !(file instanceof TFile)) return;

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            if (task.lineNumber < lines.length) {
                const line = lines[task.lineNumber];
                const statusChar = newStatus === TaskStatus.DONE ? 'x' : ' ';
                const newLine = line.replace(/^(\s*[-*+]\s*\[)[x\s](\]\s*.+)$/, `$1${statusChar}$2`);

                lines[task.lineNumber] = newLine;
                await this.app.vault.modify(file, lines.join('\n'));

                // Update cache
                task.status = newStatus;
                task.modifiedDate = new Date();
                if (newStatus === TaskStatus.DONE) {
                    task.dates.completed = new Date();
                }
            }
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    }

    destroy(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveCacheToFile();
    }
} 