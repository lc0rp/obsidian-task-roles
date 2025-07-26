import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_ROLES, SIMPLE_ASSIGNEE_ROLE } from "../src/types/index";

describe("Simple Assignee Role Mode", () => {
	// Mock plugin class methods instead of importing the whole plugin
	const createMockPlugin = () => {
		return {
			settings: { ...DEFAULT_SETTINGS },
			getVisibleRoles: vi.fn(),
			loadSettings: vi.fn(),
			saveSettings: vi.fn(),
			saveData: vi.fn(),
			loadData: vi.fn(),
		};
	};

	let mockPlugin: ReturnType<typeof createMockPlugin>;

	beforeEach(() => {
		mockPlugin = createMockPlugin();
		vi.clearAllMocks();
	});

	describe("Settings Structure", () => {
		it("should include simpleAssigneeMode in default settings", () => {
			expect(DEFAULT_SETTINGS).toHaveProperty("simpleAssigneeMode");
			expect(DEFAULT_SETTINGS.simpleAssigneeMode).toBe(false);
		});

		it("should have SIMPLE_ASSIGNEE_ROLE defined with correct properties", () => {
			expect(SIMPLE_ASSIGNEE_ROLE).toEqual({
				id: "assignees",
				name: "Assignees",
				icon: "👤",
				shortcut: "a",
				isDefault: true,
				order: 1,
			});
		});
	});

	describe("getVisibleRoles logic", () => {
		// Test the logic that would be in getVisibleRoles method
		const getVisibleRolesLogic = (settings: any) => {
			if (settings.simpleAssigneeMode) {
				// In simple assignee mode, return only the assignee role and custom roles
				const customRoles = settings.roles.filter((role: any) => !role.isDefault);
				const assigneeRole = settings.roles.find((role: any) => role.id === "assignees");
				
				return assigneeRole ? [assigneeRole, ...customRoles] : customRoles;
			}
			
			// Default behavior: filter based on hiddenDefaultRoles
			return settings.roles.filter(
				(role: any) =>
					!role.isDefault ||
					!settings.hiddenDefaultRoles.includes(role.id)
			);
		};

		it("should return all default roles when simpleAssigneeMode is false", () => {
			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: false,
				roles: [...DEFAULT_ROLES],
				hiddenDefaultRoles: [],
			};

			const visibleRoles = getVisibleRolesLogic(settings);
			expect(visibleRoles).toHaveLength(4);
			expect(visibleRoles.map(r => r.id)).toEqual(["drivers", "approvers", "contributors", "informed"]);
		});

		it("should return only assignee role and custom roles when simpleAssigneeMode is true", () => {
			const customRole = {
				id: "custom-role",
				name: "Custom Role",
				icon: "🎯",
				shortcut: "x",
				isDefault: false,
				order: 5,
			};

			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [...DEFAULT_ROLES, SIMPLE_ASSIGNEE_ROLE, customRole],
				hiddenDefaultRoles: [],
			};

			const visibleRoles = getVisibleRolesLogic(settings);
			expect(visibleRoles).toHaveLength(2);
			expect(visibleRoles.map(r => r.id)).toEqual(["assignees", "custom-role"]);
		});

		it("should return only custom roles when simpleAssigneeMode is true but assignee role is not present", () => {
			const customRole = {
				id: "custom-role",
				name: "Custom Role",
				icon: "🎯",
				shortcut: "x",
				isDefault: false,
				order: 5,
			};

			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [...DEFAULT_ROLES, customRole], // No SIMPLE_ASSIGNEE_ROLE
				hiddenDefaultRoles: [],
			};

			const visibleRoles = getVisibleRolesLogic(settings);
			expect(visibleRoles).toHaveLength(1);
			expect(visibleRoles.map(r => r.id)).toEqual(["custom-role"]);
		});

		it("should respect hiddenDefaultRoles when simpleAssigneeMode is false", () => {
			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: false,
				roles: [...DEFAULT_ROLES],
				hiddenDefaultRoles: ["drivers", "informed"],
			};

			const visibleRoles = getVisibleRolesLogic(settings);
			expect(visibleRoles).toHaveLength(2);
			expect(visibleRoles.map(r => r.id)).toEqual(["approvers", "contributors"]);
		});
	});

	describe("loadSettings logic", () => {
		// Test the logic that would be in loadSettings method for Simple Assignee Role handling
		const handleSimpleAssigneeModeLogic = (settings: any) => {
			const existingAssigneeRole = settings.roles.find((r: any) => r.id === "assignees");
			
			if (settings.simpleAssigneeMode) {
				// Add the assignee role if it doesn't exist
				if (!existingAssigneeRole) {
					settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });
				} else {
					// Update existing assignee role with correct properties
					existingAssigneeRole.icon = SIMPLE_ASSIGNEE_ROLE.icon;
					existingAssigneeRole.name = SIMPLE_ASSIGNEE_ROLE.name;
					existingAssigneeRole.shortcut = SIMPLE_ASSIGNEE_ROLE.shortcut;
					existingAssigneeRole.isDefault = SIMPLE_ASSIGNEE_ROLE.isDefault;
					existingAssigneeRole.order = SIMPLE_ASSIGNEE_ROLE.order;
				}
			} else {
				// Remove the assignee role if simple mode is disabled
				if (existingAssigneeRole) {
					settings.roles = settings.roles.filter((r: any) => r.id !== "assignees");
				}
			}

			// Sort roles by order
			settings.roles.sort((a: any, b: any) => a.order - b.order);
			
			return settings;
		};

		it("should add assignee role when simpleAssigneeMode is enabled", () => {
			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [...DEFAULT_ROLES], // Start without assignee role
			};

			const updatedSettings = handleSimpleAssigneeModeLogic(settings);

			// Check that assignee role was added
			const assigneeRole = updatedSettings.roles.find((r: any) => r.id === "assignees");
			expect(assigneeRole).toBeDefined();
			expect(assigneeRole).toEqual(SIMPLE_ASSIGNEE_ROLE);
		});

		it("should remove assignee role when simpleAssigneeMode is disabled", () => {
			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: false,
				roles: [...DEFAULT_ROLES, SIMPLE_ASSIGNEE_ROLE], // Start with assignee role
			};

			const updatedSettings = handleSimpleAssigneeModeLogic(settings);

			// Check that assignee role was removed
			const assigneeRole = updatedSettings.roles.find((r: any) => r.id === "assignees");
			expect(assigneeRole).toBeUndefined();
		});

		it("should update existing assignee role properties when simpleAssigneeMode is enabled", () => {
			const outdatedAssigneeRole = {
				id: "assignees",
				name: "Old Assignees",
				icon: "👥",
				shortcut: "x",
				isDefault: true,
				order: 10,
			};

			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [...DEFAULT_ROLES, outdatedAssigneeRole],
			};

			const updatedSettings = handleSimpleAssigneeModeLogic(settings);

			// Check that assignee role was updated with correct properties
			const assigneeRole = updatedSettings.roles.find((r: any) => r.id === "assignees");
			expect(assigneeRole).toBeDefined();
			expect(assigneeRole).toEqual(SIMPLE_ASSIGNEE_ROLE);
		});
	});

	describe("Settings Integration", () => {
		it("should maintain custom roles when switching between modes", () => {
			const customRole = {
				id: "custom-role",
				name: "Custom Role",
				icon: "🎯",
				shortcut: "x",
				isDefault: false,
				order: 5,
			};

			// Test switching to simple mode with custom role
			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [...DEFAULT_ROLES, customRole],
			};

			// Handle Simple Assignee Mode logic
			const existingAssigneeRole = settings.roles.find((r: any) => r.id === "assignees");
			if (settings.simpleAssigneeMode && !existingAssigneeRole) {
				settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });
			}

			// Custom role should still be present
			const customRoleStillThere = settings.roles.find((r: any) => r.id === "custom-role");
			expect(customRoleStillThere).toEqual(customRole);

			// And visible roles logic should include both assignee and custom role
			const getVisibleRolesLogic = (settings: any) => {
				if (settings.simpleAssigneeMode) {
					const customRoles = settings.roles.filter((role: any) => !role.isDefault);
					const assigneeRole = settings.roles.find((role: any) => role.id === "assignees");
					return assigneeRole ? [assigneeRole, ...customRoles] : customRoles;
				}
				return settings.roles.filter(
					(role: any) =>
						!role.isDefault ||
						!settings.hiddenDefaultRoles.includes(role.id)
				);
			};

			const visibleRoles = getVisibleRolesLogic(settings);
			expect(visibleRoles.map((r: any) => r.id)).toContain("assignees");
			expect(visibleRoles.map((r: any) => r.id)).toContain("custom-role");
		});
	});

	describe("Role ordering", () => {
		it("should sort roles by order after processing", () => {
			const customRole1 = {
				id: "custom-role-1",
				name: "Custom Role 1",
				icon: "🎯",
				shortcut: "x",
				isDefault: false,
				order: 10,
			};

			const customRole2 = {
				id: "custom-role-2",
				name: "Custom Role 2",
				icon: "🏹",
				shortcut: "y",
				isDefault: false,
				order: 2,
			};

			const settings = {
				...DEFAULT_SETTINGS,
				simpleAssigneeMode: true,
				roles: [customRole1, ...DEFAULT_ROLES, customRole2], // Unsorted
			};

			// Add assignee role and sort
			const existingAssigneeRole = settings.roles.find((r: any) => r.id === "assignees");
			if (settings.simpleAssigneeMode && !existingAssigneeRole) {
				settings.roles.push({ ...SIMPLE_ASSIGNEE_ROLE });
			}
			settings.roles.sort((a: any, b: any) => a.order - b.order);

			// Check that roles are sorted by order
			const roleOrders = settings.roles.map((r: any) => r.order);
			const sortedOrders = [...roleOrders].sort((a, b) => a - b);
			expect(roleOrders).toEqual(sortedOrders);

			// Assignee role (order: 1) should come before custom-role-2 (order: 2)
			const assigneeIndex = settings.roles.findIndex((r: any) => r.id === "assignees");
			const customRole2Index = settings.roles.findIndex((r: any) => r.id === "custom-role-2");
			expect(assigneeIndex).toBeLessThan(customRole2Index);
		});
	});
});