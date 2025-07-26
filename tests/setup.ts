import { vi } from 'vitest';

// Mock DOM globals
Object.defineProperty(global, 'KeyboardEvent', {
    value: class KeyboardEvent extends Event {
        key: string;
        ctrlKey: boolean = false;
        metaKey: boolean = false;
        altKey: boolean = false;
        preventDefault = vi.fn();
        stopPropagation = vi.fn();

        constructor(type: string, options: { key?: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) {
            super(type);
            this.key = options.key || '';
            this.ctrlKey = options.ctrlKey || false;
            this.metaKey = options.metaKey || false;
            this.altKey = options.altKey || false;
        }
    }
});

Object.defineProperty(global, 'MouseEvent', {
    value: class MouseEvent extends Event {
        preventDefault = vi.fn();
        stopPropagation = vi.fn();
        
        constructor(type: string, options: any = {}) {
            super(type);
        }
    }
});

// Mock document enhancements for CodeMirror compatibility
// Only add the specific properties CodeMirror needs while preserving jsdom's DOM
if (global.document && global.document.documentElement) {
    // Ensure documentElement has style if it doesn't already
    if (!global.document.documentElement.style) {
        global.document.documentElement.style = {};
    }
}

if (global.document && global.document.body) {
    // Ensure body has style if it doesn't already  
    if (!global.document.body.style) {
        global.document.body.style = {};
    }
}

// Mock for createElement that CodeMirror will use, while preserving jsdom functionality
const originalCreateElement = global.document?.createElement;
if (originalCreateElement && global.document) {
    global.document.createElement = vi.fn().mockImplementation((tagName: string) => {
        // Use jsdom's real createElement and just add our mocked behaviors if needed
        const element = originalCreateElement.call(global.document, tagName);
        
        // Add any additional mocked methods if needed for our tests
        element.click = vi.fn().mockImplementation(() => {
            const clickEvent = new MouseEvent('click');
            element.dispatchEvent(clickEvent);
        });
        
        return element;
    });
}