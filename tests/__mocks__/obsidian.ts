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