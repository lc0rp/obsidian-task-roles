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

        // Check for legacy format: 🚗 [[People/John|@John]]
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

        // Check for legacy format: 🚗 [[People/John|@John]]
        const legacyPattern = new RegExp(`${escapedIcon}\\s+`, 'g');
        const legacyMatch = legacyPattern.exec(line);
        if (legacyMatch) {
            // For legacy format, position cursor after the icon and space
            const position = legacyMatch.index + legacyMatch[0].length;
            return { position, needsSeparator: false };
        }

        return null;
    },

    /**
     * Find the nearest legal position to insert a role icon
     * Legal positions are: after task checkbox, between roles, after roles, or after task description
     */
    findNearestLegalInsertionPoint(line: string, currentPosition: number): number {
        // Clamp position to valid range
        currentPosition = Math.max(0, Math.min(currentPosition, line.length));
        
        // First, check if current position is already legal
        if (this.isLegalInsertionPoint(line, currentPosition)) {
            return currentPosition;
        }

        // Find all legal positions in the line
        const legalPositions = this.findAllLegalInsertionPoints(line);
        
        if (legalPositions.length === 0) {
            // No legal positions found, default to after task checkbox if it exists
            const checkboxMatch = this.getCheckboxPrefix(line);
            return checkboxMatch ? checkboxMatch[0].length : 0;
        }

        // Find the closest legal position to current cursor
        let closestPosition = legalPositions[0];
        let minDistance = Math.abs(currentPosition - legalPositions[0]);

        for (const pos of legalPositions) {
            const distance = Math.abs(currentPosition - pos);
            if (distance < minDistance) {
                minDistance = distance;
                closestPosition = pos;
            }
        }

        return closestPosition;
    },

    /**
     * Check if a position is legal for role insertion
     */
    isLegalInsertionPoint(line: string, position: number): boolean {
        // Can't be before the start or after the end
        if (position < 0 || position > line.length) {
            return false;
        }

        // Can't be inside a role assignment
        if (this.isInsideRoleAssignment(line, position)) {
            return false;
        }

        // Can't be inside a wikilink
        if (this.isInsideWikilink(line, position)) {
            return false;
        }

        // Must be after task checkbox
        const checkboxMatch = this.getCheckboxPrefix(line);
        if (!checkboxMatch || position < checkboxMatch[0].length) {
            return false;
        }

        // Can't be in the middle of a word (must be at word boundary or whitespace)
        if (position > 0 && position < line.length) {
            const prevChar = line[position - 1];
            const nextChar = line[position];
            
            // Allow if surrounded by whitespace or at end of existing role
            if (prevChar === ' ' || nextChar === ' ' || 
                prevChar === ']' || nextChar === '[' ||
                position === line.length) {
                return true;
            }
            
            // Don't allow in middle of word
            if (/\w/.test(prevChar) && /\w/.test(nextChar)) {
                return false;
            }
        }

        return true;
    },

    /**
     * Find all legal insertion points in a line
     */
    findAllLegalInsertionPoints(line: string): number[] {
        const positions: number[] = [];
        
        // After task checkbox (if exists)
        const checkboxMatch = this.getCheckboxPrefix(line);
        if (checkboxMatch) {
            positions.push(checkboxMatch[0].length);
        }

        // Find positions after each role assignment using proper bracket matching
        const roleStartPattern = /\[.+?::\s*/g;
        let roleMatch;
        while ((roleMatch = roleStartPattern.exec(line)) !== null) {
            // Find the matching closing bracket for this role
            let bracketCount = 1; // We've seen the opening [
            let pos = roleMatch.index + roleMatch[0].length;
            
            while (pos < line.length && bracketCount > 0) {
                if (line[pos] === '[') {
                    bracketCount++;
                } else if (line[pos] === ']') {
                    bracketCount--;
                }
                
                if (bracketCount === 0) {
                    // Found the closing bracket, add position after it
                    const afterRolePos = pos + 1;
                    if (afterRolePos === line.length || line[afterRolePos] === ' ') {
                        positions.push(afterRolePos);
                    }
                    break;
                }
                pos++;
            }
        }

        // End of line (if not already covered and is legal)
        const trimmedEnd = line.trimEnd().length;
        if (!positions.includes(trimmedEnd) && this.isLegalInsertionPoint(line, trimmedEnd)) {
            positions.push(trimmedEnd);
        }

        // Remove duplicates and sort, and filter to only legal positions
        return [...new Set(positions)]
            .filter(pos => this.isLegalInsertionPoint(line, pos))
            .sort((a, b) => a - b);
    },

    /**
     * Check if position is inside a role assignment like [🚗:: @user]
     */
    isInsideRoleAssignment(line: string, position: number): boolean {
        // Use proper bracket matching to find role assignments
        // Match any character (including emojis) followed by :: 
        const roleStartPattern = /\[.+?::\s*/g;
        let roleMatch;
        while ((roleMatch = roleStartPattern.exec(line)) !== null) {
            const roleStart = roleMatch.index;
            
            // Find the matching closing bracket for this role
            let bracketCount = 1; // We've seen the opening [
            let pos = roleMatch.index + roleMatch[0].length;
            
            while (pos < line.length && bracketCount > 0) {
                if (line[pos] === '[') {
                    bracketCount++;
                } else if (line[pos] === ']') {
                    bracketCount--;
                }
                
                if (bracketCount === 0) {
                    // Found the closing bracket
                    const roleEnd = pos;
                    // Position is inside if it's after the start and before or at the end
                    if (position > roleStart && position <= roleEnd) {
                        return true;
                    }
                    break;
                }
                pos++;
            }
        }
        return false;
    },

    /**
     * Check if position is inside a wikilink like [[Page|Display]]
     */
    isInsideWikilink(line: string, position: number): boolean {
        // Use proper bracket matching to find wikilinks
        let i = 0;
        while (i < line.length - 1) {
            if (line[i] === '[' && line[i + 1] === '[') {
                // Found start of wikilink
                const wikilinkStart = i;
                let bracketCount = 2; // We've seen [[
                let pos = i + 2;
                
                while (pos < line.length && bracketCount > 0) {
                    if (pos < line.length - 1 && line[pos] === ']' && line[pos + 1] === ']') {
                        bracketCount -= 2;
                        pos++; // Skip the second ]
                    }
                    
                    if (bracketCount === 0) {
                        // Found the closing ]]
                        const wikilinkEnd = pos;
                        if (position > wikilinkStart && position < wikilinkEnd) {
                            return true;
                        }
                        i = pos; // Continue searching from after this wikilink
                        break;
                    }
                    pos++;
                }
                
                if (bracketCount > 0) {
                    // Unclosed wikilink, skip
                    i = pos;
                }
            } else {
                i++;
            }
        }
        return false;
    }
}; 