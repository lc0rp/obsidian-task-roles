/**
 * Centralized task regex patterns for consistent task detection across the plugin.
 * 
 * This module provides all regex patterns needed to detect and parse markdown tasks
 * in both bullet point format (-, *, +) and numbered list format (1., 2., etc.).
 */

/**
 * Base pattern for task list prefixes (bullet points or numbered lists)
 */
const TASK_PREFIX_PATTERN = '(?:[-*+]|\\d+\\.)';

/**
 * Pattern for checkbox states
 */
const CHECKBOX_PATTERN = '\\[[ xX]\\]';

/**
 * Pattern for checkbox states with capture groups (for parsing)
 */
const CHECKBOX_CAPTURE_PATTERN = '\\[([x\\s])\\]';

/**
 * Task regex patterns used throughout the plugin
 */
export const TaskRegex = {
    /**
     * Detects if a line is a task (has checkbox) - used for basic detection
     * Matches: "- [ ] task", "1. [x] task", "  * [ ] task"
     */
    IS_TASK: new RegExp(`^\\s*${TASK_PREFIX_PATTERN}\\s*${CHECKBOX_PATTERN}`),

    /**
     * Detects if a line is a task with case-insensitive X - used in editor extension
     * Matches: "- [ ] task", "1. [X] task", "  * [x] task"
     */
    IS_TASK_CASE_INSENSITIVE: new RegExp(`^\\s*${TASK_PREFIX_PATTERN}\\s*\\[[ xX]\\]`),

    /**
     * Matches checkbox prefix (including whitespace after) - used to find content after checkbox
     * Matches: "- [ ] ", "1. [x] ", "  * [X] "
     */
    CHECKBOX_PREFIX: new RegExp(`^\\s*${TASK_PREFIX_PATTERN}\\s*\\[[ xX]\\]\\s*`),

    /**
     * Full task parsing regex with capture groups - used for complete task parsing
     * Groups: (indentation, status, content)
     * Matches: "  - [x] task content" -> ["  ", "x", "task content"]
     */
    PARSE_TASK: new RegExp(`^(\\s*)${TASK_PREFIX_PATTERN}\\s*${CHECKBOX_CAPTURE_PATTERN}\\s*(.+)$`),

    /**
     * Task line detection for role suggestions (lowercase x only)
     * Matches: "- [ ] task", "1. [x] task" but not "1. [X] task"
     */
    IS_TASK_LINE: new RegExp(`^\\s*${TASK_PREFIX_PATTERN}\\s*\\[[ x]\\]`)
};

/**
 * Utility functions for task detection
 */
export const TaskUtils = {
    /**
     * Check if a line is a task
     */
    isTask(line: string): boolean {
        return TaskRegex.IS_TASK.test(line);
    },

    /**
     * Check if a line is a task (case-insensitive)
     */
    isTaskCaseInsensitive(line: string): boolean {
        return TaskRegex.IS_TASK_CASE_INSENSITIVE.test(line);
    },

    /**
     * Check if a line is a task line (for role suggestions)
     */
    isTaskLine(line: string): boolean {
        return TaskRegex.IS_TASK_LINE.test(line);
    },

    /**
     * Get the checkbox prefix match (including whitespace after)
     */
    getCheckboxPrefix(line: string): RegExpMatchArray | null {
        return line.match(TaskRegex.CHECKBOX_PREFIX);
    },

    /**
     * Parse a task line into its components
     * @returns Object with indentation, status, and content, or null if not a task
     */
    parseTask(line: string): { indentation: string; status: string; content: string } | null {
        const match = line.match(TaskRegex.PARSE_TASK);
        if (!match) return null;

        const [, indentation, status, content] = match;
        return { indentation, status, content };
    },

    /**
     * Detect which roles are already present on a line
     * @param line The line to check
     * @param visibleRoles Array of visible roles to check for
     * @returns Array of role IDs that are already present on the line
     */
    getExistingRoles(line: string, visibleRoles: any[]): string[] {
        const existingRoleIds: string[] = [];

        // Check for dataview format: [🚗:: @John]
        for (const role of visibleRoles) {
            const escapedIcon = role.icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const dataviewPattern = new RegExp(`\\[${escapedIcon}::\\s*[^\\]]*\\]`, 'g');
            if (dataviewPattern.test(line)) {
                existingRoleIds.push(role.id);
            }
        }

        // Check for legacy format: 🚗 [[Contacts/John|@John]]
        for (const role of visibleRoles) {
            const escapedIcon = role.icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const legacyPattern = new RegExp(`${escapedIcon}\\s+\\[\\[`, 'g');
            if (legacyPattern.test(line)) {
                existingRoleIds.push(role.id);
            }
        }

        return existingRoleIds;
    },

    /**
     * Find the cursor position for adding assignees to an existing role
     * Returns the position where a new assignee should be inserted
     */
    findRoleCursorPosition(line: string, role: any): { position: number; needsSeparator: boolean } | null {
        const escapedIcon = role.icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Check for dataview format: [🚗:: assignees]
        // We need to handle nested brackets in wikilinks like [[Task Roles Demo/People/Me|@Me]]
        const roleStartPattern = new RegExp(`\\[${escapedIcon}::\\s*`, 'g');
        const roleStartMatch = roleStartPattern.exec(line);
        
        if (roleStartMatch) {
            // Find the matching closing bracket, accounting for nested brackets
            const startPos = roleStartMatch.index;
            const contentStart = roleStartMatch.index + roleStartMatch[0].length;
            let bracketCount = 1; // We've seen the opening [
            let pos = contentStart;
            
            // Walk through the string to find the matching closing bracket
            while (pos < line.length && bracketCount > 0) {
                if (line[pos] === '[') {
                    bracketCount++;
                } else if (line[pos] === ']') {
                    bracketCount--;
                }
                
                if (bracketCount === 0) {
                    // Found the closing bracket
                    const assigneesText = line.substring(contentStart, pos).trim();
                    const hasAssignees = assigneesText.length > 0;
                    return { position: pos, needsSeparator: hasAssignees };
                }
                
                pos++;
            }
        }

        // Check for legacy format: 🚗 [[Contacts/John|@John]]
        const legacyPattern = new RegExp(`${escapedIcon}\\s+`, 'g');
        const legacyMatch = legacyPattern.exec(line);
        if (legacyMatch) {
            // For legacy format, position cursor after the icon and space
            const position = legacyMatch.index + legacyMatch[0].length;
            return { position, needsSeparator: false };
        }

        return null;
    }
}; 