import { describe, it, expect } from 'vitest';
import { DEFAULT_ROLES } from '../src/types/index';

describe('Assign Role Feature', () => {
    describe('Role Definition', () => {
        it('should include Assign role in DEFAULT_ROLES', () => {
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            expect(assignRole).toBeDefined();
            expect(assignRole?.name).toBe('Assign');
            expect(assignRole?.icon).toBe('👤');
            expect(assignRole?.shortcut).toBe('a');
            expect(assignRole?.isDefault).toBe(false); // Should be disabled by default
            expect(assignRole?.order).toBe(0); // Should be first
        });

        it('should have Assign role as first in role order', () => {
            const sortedRoles = [...DEFAULT_ROLES].sort((a, b) => a.order - b.order);
            expect(sortedRoles[0].id).toBe('assign');
            expect(sortedRoles[0].order).toBe(0);
        });

        it('should have shortcut conflict with Approvers role', () => {
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            const approversRole = DEFAULT_ROLES.find(role => role.id === 'approvers');
            
            expect(assignRole?.shortcut).toBe('a');
            expect(approversRole?.shortcut).toBe('a');
            // Both should have the same shortcut to test conflict detection
        });
    });

    describe('Role Array Structure', () => {
        it('should have correct total number of roles including Assign', () => {
            expect(DEFAULT_ROLES).toHaveLength(5); // Original 4 DACI + 1 Assign
        });

        it('should maintain DACI roles after adding Assign', () => {
            const daciRoleIds = ['drivers', 'approvers', 'contributors', 'informed'];
            daciRoleIds.forEach(id => {
                const role = DEFAULT_ROLES.find(role => role.id === id);
                expect(role).toBeDefined();
                expect(role?.isDefault).toBe(true);
            });
        });

        it('should have Assign as the only non-default role', () => {
            const nonDefaultRoles = DEFAULT_ROLES.filter(role => !role.isDefault);
            expect(nonDefaultRoles).toHaveLength(1);
            expect(nonDefaultRoles[0].id).toBe('assign');
        });
    });

    describe('Role Integration', () => {
        it('should properly sort all roles including Assign by order', () => {
            const sortedRoles = [...DEFAULT_ROLES].sort((a, b) => a.order - b.order);
            const expectedOrder = ['assign', 'drivers', 'approvers', 'contributors', 'informed'];
            const actualOrder = sortedRoles.map(role => role.id);
            expect(actualOrder).toEqual(expectedOrder);
        });

        it('should have unique IDs for all roles', () => {
            const roleIds = DEFAULT_ROLES.map(role => role.id);
            const uniqueIds = [...new Set(roleIds)];
            expect(roleIds).toHaveLength(uniqueIds.length);
        });

        it('should have all required properties for Assign role', () => {
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            expect(assignRole).toHaveProperty('id');
            expect(assignRole).toHaveProperty('name');
            expect(assignRole).toHaveProperty('icon');
            expect(assignRole).toHaveProperty('shortcut');
            expect(assignRole).toHaveProperty('isDefault');
            expect(assignRole).toHaveProperty('order');
        });
    });
});