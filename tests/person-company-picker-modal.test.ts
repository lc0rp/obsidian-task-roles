import { describe, it, expect, vi } from "vitest";
import { App } from "obsidian";
import { PersonCompanyPickerModal } from "../src/modals/person-company-picker-modal";
import { DEFAULT_SETTINGS } from "../src/types/index";

function createPlugin() {
	const app = new App();
	const service = {
		getPeopleAndCompanies: vi.fn().mockImplementation(async (symbol) => {
			return symbol === DEFAULT_SETTINGS.personSymbol
				? ["John"]
				: ["Acme"];
		}),
	};
	return { app, settings: DEFAULT_SETTINGS, taskRolesService: service };
}

describe("PersonCompanyPickerModal", () => {
	it("onOpen refreshes suggestions by dispatching input event", async () => {
		const plugin = createPlugin();
		const modal = new PersonCompanyPickerModal(
			plugin.app,
			plugin,
			() => {}
		);
		await modal.onOpen();
		expect(modal.inputEl.dispatched).toContain("input");
	});
});
