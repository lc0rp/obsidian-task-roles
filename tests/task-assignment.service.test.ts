import { describe, it, expect } from 'vitest';
import { TaskAssignmentService } from '../src/services/task-assignment.service';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '../src/types/index';

const appStub = { vault: {}, workspace: {} };

function createService() {
    return new TaskAssignmentService(appStub, DEFAULT_SETTINGS);
}

describe('TaskAssignmentService', () => {
    it('parseTaskAssignments returns single role', () => {
        const service = createService();
        const input = '[🚗:: [[Contacts/John|@John]]]';
        const result = service.parseTaskAssignments(input, DEFAULT_ROLES);
        expect(result).toEqual([
            { role: DEFAULT_ROLES[0], assignees: ['@John'] }
        ]);
    });

    it('applyAssignmentsToLine inserts assignments before metadata', () => {
        const service = createService();
        const line = '- [ ] Test task 🔴 📅 2024-01-01';
        const assignments = [{ roleId: 'drivers', assignees: ['@John'] }];
        const result = service.applyAssignmentsToLine(line, assignments, DEFAULT_ROLES);
        expect(result).toBe(
            '- [ ] Test task [🚗:: [[Contacts/John|@John]]] 🔴 📅 2024-01-01'
        );
    });

    it('parseTaskAssignments handles multiple roles', () => {
        const service = createService();
        const input = '[🚗:: [[Contacts/John|@John]]] [👍:: [[Contacts/Jane|@Jane]]]';
        const result = service.parseTaskAssignments(input, DEFAULT_ROLES);
        expect(result).toEqual([
            { role: DEFAULT_ROLES[0], assignees: ['@John'] },
            { role: DEFAULT_ROLES[1], assignees: ['@Jane'] }
        ]);
    });

    it('formatAssignments sorts by role order', () => {
        const service = createService();
        const assignments = [
            { roleId: 'approvers', assignees: ['@Jane'] },
            { roleId: 'drivers', assignees: ['@John'] }
        ];
        const output = service.formatAssignments(assignments, DEFAULT_ROLES);
        expect(output).toBe(
            '[🚗:: [[Contacts/John|@John]]] [👍:: [[Contacts/Jane|@Jane]]]'
        );
    });

    it('escapeRegex escapes special characters', () => {
        const service = createService();
        const escaped = service.escapeRegex('.*+?^${}()|[]\\');
        const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
        expect(escaped).toBe(expected);
    });

    it('applyAssignmentsToLine removes existing assignments with nested brackets', () => {
        const service = createService();
        const line = '- [ ] Task [🚗:: [[3-Resources/People/Luke|@Luke]], [[3-Resources/People/Mum|@Mum]]] 📅 2024-01-01';
        const assignments = [{ roleId: 'approvers', assignees: ['@Manager'] }];
        const result = service.applyAssignmentsToLine(line, assignments, DEFAULT_ROLES);
        expect(result).toBe(
            '- [ ] Task [👍:: [[Contacts/Manager|@Manager]]] 📅 2024-01-01'
        );
    });
});
