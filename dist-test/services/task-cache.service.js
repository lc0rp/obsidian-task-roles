import { TFile, Notice } from 'obsidian';
import { TaskStatus, TaskPriority } from '../types';
export class TaskCacheService {
    constructor(app, taskAssignmentService, visibleRoles, debug) {
        this.app = app;
        this.taskAssignmentService = taskAssignmentService;
        this.visibleRoles = visibleRoles;
        this.debug = debug;
        this.cache = new Map();
        this.cacheFilePath = '.obsidian/task-assignment-cache.json';
        this.isUpdating = false;
        this.saveTimeout = null;
        this.setupEventListeners();
    }
    setupEventListeners() {
        // Listen for file changes
        this.app.vault.on('modify', (file) => {
            if (file.extension === 'md') {
                this.updateTasksFromFile(file);
            }
        });
        this.app.vault.on('create', (file) => {
            if (file.extension === 'md') {
                this.updateTasksFromFile(file);
            }
        });
        this.app.vault.on('delete', (file) => {
            if (file.extension === 'md') {
                this.removeTasksFromFile(file);
            }
        });
        this.app.vault.on('rename', (file, oldPath) => {
            if (file.extension === 'md') {
                this.handleFileRename(file, oldPath);
            }
        });
    }
    async initializeCache() {
        try {
            await this.loadCacheFromFile();
        }
        catch (error) {
            if (this.debug) {
                console.log('No existing cache found, building new cache...');
            }
            await this.refreshCache();
        }
    }
    async refreshCache() {
        if (this.isUpdating)
            return;
        this.isUpdating = true;
        new Notice('Refreshing task cache...');
        try {
            this.cache.clear();
            const markdownFiles = this.app.vault.getMarkdownFiles();
            await Promise.all(markdownFiles.map(file => this.updateTasksFromFile(file).catch(error => {
                console.error(`Error updating tasks from file ${file.path}:`, error);
            })));
            await this.saveCacheToFile();
            new Notice('Task cache refreshed successfully');
        }
        catch (error) {
            console.error('Error refreshing cache:', error);
            new Notice('Error refreshing task cache');
        }
        finally {
            this.isUpdating = false;
        }
    }
    async updateTasksFromFile(file) {
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
        }
        catch (error) {
            console.error(`Error updating tasks from file ${file.path}:`, error);
        }
    }
    removeTasksFromFile(file) {
        const tasksToRemove = Array.from(this.cache.values())
            .filter(task => task.filePath === file.path);
        for (const task of tasksToRemove) {
            this.cache.delete(task.id);
        }
    }
    handleFileRename(file, oldPath) {
        const tasksToUpdate = Array.from(this.cache.values())
            .filter(task => task.filePath === oldPath);
        for (const task of tasksToUpdate) {
            task.filePath = file.path;
            task.modifiedDate = new Date();
        }
        this.debouncedSave();
    }
    parseTasksFromContent(file, lines) {
        const tasks = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const taskMatch = line.match(/^(\s*)[-*+]\s*\[([x\s])\]\s*(.+)$/);
            if (taskMatch) {
                const [, , statusChar, content] = taskMatch;
                const task = this.parseTaskFromLine(file, i, line, content, statusChar);
                if (task) {
                    tasks.push(task);
                }
            }
        }
        return tasks;
    }
    parseTaskFromLine(file, lineNumber, fullLine, content, statusChar) {
        try {
            const taskId = `${file.path}:${lineNumber}`;
            // Parse status
            const status = this.parseTaskStatus(statusChar, content);
            // Parse assignments
            const assignments = this.taskAssignmentService.parseTaskAssignments(content, this.visibleRoles);
            // Parse description (remove assignments and metadata)
            const description = this.extractTaskDescription(content);
            // Parse priority and tags
            const priority = this.parseTaskPriority(content);
            const tags = this.parseTaskTags(content);
            // Parse dates
            const dates = this.parseTaskDates(content);
            // Get file dates
            const createdDate = new Date(file.stat.ctime);
            const modifiedDate = new Date(file.stat.mtime);
            const searchText = this.buildSearchText(description, file.path, tags, assignments);
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
                assignments,
                dates,
                createdDate,
                modifiedDate
            };
        }
        catch (error) {
            console.error(`Error parsing task from line ${lineNumber} in ${file.path}:`, error);
            return null;
        }
    }
    parseTaskStatus(statusChar, content) {
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
    parseTaskPriority(content) {
        if (content.includes('🔴') || content.includes('[urgent]') || content.includes('!!!')) {
            return TaskPriority.URGENT;
        }
        if (content.includes('🟡') || content.includes('[high]') || content.includes('!!')) {
            return TaskPriority.HIGH;
        }
        if (content.includes('🟢') || content.includes('[low]')) {
            return TaskPriority.LOW;
        }
        return TaskPriority.MEDIUM;
    }
    parseTaskTags(content) {
        const tagRegex = /#[\w-]+/g;
        const matches = content.match(tagRegex);
        return matches ? matches.map(tag => tag.substring(1)) : [];
    }
    parseTaskDates(content) {
        const dates = {};
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
                    dates[type] = date;
                }
            }
        }
        return dates;
    }
    extractTaskDescription(content) {
        // Remove assignments, dates, priority indicators, and tags
        let description = content;
        // Remove role assignments
        const allIcons = this.visibleRoles.map(r => this.taskAssignmentService.escapeRegex(r.icon)).join('');
        for (const role of this.visibleRoles) {
            const regex = new RegExp(`\\s*${this.taskAssignmentService.escapeRegex(role.icon)}\\s+[^${allIcons}]*`, 'gu');
            description = description.replace(regex, '');
        }
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
    buildSearchText(description, filePath, tags, assignments) {
        return [
            description,
            filePath,
            ...tags,
            ...assignments.flatMap(a => a.assignees)
        ].join(' ').toLowerCase();
    }
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveCacheToFile();
        }, 1000);
    }
    async saveCacheToFile() {
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
        }
        catch (error) {
            console.error('Error saving cache to file:', error);
        }
    }
    async loadCacheFromFile() {
        try {
            const cacheContent = await this.app.vault.adapter.read(this.cacheFilePath);
            const cacheData = JSON.parse(cacheContent);
            if (cacheData.version === 1 && cacheData.tasks) {
                this.cache.clear();
                for (const taskData of cacheData.tasks) {
                    const task = {
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
                        task.searchText = this.buildSearchText(task.description, task.filePath, task.tags, task.assignments);
                    }
                    this.cache.set(task.id, task);
                }
            }
        }
        catch (error) {
            throw new Error('Failed to load cache from file');
        }
    }
    // Public methods for views
    getAllTasks() {
        return Array.from(this.cache.values());
    }
    getTaskById(id) {
        return this.cache.get(id);
    }
    getTasksByFilter(filter) {
        return Array.from(this.cache.values()).filter(filter);
    }
    async updateTaskStatus(taskId, newStatus) {
        const task = this.cache.get(taskId);
        if (!task)
            return;
        try {
            const file = this.app.vault.getAbstractFileByPath(task.filePath);
            if (!file || !(file instanceof TFile))
                return;
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
        }
        catch (error) {
            console.error('Error updating task status:', error);
        }
    }
    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveCacheToFile();
    }
}
