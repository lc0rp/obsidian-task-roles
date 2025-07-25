import { describe, it, expect } from 'vitest';
import { DEFAULT_ROLES } from '../src/types/index';

describe('Assign Role Shortcut Conflict Detection', () => {
    function isShortcutInUse(shortcut: string, excludeRoleId?: string): boolean {
        if (!shortcut) return false;
        return DEFAULT_ROLES.some(role => 
            role.shortcut === shortcut && role.id !== excludeRoleId
        );
    }

    describe('Conflict Detection Logic', () => {
        it('should detect conflict between Assign and Approvers shortcuts', () => {
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            const approversRole = DEFAULT_ROLES.find(role => role.id === 'approvers');
            
            expect(assignRole?.shortcut).toBe('a');
            expect(approversRole?.shortcut).toBe('a');
            
            // Test conflict detection function
            expect(isShortcutInUse('a')).toBe(true);
        });

        it('should allow role to keep its own shortcut when editing', () => {
            // When editing the Assign role, it should be allowed to keep its 'a' shortcut
            expect(isShortcutInUse('a', 'assign')).toBe(true); // Still conflicts with Approvers
            
            // When editing the Approvers role, it should be allowed to keep its 'a' shortcut  
            expect(isShortcutInUse('a', 'approvers')).toBe(true); // Still conflicts with Assign
        });

        it('should find multiple conflicts for shortcut "a"', () => {
            const conflictingRoles = DEFAULT_ROLES.filter(role => role.shortcut === 'a');
            expect(conflictingRoles).toHaveLength(2);
            expect(conflictingRoles.map(r => r.id)).toContain('assign');
            expect(conflictingRoles.map(r => r.id)).toContain('approvers');
        });

        it('should not have conflicts for other DACI shortcuts', () => {
            // Other shortcuts should remain unique
            expect(isShortcutInUse('d')).toBe(true); // drivers only
            expect(isShortcutInUse('c')).toBe(true); // contributors only
            expect(isShortcutInUse('i')).toBe(true); // informed only
            
            // Check no double conflicts exist for other shortcuts
            const driverRoles = DEFAULT_ROLES.filter(role => role.shortcut === 'd');
            const contributorRoles = DEFAULT_ROLES.filter(role => role.shortcut === 'c');
            const informedRoles = DEFAULT_ROLES.filter(role => role.shortcut === 'i');
            
            expect(driverRoles).toHaveLength(1);
            expect(contributorRoles).toHaveLength(1);
            expect(informedRoles).toHaveLength(1);
        });

        it('should detect unused shortcuts correctly', () => {
            expect(isShortcutInUse('x')).toBe(false);
            expect(isShortcutInUse('z')).toBe(false);
            expect(isShortcutInUse('')).toBe(false);
            expect(isShortcutInUse(' ')).toBe(false);
        });
    });

    describe('Conflict Resolution Requirements', () => {
        it('should require user to resolve conflict when both Assign and Approvers are enabled', () => {
            // This test verifies the requirement that users must resolve the conflict
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            const approversRole = DEFAULT_ROLES.find(role => role.id === 'approvers');
            
            // If both roles exist and both have shortcut 'a', there's a conflict
            const hasConflict = assignRole && approversRole && 
                               assignRole.shortcut === 'a' && 
                               approversRole.shortcut === 'a';
            
            expect(hasConflict).toBe(true);
        });

        it('should validate that Assign role is disabled by default to avoid immediate conflict', () => {
            const assignRole = DEFAULT_ROLES.find(role => role.id === 'assign');
            const approversRole = DEFAULT_ROLES.find(role => role.id === 'approvers');
            
            // Assign should be disabled by default (isDefault: false)
            // Approvers should be enabled by default (isDefault: true)
            expect(assignRole?.isDefault).toBe(false);
            expect(approversRole?.isDefault).toBe(true);
            
            // This means the conflict only becomes active when user enables Assign role
        });
    });
});