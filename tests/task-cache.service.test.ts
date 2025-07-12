import { describe, it, expect } from 'vitest';
import { TaskUtils } from '../src/utils/task-regex';

describe('Task Regex Patterns', () => {
    it('task regex matches bullet point tasks', () => {
        // Test bullet points
        expect(TaskUtils.isTaskCaseInsensitive('- [ ] First task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('- [x] Second task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('* [ ] Third task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('+ [x] Fourth task')).toBe(true);

        // Test with indentation
        expect(TaskUtils.isTaskCaseInsensitive('  - [ ] Indented task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('    * [x] More indented task')).toBe(true);
    });

    it('task regex matches numbered list tasks', () => {
        // Test numbered lists
        expect(TaskUtils.isTaskCaseInsensitive('1. [ ] First numbered task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('2. [x] Second numbered task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('10. [ ] Tenth task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('123. [x] Large numbered task')).toBe(true);

        // Test with indentation
        expect(TaskUtils.isTaskCaseInsensitive('  1. [ ] Indented numbered task')).toBe(true);
        expect(TaskUtils.isTaskCaseInsensitive('    2. [x] More indented numbered task')).toBe(true);
    });

    it('task regex rejects non-task lines', () => {
        // Should not match
        expect(TaskUtils.isTaskCaseInsensitive('Regular text')).toBe(false);
        expect(TaskUtils.isTaskCaseInsensitive('- Not a task (no checkbox)')).toBe(false);
        expect(TaskUtils.isTaskCaseInsensitive('1. Also not a task')).toBe(false);
        expect(TaskUtils.isTaskCaseInsensitive('[ ] Missing bullet point')).toBe(false);
        expect(TaskUtils.isTaskCaseInsensitive('- [invalid] Invalid checkbox')).toBe(false);
    });

    it('task parsing regex extracts components correctly', () => {
        // Test bullet point task
        const bulletParsed = TaskUtils.parseTask('- [x] Complete project documentation');
        expect(bulletParsed).toBeTruthy();
        expect(bulletParsed.indentation).toBe(''); // indentation
        expect(bulletParsed.status).toBe('x'); // status
        expect(bulletParsed.content).toBe('Complete project documentation'); // content

        // Test numbered task
        const numberedParsed = TaskUtils.parseTask('1. [ ] First numbered task');
        expect(numberedParsed).toBeTruthy();
        expect(numberedParsed.indentation).toBe(''); // indentation
        expect(numberedParsed.status).toBe(' '); // status
        expect(numberedParsed.content).toBe('First numbered task'); // content

        // Test indented numbered task
        const indentedParsed = TaskUtils.parseTask('  2. [x] Indented numbered task');
        expect(indentedParsed).toBeTruthy();
        expect(indentedParsed.indentation).toBe('  '); // indentation
        expect(indentedParsed.status).toBe('x'); // status
        expect(indentedParsed.content).toBe('Indented numbered task'); // content
    });

    it('checkbox match regex works for editor extension', () => {
        // Test that it matches and extracts the prefix correctly
        const bulletResult = TaskUtils.getCheckboxPrefix('- [x] Task content');
        expect(bulletResult).toBeTruthy();
        expect(bulletResult[0]).toBe('- [x] ');

        const numberedResult = TaskUtils.getCheckboxPrefix('1. [ ] Task content');
        expect(numberedResult).toBeTruthy();
        expect(numberedResult[0]).toBe('1. [ ] ');

        const indentedResult = TaskUtils.getCheckboxPrefix('  2. [X] Task content');
        expect(indentedResult).toBeTruthy();
        expect(indentedResult[0]).toBe('  2. [X] ');
    });

    it('role suggest task line detection', () => {
        // Should match task lines
        expect(TaskUtils.isTaskLine('- [ ] Task')).toBe(true);
        expect(TaskUtils.isTaskLine('- [x] Done task')).toBe(true);
        expect(TaskUtils.isTaskLine('1. [ ] Numbered task')).toBe(true);
        expect(TaskUtils.isTaskLine('2. [x] Done numbered task')).toBe(true);

        // Should not match non-task lines
        expect(TaskUtils.isTaskLine('Regular text')).toBe(false);
        expect(TaskUtils.isTaskLine('- Not a task')).toBe(false);
        expect(TaskUtils.isTaskLine('1. Not a task')).toBe(false);
    });
}); 