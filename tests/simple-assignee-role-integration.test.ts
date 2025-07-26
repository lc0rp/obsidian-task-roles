import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_ROLES, SIMPLE_ASSIGNEE_ROLE } from "../src/types/index";

describe("Simple Assignee Role Integration", () => {
	describe("Dynamic role visibility", () => {
		it("should dynamically return correct roles when simpleAssigneeMode changes", () => {
			// Simulate the plugin state
			const mockPlugin = {
				settings: { ...DEFAULT_SETTINGS, roles: [...DEFAULT_ROLES] },
				getVisibleRoles: function() {
					if (this.settings.simpleAssigneeMode) {
						const customRoles = this.settings.roles.filter((role: any) => !role.isDefault);
						const assigneeRole = this.settings.roles.find((role: any) => role.id === "assignees");
						return assigneeRole ? [assigneeRole, ...customRoles] : customRoles;
					}
					return this.settings.roles.filter(
						(role: any) =>
							!role.isDefault ||
							!this.settings.hiddenDefaultRoles.includes(role.id)
					);
				}
			};

			// Initially in advanced mode - should return all 4 default roles
			expect(mockPlugin.getVisibleRoles()).toHaveLength(4);
			expect(mockPlugin.getVisibleRoles().map((r: any) => r.id)).toEqual([
				"drivers", "approvers", "contributors", "informed"
			]);

			// Toggle to simple mode
			mockPlugin.settings.simpleAssigneeMode = true;
			mockPlugin.settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });

			// Should now return only the assignee role
			const visibleRoles = mockPlugin.getVisibleRoles();
			expect(visibleRoles).toHaveLength(1);
			expect(visibleRoles[0].id).toBe("assignees");

			// Toggle back to advanced mode
			mockPlugin.settings.simpleAssigneeMode = false;
			mockPlugin.settings.roles = mockPlugin.settings.roles.filter((r: any) => r.id !== "assignees");

			// Should return all 4 default roles again
			expect(mockPlugin.getVisibleRoles()).toHaveLength(4);
			expect(mockPlugin.getVisibleRoles().map((r: any) => r.id)).toEqual([
				"drivers", "approvers", "contributors", "informed"
			]);
		});

		it("should work correctly with shortcuts trigger pattern", () => {
			// Simulate how the shortcuts trigger would use getVisibleRoles
			const mockPlugin = {
				settings: { ...DEFAULT_SETTINGS, roles: [...DEFAULT_ROLES] },
				getVisibleRoles: function() {
					if (this.settings.simpleAssigneeMode) {
						const customRoles = this.settings.roles.filter((role: any) => !role.isDefault);
						const assigneeRole = this.settings.roles.find((role: any) => role.id === "assignees");
						return assigneeRole ? [assigneeRole, ...customRoles] : customRoles;
					}
					return this.settings.roles.filter(
						(role: any) =>
							!role.isDefault ||
							!this.settings.hiddenDefaultRoles.includes(role.id)
					);
				}
			};

			// Create a function closure like shortcuts trigger would
			const getVisibleRoles = () => mockPlugin.getVisibleRoles();

			// Simulate isRoleShortcutKey logic
			const isRoleShortcutKey = (key: string, visibleRoles: any[]) => {
				const lowerKey = key.toLowerCase();
				return visibleRoles.some((role) => role.shortcut === lowerKey);
			};

			// In advanced mode, 'd' shortcut should work
			let visibleRoles = getVisibleRoles();
			expect(isRoleShortcutKey('d', visibleRoles)).toBe(true);
			expect(isRoleShortcutKey('a', visibleRoles)).toBe(true);

			// Switch to simple mode
			mockPlugin.settings.simpleAssigneeMode = true;
			mockPlugin.settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });

			// Now only 'a' shortcut should work (assignees role)
			visibleRoles = getVisibleRoles();
			expect(isRoleShortcutKey('d', visibleRoles)).toBe(false); // drivers not visible
			expect(isRoleShortcutKey('a', visibleRoles)).toBe(true);  // assignees visible

			// Find the role for 'a' shortcut
			const aRole = visibleRoles.find((r: any) => r.shortcut === 'a');
			expect(aRole?.id).toBe('assignees');
			expect(aRole?.name).toBe('Assignees');
			expect(aRole?.icon).toBe('👤');
		});

		it("should work correctly with role suggestion dropdown pattern", () => {
			// Simulate how the dropdown would use getVisibleRoles
			const mockPlugin = {
				settings: { ...DEFAULT_SETTINGS, roles: [...DEFAULT_ROLES] },
				getVisibleRoles: function() {
					if (this.settings.simpleAssigneeMode) {
						const customRoles = this.settings.roles.filter((role: any) => !role.isDefault);
						const assigneeRole = this.settings.roles.find((role: any) => role.id === "assignees");
						return assigneeRole ? [assigneeRole, ...customRoles] : customRoles;
					}
					return this.settings.roles.filter(
						(role: any) =>
							!role.isDefault ||
							!this.settings.hiddenDefaultRoles.includes(role.id)
					);
				}
			};

			// Create a function closure like dropdown would
			const getVisibleRoles = () => mockPlugin.getVisibleRoles();

			// Simulate getAvailableRoles logic
			const getAvailableRoles = (existingRoles: string[]) => {
				return getVisibleRoles().filter((role: any) => {
					if (existingRoles.includes(role.id)) {
						return false;
					}
					return true;
				});
			};

			// In advanced mode, should have all 4 roles available
			let availableRoles = getAvailableRoles([]);
			expect(availableRoles).toHaveLength(4);

			// Switch to simple mode
			mockPlugin.settings.simpleAssigneeMode = true;
			mockPlugin.settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });

			// Should now have only assignees role available
			availableRoles = getAvailableRoles([]);
			expect(availableRoles).toHaveLength(1);
			expect(availableRoles[0].id).toBe('assignees');

			// If assignees role is already used, should have no available roles
			availableRoles = getAvailableRoles(['assignees']);
			expect(availableRoles).toHaveLength(0);
		});
	});
});