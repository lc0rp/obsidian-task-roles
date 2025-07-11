import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskRegex, TaskUtils } from '../dist-test/utils/task-regex.js';

// Test the regex patterns directly to verify numbered list support
test('task regex matches bullet point tasks', () => {
    // Test bullet points
    assert.ok(TaskUtils.isTaskCaseInsensitive('- [ ] First task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('- [x] Second task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('* [ ] Third task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('+ [x] Fourth task'));

    // Test with indentation
    assert.ok(TaskUtils.isTaskCaseInsensitive('  - [ ] Indented task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('    * [x] More indented task'));
});

test('task regex matches numbered list tasks', () => {
    // Test numbered lists
    assert.ok(TaskUtils.isTaskCaseInsensitive('1. [ ] First numbered task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('2. [x] Second numbered task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('10. [ ] Tenth task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('123. [x] Large numbered task'));

    // Test with indentation
    assert.ok(TaskUtils.isTaskCaseInsensitive('  1. [ ] Indented numbered task'));
    assert.ok(TaskUtils.isTaskCaseInsensitive('    2. [x] More indented numbered task'));
});

test('task regex rejects non-task lines', () => {
    // Should not match
    assert.ok(!TaskUtils.isTaskCaseInsensitive('Regular text'));
    assert.ok(!TaskUtils.isTaskCaseInsensitive('- Not a task (no checkbox)'));
    assert.ok(!TaskUtils.isTaskCaseInsensitive('1. Also not a task'));
    assert.ok(!TaskUtils.isTaskCaseInsensitive('[ ] Missing bullet point'));
    assert.ok(!TaskUtils.isTaskCaseInsensitive('- [invalid] Invalid checkbox'));
});

test('task parsing regex extracts components correctly', () => {
    // Test bullet point task
    const bulletParsed = TaskUtils.parseTask('- [x] Complete project documentation');
    assert.ok(bulletParsed);
    assert.equal(bulletParsed.indentation, ''); // indentation
    assert.equal(bulletParsed.status, 'x'); // status
    assert.equal(bulletParsed.content, 'Complete project documentation'); // content

    // Test numbered task
    const numberedParsed = TaskUtils.parseTask('1. [ ] First numbered task');
    assert.ok(numberedParsed);
    assert.equal(numberedParsed.indentation, ''); // indentation
    assert.equal(numberedParsed.status, ' '); // status
    assert.equal(numberedParsed.content, 'First numbered task'); // content

    // Test indented numbered task
    const indentedParsed = TaskUtils.parseTask('  2. [x] Indented numbered task');
    assert.ok(indentedParsed);
    assert.equal(indentedParsed.indentation, '  '); // indentation
    assert.equal(indentedParsed.status, 'x'); // status
    assert.equal(indentedParsed.content, 'Indented numbered task'); // content
});

test('checkbox match regex works for editor extension', () => {
    // Test that it matches and extracts the prefix correctly
    const bulletResult = TaskUtils.getCheckboxPrefix('- [x] Task content');
    assert.ok(bulletResult);
    assert.equal(bulletResult[0], '- [x] ');

    const numberedResult = TaskUtils.getCheckboxPrefix('1. [ ] Task content');
    assert.ok(numberedResult);
    assert.equal(numberedResult[0], '1. [ ] ');

    const indentedResult = TaskUtils.getCheckboxPrefix('  2. [X] Task content');
    assert.ok(indentedResult);
    assert.equal(indentedResult[0], '  2. [X] ');
});

test('role suggest task line detection', () => {
    // Should match task lines
    assert.ok(TaskUtils.isTaskLine('- [ ] Task'));
    assert.ok(TaskUtils.isTaskLine('- [x] Done task'));
    assert.ok(TaskUtils.isTaskLine('1. [ ] Numbered task'));
    assert.ok(TaskUtils.isTaskLine('2. [x] Done numbered task'));

    // Should not match non-task lines
    assert.ok(!TaskUtils.isTaskLine('Regular text'));
    assert.ok(!TaskUtils.isTaskLine('- Not a task'));
    assert.ok(!TaskUtils.isTaskLine('1. Not a task'));
}); 