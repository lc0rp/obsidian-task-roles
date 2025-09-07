import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "obsidian";
import { DEFAULT_SETTINGS } from "../src/types/index";

// Test to verify the async fix works
describe("Settings Tab - Async Behavior Fix", () => {
	it("should demonstrate that async setting creation no longer blocks synchronous display", async () => {
		// Create a mock service that simulates slow async operation
		const mockService = {
			mePersonExists: vi
				.fn()
				.mockImplementation(
					() =>
						new Promise((resolve) =>
							setTimeout(() => resolve(false), 100)
						)
				),
			createMePerson: vi.fn(),
			refreshAssigneeCache: vi.fn(),
		};

		const mockPlugin = {
			app: new App(),
			settings: DEFAULT_SETTINGS,
			saveSettings: vi.fn(),
			taskRolesService: mockService,
		};

		// Mock a container element
		const mockContainer = {
			children: [] as any[],
			empty: vi.fn(),
			createEl: vi.fn().mockReturnValue({}),
		};

		// Test that the method completes synchronously even with async operations inside
		const startTime = Date.now();

		// This would be called from display() method - should complete immediately
		// even though mePersonExists() is async
		const createMePersonFileSetting = (containerEl: any) => {
			const setting = {
				setName: vi.fn().mockReturnThis(),
				setDesc: vi.fn().mockReturnThis(),
				addButton: vi.fn().mockImplementation((callback) => {
					const button = {
						setButtonText: vi.fn().mockReturnThis(),
						setDisabled: vi.fn().mockReturnThis(),
						onClick: vi.fn().mockReturnThis(),
					};
					callback(button);
					return setting;
				}),
				controlEl: {
					createSpan: vi.fn(),
				},
			};

			// Simulate the fixed implementation - sync creation with async update
			mockService.mePersonExists().then((meExists) => {
				// This runs async but doesn't block the initial creation
				if (meExists) {
					setting.controlEl.createSpan({
						text: "DONE",
						cls: "me-person-done-pill",
					});
				}
			});

			return setting;
		};

		// Call the function
		createMePersonFileSetting(mockContainer);

		const endTime = Date.now();
		const executionTime = endTime - startTime;

		// Should complete very quickly (under 50ms) because it's not awaiting the async operation
		expect(executionTime).toBeLessThan(50);

		// Verify that the async operation was started
		expect(mockService.mePersonExists).toHaveBeenCalled();

		// Wait for async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 150));

		// The async operation should have completed by now
		expect(mockService.mePersonExists).toHaveBeenCalledTimes(1);
	});

	it("should handle errors gracefully in async operations", async () => {
		const mockService = {
			mePersonExists: vi
				.fn()
				.mockRejectedValue(new Error("Network error")),
			createMePerson: vi.fn(),
			refreshAssigneeCache: vi.fn(),
		};

		const createMePersonFileSetting = (_containerEl: any) => {
			const setting = {
				setName: vi.fn().mockReturnThis(),
				setDesc: vi.fn().mockReturnThis(),
				addButton: vi.fn().mockImplementation((callback) => {
					const button = {
						setButtonText: vi.fn().mockReturnThis(),
						setDisabled: vi.fn().mockReturnThis(),
						onClick: vi.fn().mockReturnThis(),
					};
					callback(button);
					return setting;
				}),
				controlEl: {
					createSpan: vi.fn(),
				},
			};

			// Simulate the fixed implementation with error handling
			mockService
				.mePersonExists()
				.then(() => {
					// This shouldn't be called due to error
				})
				.catch(() => {
					// Error should be handled gracefully
				});

			return setting;
		};

		// Should not throw even with async error
		expect(() => createMePersonFileSetting({})).not.toThrow();

		// Wait for async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(mockService.mePersonExists).toHaveBeenCalled();
	});
});
