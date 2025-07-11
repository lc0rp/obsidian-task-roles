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
    }
}; 