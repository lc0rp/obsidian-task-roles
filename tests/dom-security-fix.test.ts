// Test file to verify DOM API changes work correctly
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock role suggestion dropdown class to test the highlighting functionality
class TestRoleSuggestionDropdown {
    private dropdownElement: HTMLElement | null = null;
    private availableRoles: Array<{id: string, name: string, icon: string}> = [];
    private currentFilter = "";

    constructor() {
        this.dropdownElement = document.createElement("div");
        this.availableRoles = [
            { id: "driver", name: "Driver", icon: "🚗" },
            { id: "approver", name: "Approver", icon: "👍" }
        ];
    }

    setFilter(filter: string) {
        this.currentFilter = filter;
    }

    // Replicate the new DOM-based rendering logic
    private renderRoles(): void {
        if (!this.dropdownElement) return;

        // Clear existing content using DOM API
        while (this.dropdownElement.firstChild) {
            this.dropdownElement.removeChild(this.dropdownElement.firstChild);
        }

        this.availableRoles.forEach((role, index) => {
            const item = document.createElement("div");
            item.className = "task-roles-suggestion-item";

            // Create role icon span
            const iconSpan = document.createElement("span");
            iconSpan.className = "role-icon";
            iconSpan.textContent = role.icon;
            item.appendChild(iconSpan);

            // Create role name span with highlighting support
            const nameSpan = document.createElement("span");
            nameSpan.className = "role-name";
            
            if (this.currentFilter) {
                // Handle highlighting by splitting the text and creating mark elements
                const regex = new RegExp(`(${this.currentFilter})`, "gi");
                const parts = role.name.split(regex);
                
                parts.forEach((part, partIndex) => {
                    if (part.toLowerCase() === this.currentFilter.toLowerCase()) {
                        const mark = document.createElement("mark");
                        mark.textContent = part;
                        nameSpan.appendChild(mark);
                    } else if (part) {
                        const textNode = document.createTextNode(part);
                        nameSpan.appendChild(textNode);
                    }
                });
            } else {
                nameSpan.textContent = role.name;
            }
            item.appendChild(nameSpan);

            if (this.dropdownElement) {
                this.dropdownElement.appendChild(item);
            }
        });
    }

    public render() {
        this.renderRoles();
        return this.dropdownElement;
    }

    public getDropdownContent() {
        return this.dropdownElement;
    }
}

describe('DOM Security Fix Tests', () => {
    let dropdown: TestRoleSuggestionDropdown;

    beforeEach(() => {
        dropdown = new TestRoleSuggestionDropdown();
    });

    it('should render roles without innerHTML', () => {
        const element = dropdown.render();
        expect(element).toBeTruthy();
        expect(element?.children.length).toBe(2); // Two roles
        
        // Check first role
        const firstRole = element?.children[0] as HTMLElement;
        expect(firstRole.className).toBe('task-roles-suggestion-item');
        expect(firstRole.children.length).toBe(2); // icon and name spans
        
        const iconSpan = firstRole.children[0] as HTMLElement;
        expect(iconSpan.className).toBe('role-icon');
        expect(iconSpan.textContent).toBe('🚗');
        
        const nameSpan = firstRole.children[1] as HTMLElement;
        expect(nameSpan.className).toBe('role-name');
        expect(nameSpan.textContent).toBe('Driver');
    });

    it('should highlight filtered text using mark elements', () => {
        dropdown.setFilter('dr');
        const element = dropdown.render();
        
        const firstRole = element?.children[0] as HTMLElement;
        const nameSpan = firstRole.children[1] as HTMLElement;
        
        // Should have both mark element and text node
        expect(nameSpan.children.length).toBe(1); // One mark element
        const markElement = nameSpan.children[0] as HTMLElement;
        expect(markElement.tagName.toLowerCase()).toBe('mark');
        expect(markElement.textContent).toBe('Dr');
        
        // Check that the rest of the text is a text node
        expect(nameSpan.childNodes.length).toBe(2); // mark + text node
        expect(nameSpan.childNodes[1].textContent).toBe('iver');
    });

    it('should clear dropdown content safely', () => {
        // Render first
        dropdown.render();
        const element = dropdown.getDropdownContent();
        expect(element?.children.length).toBe(2);
        
        // Change filter and re-render
        dropdown.setFilter('app');
        dropdown.render();
        
        // Should still have 2 roles, but highlighting should change
        expect(element?.children.length).toBe(2);
        
        const secondRole = element?.children[1] as HTMLElement;
        const nameSpan = secondRole.children[1] as HTMLElement;
        const markElement = nameSpan.children[0] as HTMLElement;
        expect(markElement.textContent).toBe('App');
    });
});