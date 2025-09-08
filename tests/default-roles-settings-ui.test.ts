import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "obsidian";
import {
	DEFAULT_SETTINGS,
	DEFAULT_ROLES,
	type TaskRolesPluginSettings,
	type Role,
} from "../src/types";
import { TaskRolesSettingTab } from "../src/settings/task-roles-settings-tab";
import {
	getPreferredNameOptions,
	getShortcutOptions,
	isIconUnique,
} from "../src/utils/role-settings-utils";

describe("Default Roles Settings UI", () => {
	let mockPlugin: any;
	let settings: TaskRolesPluginSettings;

	beforeEach(() => {
		settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
		mockPlugin = {
			app: new App(),
			settings,
			saveSettings: vi.fn().mockResolvedValue(undefined),
			loadSettings: vi.fn().mockResolvedValue(undefined),
			taskRolesService: {
				mePersonExists: vi.fn().mockResolvedValue(false),
				createMePerson: vi.fn(),
				refreshAssigneeCache: vi.fn(),
			},
		};
	});

	it("renders the Default roles description", () => {
		const makeAnchor = () => ({ setAttribute: vi.fn() });
		const makeDiv = () => {
			const obj: any = {
				createEl: vi
					.fn()
					.mockImplementation((tag: string) =>
						tag === "a" ? makeAnchor() : {}
					),
				createDiv: vi.fn().mockImplementation(() => obj),
			};
			return obj;
		};
		const sectionObj = makeDiv();
		const containerEl: any = {
			empty: vi.fn(),
			createEl: vi
				.fn()
				.mockImplementation((tag: string) =>
					tag === "a" ? makeAnchor() : {}
				),
			createDiv: vi.fn().mockImplementation(() => sectionObj),
		};

		const tab = new TaskRolesSettingTab(new App(), mockPlugin);
		// Inject our container
		// @ts-ignore
		tab.containerEl = containerEl;
		tab.display();

		const descTextFragment = "default roles are provided to get you started";

		// Expect the description paragraph to be created somewhere
		const calls = sectionObj.createEl.mock.calls as any[];
		const hasDescription = calls.some(
			(c) => c[0] === "p" && typeof c[1]?.text === "string" && c[1].text.includes(descTextFragment)
		);
		expect(hasDescription).toBe(true);
	});

	it("resetDefaultRoles resets names, icons, shortcuts and visibility", async () => {
		// Mutate some defaults
		const owner = settings.roles.find((r) => r.id === "owner") as Role;
		// Change primary name and other properties
		owner.names = ["driver", ...owner.names.filter((n) => n !== "driver")];
		owner.icon = "🎯";
		owner.shortcuts = [
			"d",
			...(owner.shortcuts ?? []).filter((s) => s !== "d"),
		];
		settings.hiddenDefaultRoles = ["owner", "informed"];

		const tab = new TaskRolesSettingTab(new App(), mockPlugin);
		await tab.resetDefaultRoles();

		// Defaults restored
		const defaultsById = Object.fromEntries(
			DEFAULT_ROLES.map((r) => [r.id, r])
		);
		for (const def of DEFAULT_ROLES) {
			const stored = settings.roles.find((r) => r.id === def.id)!;
			expect(stored).toEqual(defaultsById[def.id]);
		}
		expect(settings.hiddenDefaultRoles).toEqual([]);
		expect(mockPlugin.saveSettings).toHaveBeenCalled();
	});

	it("getPreferredNameOptions returns unique name + aliases", () => {
		const owner = DEFAULT_ROLES.find((r) => r.id === "owner") as Role;
		const opts = getPreferredNameOptions(owner);
		expect(opts[0]).toBe(owner.names[0]);
		// Should include aliases like "driver"
		expect(opts).toContain("driver");
	});

	it("getShortcutOptions returns unique shortcut + aliases", () => {
		const owner = DEFAULT_ROLES.find((r) => r.id === "owner") as Role;
		const opts = getShortcutOptions(owner);
		expect(opts[0]).toBe(owner.shortcuts[0]);
		expect(opts).toContain("d");
	});

	it("isIconUnique validates against enabled roles only", () => {
		const s = JSON.parse(
			JSON.stringify(DEFAULT_SETTINGS)
		) as TaskRolesPluginSettings;
		// Duplicate icon with another enabled default role
		const owner = s.roles.find((r) => r.id === "owner")!;
		const approver = s.roles.find((r) => r.id === "approver")!;
		approver.icon = owner.icon;

		// Duplicate should not be unique
		expect(isIconUnique(owner.icon, s, owner.id)).toBe(false);

		// If approver hidden, it should be allowed
		s.hiddenDefaultRoles = ["approver"];
		expect(isIconUnique(owner.icon, s, owner.id)).toBe(true);

		// Custom roles are always considered enabled
		s.roles.push({
			id: "custom-1",
			names: ["reviewer"],
			description: "A custom role",
			icon: owner.icon,
			shortcuts: [],
			order: 99,
		} as unknown as Role);
		expect(isIconUnique(owner.icon, s, owner.id)).toBe(false);
	});
});
