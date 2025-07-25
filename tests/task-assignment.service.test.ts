import { describe, it, expect } from 'vitest';
import { TaskRolesService } from '../src/services/task-roles.service';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '../src/types/index';

const appStub = { vault: {}, workspace: {} };

function createService() {
    return new TaskRolesService(appStub, DEFAULT_SETTINGS);
}

describe('TaskRolesService', () => {
    it('parseRoleAssignments returns single role', () => {
        const service = createService();
        const input = '[🚗:: [[People/John|@John]]]';
        const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
        const driversRole = DEFAULT_ROLES.find(role => role.id === 'drivers');
        expect(result).toEqual([
            { role: driversRole, assignees: ['@John'] }
        ]);
    });

    it('applyRoleAssignmentsToLine inserts assigned roles before metadata', () => {
        const service = createService();
        const line = '- [ ] Test task 🔴 📅 2024-01-01';
        const roleAssignments = [{ roleId: 'drivers', assignees: ['@John'] }];
        const result = service.applyRoleAssignmentsToLine(line, roleAssignments, DEFAULT_ROLES);
        expect(result).toBe(
            '- [ ] Test task [🚗:: [[People/John|@John]]] 🔴 📅 2024-01-01'
        );
    });

    it('parseRoleAssignments handles multiple roles', () => {
        const service = createService();
        const input = '[🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]';
        const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
        const driversRole = DEFAULT_ROLES.find(role => role.id === 'drivers');
        const approversRole = DEFAULT_ROLES.find(role => role.id === 'approvers');
        expect(result).toEqual([
            { role: driversRole, assignees: ['@John'] },
            { role: approversRole, assignees: ['@Jane'] }
        ]);
    });

    it('formatRoleAssignments sorts by role order', () => {
        const service = createService();
        const roleAssignments = [
            { roleId: 'approvers', assignees: ['@Jane'] },
            { roleId: 'drivers', assignees: ['@John'] }
        ];
        const output = service.formatRoleAssignments(roleAssignments, DEFAULT_ROLES);
        expect(output).toBe(
            '[🚗:: [[People/John|@John]]] [👍:: [[People/Jane|@Jane]]]'
        );
    });

    it('escapeRegex escapes special characters', () => {
        const service = createService();
        const escaped = service.escapeRegex('.*+?^${}()|[]\\');
        const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
        expect(escaped).toBe(expected);
    });

    it('applyRoleAssignmentsToLine removes existing assigned roles with nested brackets', () => {
        const service = createService();
        const line = '- [ ] Task [🚗:: [[3-Resources/People/Luke|@Luke]], [[3-Resources/People/Mum|@Mum]]] 📅 2024-01-01';
        const roleAssignments = [{ roleId: 'approvers', assignees: ['@Manager'] }];
        const result = service.applyRoleAssignmentsToLine(line, roleAssignments, DEFAULT_ROLES);
        expect(result).toBe(
            '- [ ] Task [👍:: [[People/Manager|@Manager]]] 📅 2024-01-01'
        );
    });

    describe('Assign Role Integration', () => {
        it('parseRoleAssignments should handle Assign role with 👤 icon', () => {
            const service = createService();
            const input = '[👤:: [[People/John|@John]]]';
            const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            expect(result).toEqual([
                { role: assignRole, assignees: ['@John'] }
            ]);
        });

        it('applyRoleAssignmentsToLine should insert Assign role assignments', () => {
            const service = createService();
            const line = '- [ ] Test task 🔴 📅 2024-01-01';
            const roleAssignments = [{ roleId: 'assign', assignees: ['@John'] }];
            const result = service.applyRoleAssignmentsToLine(line, roleAssignments, DEFAULT_ROLES);
            expect(result).toBe(
                '- [ ] Test task [👤:: [[People/John|@John]]] 🔴 📅 2024-01-01'
            );
        });

        it('formatRoleAssignments should place Assign role first due to order', () => {
            const service = createService();
            const roleAssignments = [
                { roleId: 'drivers', assignees: ['@Driver'] },
                { roleId: 'assign', assignees: ['@Assignee'] }
            ];
            const output = service.formatRoleAssignments(roleAssignments, DEFAULT_ROLES);
            expect(output).toBe(
                '[👤:: [[People/Assignee|@Assignee]]] [🚗:: [[People/Driver|@Driver]]]'
            );
        });

        it('parseRoleAssignments should handle Assign role with multiple assignees', () => {
            const service = createService();
            const input = '[👤:: [[People/John|@John]], [[People/Jane|@Jane]]]';
            const result = service.parseRoleAssignments(input, DEFAULT_ROLES);
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            expect(result).toEqual([
                { role: assignRole, assignees: ['@John', '@Jane'] }
            ]);
        });
    });
});
