import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskAssignmentService } from '../dist-test/services/task-assignment.service.js';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '../dist-test/types/index.js';

const appStub = { vault: {}, workspace: {} };

function createService() {
    return new TaskAssignmentService(appStub, DEFAULT_SETTINGS);
}

test('parseTaskAssignments returns single role', () => {
    const service = createService();
    const input = '[🚗:: [[Contacts/John|@John]]]';
    const result = service.parseTaskAssignments(input, DEFAULT_ROLES);
    assert.deepStrictEqual(result, [
        { role: DEFAULT_ROLES[0], assignees: ['@John'] }
    ]);
});

test('applyAssignmentsToLine inserts assignments before metadata', () => {
    const service = createService();
    const line = '- [ ] Test task 🔴 📅 2024-01-01';
    const assignments = [{ roleId: 'drivers', assignees: ['@John'] }];
    const result = service.applyAssignmentsToLine(line, assignments, DEFAULT_ROLES);
    assert.equal(
        result,
        '- [ ] Test task [🚗:: [[Contacts/John|@John]]] 🔴 📅 2024-01-01'
    );
});

test('parseTaskAssignments handles multiple roles', () => {
    const service = createService();
    const input = '[🚗:: [[Contacts/John|@John]]] [👍:: [[Contacts/Jane|@Jane]]]';
    const result = service.parseTaskAssignments(input, DEFAULT_ROLES);
    assert.deepStrictEqual(result, [
        { role: DEFAULT_ROLES[0], assignees: ['@John'] },
        { role: DEFAULT_ROLES[1], assignees: ['@Jane'] }
    ]);
});

test('formatAssignments sorts by role order', () => {
    const service = createService();
    const assignments = [
        { roleId: 'approvers', assignees: ['@Jane'] },
        { roleId: 'drivers', assignees: ['@John'] }
    ];
    const output = service.formatAssignments(assignments, DEFAULT_ROLES);
    assert.equal(
        output,
        '[🚗:: [[Contacts/John|@John]]] [👍:: [[Contacts/Jane|@Jane]]]'
    );
});

test('escapeRegex escapes special characters', () => {
    const service = createService();
    const escaped = service.escapeRegex('.*+?^${}()|[]\\');
    const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
    assert.equal(escaped, expected);
});


test('applyAssignmentsToLine inserts assignments before metadata (duplicate)', () => {
    const service = createService();
    const line = '- [ ] Test task 🔴 📅 2024-01-01';
    const assignments = [{ roleId: 'drivers', assignees: ['@John'] }];
    const result = service.applyAssignmentsToLine(line, assignments, DEFAULT_ROLES);
    assert.equal(
        result,
        '- [ ] Test task [🚗:: [[Contacts/John|@John]]] 🔴 📅 2024-01-01'
    );
});
