/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompactFiltersComponent } from "../src/components/compact-filters";
import { ViewFilters } from "../src/types";

// Mock Obsidian
vi.mock("obsidian", () => ({
	setIcon: vi.fn(),
}));

// Mock plugin
const mockPlugin = {
	app: {},
	settings: {
		personSymbol: "@",
		companySymbol: "+",
		autoApplyFilters: true,
	},
	getVisibleRoles: vi.fn(() => [
		{ id: "driver", name: "Driver", icon: "👤" },
		{ id: "approver", name: "Approver", icon: "✅" },
	]),
	saveSettings: vi.fn(),
};

describe("CompactFiltersComponent", () => {
	let component: CompactFiltersComponent;
	let mockUpdateCallback: ReturnType<typeof vi.fn>;
	let mockRegisterCallback: ReturnType<typeof vi.fn>;
	let mockResetFiltersCallback: ReturnType<typeof vi.fn>;
	let mockApplyFiltersCallback: ReturnType<typeof vi.fn>;
	let container: HTMLElement;

	beforeEach(() => {
		// Create a mock container with Obsidian DOM extensions
		container = document.createElement("div");

		// Add Obsidian DOM extensions to the container
		const addObsidianExtensions = (element: HTMLElement) => {
			element.createDiv = vi
				.fn()
				.mockImplementation((className?: string) => {
					const div = document.createElement("div");
					if (className) div.className = className;
					// Add setText method to div
					div.setText = vi.fn().mockImplementation((text: string) => {
						div.textContent = text;
						return div;
					});
					// Add addEventListener for hover events
					div.addEventListener = vi
						.fn()
						.mockImplementation(
							(event: string, handler: Function) => {
								// Store the handler for potential testing
								if (!div._eventHandlers)
									div._eventHandlers = {};
								div._eventHandlers[event] = handler;
							}
						);
					addObsidianExtensions(div);
					element.appendChild(div);
					return div;
				});

			element.createEl = vi
				.fn()
				.mockImplementation((tagName: string, attrs?: any) => {
					const el = document.createElement(tagName);
					if (attrs) {
						if (attrs.cls) el.className = attrs.cls;
						if (attrs.type) el.setAttribute("type", attrs.type);
						if (attrs.placeholder)
							el.setAttribute("placeholder", attrs.placeholder);
						if (attrs.text) el.textContent = attrs.text;
						if (attrs.title) el.setAttribute("title", attrs.title);
						if (attrs.value) el.setAttribute("value", attrs.value);
					}
					// Add setText method to all elements
					el.setText = vi.fn().mockImplementation((text: string) => {
						el.textContent = text;
						return el;
					});
					addObsidianExtensions(el);
					element.appendChild(el);
					return el;
				});

			element.createSpan = vi.fn().mockImplementation((attrs?: any) => {
				const span = document.createElement("span");
				if (attrs) {
					if (attrs.cls) span.className = attrs.cls;
					if (attrs.text) span.textContent = attrs.text;
				}
				// Add setText method to span
				span.setText = vi.fn().mockImplementation((text: string) => {
					span.textContent = text;
					return span;
				});
				addObsidianExtensions(span);
				element.appendChild(span);
				return span;
			});
		};

		addObsidianExtensions(container);

		mockUpdateCallback = vi.fn();
		mockRegisterCallback = vi.fn();
		mockResetFiltersCallback = vi.fn();
		mockApplyFiltersCallback = vi.fn();

		component = new CompactFiltersComponent(
			mockPlugin as any,
			{} as ViewFilters,
			mockUpdateCallback,
			mockRegisterCallback,
			mockResetFiltersCallback,
			mockApplyFiltersCallback
		);
	});

	describe("Assignee Filter Display", () => {
		it("should display multiple assignees separated by comma when 3 or fewer", async () => {
			const filters: ViewFilters = {
				people: ["@john", "@jane"],
				companies: ["+acme"],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const assigneeInput = container.querySelector(
				".compact-filter-assignees"
			) as HTMLInputElement;
			expect(assigneeInput).toBeTruthy();

			// With 3 or fewer assignees, should show all separated by comma
			expect(assigneeInput.value).toBe("@john, @jane, +acme");
		});

		it("should show clear button only when assignees are selected", async () => {
			const filters: ViewFilters = {
				people: ["@john"],
				companies: [],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const clearButton = container.querySelector(
				".compact-filter-clear-btn"
			) as HTMLElement;
			expect(clearButton).toBeTruthy();
			expect(clearButton.style.display).toBe("block");
		});

		it("should hide clear button when no assignees are selected", async () => {
			const filters: ViewFilters = {
				people: [],
				companies: [],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const clearButton = container.querySelector(
				".compact-filter-clear-btn"
			) as HTMLElement;
			expect(clearButton).toBeTruthy();
			expect(clearButton.style.display).toBe("none");
		});

		it("should clear all assignees when clear button is clicked", async () => {
			const filters: ViewFilters = {
				people: ["@john", "@jane"],
				companies: ["+acme"],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const clearButton = container.querySelector(
				".compact-filter-clear-btn"
			) as HTMLElement;
			expect(clearButton).toBeTruthy();

			clearButton.click();

			expect(mockUpdateCallback).toHaveBeenCalledWith({
				people: [],
				companies: [],
			});
		});
	});

	describe("Enhanced Assignee Display", () => {
		it('should show "X selected" when more than 3 assignees are selected', async () => {
			const filters: ViewFilters = {
				people: ["@john", "@jane", "@bob", "@alice"],
				companies: ["+acme", "+corp"],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const assigneeInput = container.querySelector(
				".compact-filter-assignees"
			) as HTMLInputElement;
			expect(assigneeInput).toBeTruthy();

			// Should show count when more than 3 assignees
			expect(assigneeInput.value).toBe("6 selected");
		});

		it("should show full list on hover when using count display", async () => {
			const filters: ViewFilters = {
				people: ["@john", "@jane", "@bob", "@alice"],
				companies: ["+acme", "+corp"],
			};

			component = new CompactFiltersComponent(
				mockPlugin as any,
				filters,
				mockUpdateCallback,
				mockRegisterCallback,
				mockResetFiltersCallback,
				mockApplyFiltersCallback
			);

			await component.render(container);

			const inputWrapper = container.querySelector(
				".compact-filter-input-wrapper"
			) as HTMLElement;
			expect(inputWrapper).toBeTruthy();

			// Should have a tooltip element for full list
			const tooltip = inputWrapper.querySelector(".assignee-tooltip");
			expect(tooltip).toBeTruthy();
		});
	});
});
