import { vi } from 'vitest';

export class FuzzySuggestModal {
    onClose = vi.fn();
    onNoSuggestion = vi.fn();
    close = vi.fn();
    setPlaceholder = vi.fn();
    inputEl = {
        value: '',
        dispatchEvent: vi.fn(),
        dispatched: [],
    };

    constructor() {
        this.inputEl.dispatchEvent = vi.fn((event) => {
            this.inputEl.dispatched.push(event.type);
        });
    }

    onOpen() {
        // This is a mock, so we don't need to do anything here.
    }
}

export class App { }
export class Plugin { }
export class Notice { }
export class TFile { }
export class TFolder { }
export class EditorSuggest {
    constructor(app: any) {}
    close() {}
    open() {}
}
export class Modal { 
    constructor(app: any) {}
    open() {}
    close() {}
}
export class PluginSettingTab {
    constructor(app: any, plugin: any) {}
}
export class Setting {
    controlEl = {
        createSpan: vi.fn().mockReturnValue({})
    };
    
    constructor(containerEl: any) {}
    
    setName(name: string) { return this; }
    setDesc(desc: string) { return this; }
    addText(callback: (text: any) => void) {
        const mockTextComponent = {
            setPlaceholder: vi.fn().mockReturnThis(),
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
            inputEl: {}
        };
        callback(mockTextComponent);
        return this;
    }
    addButton(callback: (button: any) => void) {
        const mockButtonComponent = {
            setButtonText: vi.fn().mockReturnThis(),
            setDisabled: vi.fn().mockReturnThis(),
            onClick: vi.fn().mockReturnThis(),
            setCta: vi.fn().mockReturnThis()
        };
        callback(mockButtonComponent);
        return this;
    }
    addToggle(callback: (toggle: any) => void) {
        const mockToggleComponent = {
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis()
        };
        callback(mockToggleComponent);
        return this;
    }
    addDropdown(callback: (dropdown: any) => void) {
        const mockDropdownComponent = {
            addOption: vi.fn().mockReturnThis(),
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis()
        };
        callback(mockDropdownComponent);
        return this;
    }
} 