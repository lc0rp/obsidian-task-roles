import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "obsidian";
import { TaskRolesSettingTab } from "../src/settings/task-roles-settings-tab";
import { DEFAULT_SETTINGS } from "../src/types";

describe("Settings Layout: Assignees and Custom Roles", () => {
  let mockPlugin: any;
  let containerEl: any;
  let allDivs: any[];

  const makeAnchor = () => ({ setAttribute: vi.fn() });

  const makeDiv = (cls?: string) => {
    const obj: any = {
      __cls: cls,
      createEl: vi.fn().mockImplementation((tag: string, opts?: any) => {
        if (tag === "a") return makeAnchor();
        if (tag === "button") {
          // Return a clickable object; our UI assigns onclick
          return { onclick: undefined, addClass: vi.fn(), style: {} } as any;
        }
        return {};
      }),
      createDiv: vi.fn().mockImplementation((divCls?: string) => {
        const child = makeDiv(divCls);
        allDivs.push(child);
        return child;
      }),
    };
    return obj;
  };

  beforeEach(() => {
    allDivs = [];
    const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    mockPlugin = {
      app: new App(),
      settings,
      saveSettings: vi.fn().mockResolvedValue(undefined),
      loadSettings: vi.fn().mockResolvedValue(undefined),
      taskRolesService: {
        mePersonExists: vi.fn().mockResolvedValue(false),
        createMePerson: vi.fn(),
      },
    };

    containerEl = makeDiv();
    containerEl.empty = vi.fn().mockImplementation(() => {
      allDivs.length = 0;
    });
    // Root createDiv should push created sections
    const originalCreateDiv = containerEl.createDiv;
    containerEl.createDiv = vi.fn().mockImplementation((cls?: string) => {
      const d = originalCreateDiv(cls);
      allDivs.push(d);
      return d;
    });
  });

  it("renders Assignees section with tabs and toggles content", () => {
    const tab = new TaskRolesSettingTab(new App(), mockPlugin);
    // Inject mocked container
    // @ts-ignore
    tab.containerEl = containerEl;
    tab.display();

    // Find an h4 with text 'Assignees'
    const hasAssigneesHeading = allDivs.some((div) =>
      (div.createEl.mock.calls as any[]).some(
        (c) => c[0] === "h4" && c[1]?.text === "Assignees"
      )
    );
    expect(hasAssigneesHeading).toBe(true);

    // The description paragraph should mention assigning tasks to people or companies
    const hasAssigneesDescription = allDivs.some((div) =>
      (div.createEl.mock.calls as any[]).some(
        (c) => c[0] === "p" && typeof c[1]?.text === "string" && c[1].text.includes("assign tasks to people or companies")
      )
    );
    expect(hasAssigneesDescription).toBe(true);

    // There should be a header with two labels (buttons): Person settings and Company settings
    const headers = allDivs.filter((d) => d.__cls === "default-roles-tabs-header");
    const header = headers.find((h) => {
      const texts = (h.createEl.mock.calls as any[])
        .filter((c) => c[0] === "button")
        .map((c) => c[1]?.text);
      return texts.includes("Person settings") && texts.includes("Company settings");
    });
    expect(!!header).toBe(true);

    // By default, only the Person panel should be visible
    const hasPersonPanel = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Person")
    );
    const hasCompanyPanel = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Company")
    );
    expect(hasPersonPanel).toBe(true);
    expect(hasCompanyPanel).toBe(false);

    // Click the Company settings tab and verify content toggles
    const pairs = (header!.createEl.mock.calls as any[]).map((args: any[], i: number) => ({ args, value: header!.createEl.mock.results[i]?.value }));
    const companyBtn = pairs.find((p) => p.args[0] === "button" && p.args[1]?.text === "Company settings")!.value;
    expect(companyBtn).toBeTruthy();
    companyBtn.onclick && companyBtn.onclick();

    // After re-render, only the Company panel should be visible
    const hasPersonAfter = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Person")
    );
    const hasCompanyAfter = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Company")
    );
    expect(hasPersonAfter).toBe(false);
    expect(hasCompanyAfter).toBe(true);
  });

  it("renders Custom Roles section with tabs and toggles content", () => {
    const tab = new TaskRolesSettingTab(new App(), mockPlugin);
    // @ts-ignore
    tab.containerEl = containerEl;
    tab.display();

    // Heading and description
    const hasCustomDescription = allDivs.some((div) =>
      (div.createEl.mock.calls as any[]).some(
        (c) => c[0] === "p" && typeof c[1]?.text === "string" && c[1].text.includes("create custom roles")
      )
    );
    expect(hasCustomDescription).toBe(true);

    // Header labels: Custom roles and Add new role
    const headers = allDivs.filter((d) => d.__cls === "default-roles-tabs-header");
    const header = headers.find((h) => {
      const texts = (h.createEl.mock.calls as any[])
        .filter((c) => c[0] === "button")
        .map((c) => c[1]?.text);
      return texts.includes("Custom roles") && texts.includes("Add new role");
    });
    expect(!!header).toBe(true);

    // Default shows Custom Roles list panel only
    const showsList = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Custom Roles")
    );
    const showsAdd = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Add New Role")
    );
    expect(showsList).toBe(true);
    expect(showsAdd).toBe(false);

    // Click "Add new role" tab and verify content toggles
    const pairs = (header!.createEl.mock.calls as any[]).map((args: any[], i: number) => ({ args, value: header!.createEl.mock.results[i]?.value }));
    const addBtn = pairs.find((p) => p.args[0] === "button" && p.args[1]?.text === "Add new role")!.value;
    expect(addBtn).toBeTruthy();
    addBtn.onclick && addBtn.onclick();

    const showsListAfter = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Custom Roles")
    );
    const showsAddAfter = allDivs.some(
      (div) =>
        div.__cls === "default-roles-tab-details" &&
        (div.createEl.mock.calls as any[]).some((c) => c[0] === "h4" && c[1]?.text === "Add New Role")
    );
    expect(showsListAfter).toBe(false);
    expect(showsAddAfter).toBe(true);
  });
});
