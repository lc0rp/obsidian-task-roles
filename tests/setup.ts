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

// Mock document methods
Object.defineProperty(global, 'document', {
    value: {
        ...global.document,
        createElement: vi.fn().mockImplementation((tagName: string) => {
            const children: any[] = [];
            const element = {
                tagName: tagName.toUpperCase(),
                className: '',
                style: {},
                innerHTML: '',
                children,
                appendChild: vi.fn().mockImplementation((child: any) => {
                    children.push(child);
                    child.parentElement = element;
                    return child;
                }),
                addEventListener: vi.fn().mockImplementation((event: string, handler: Function) => {
                    element._eventHandlers = element._eventHandlers || {};
                    element._eventHandlers[event] = element._eventHandlers[event] || [];
                    element._eventHandlers[event].push(handler);
                }),
                removeEventListener: vi.fn(),
                remove: vi.fn(),
                contains: vi.fn(),
                click: vi.fn().mockImplementation(() => {
                    const clickHandlers = element._eventHandlers?.click || [];
                    clickHandlers.forEach((handler: Function) => handler({ 
                        type: 'click', 
                        target: element,
                        stopPropagation: vi.fn(),
                        preventDefault: vi.fn()
                    }));
                }),
                querySelector: vi.fn().mockImplementation((selector: string) => {
                    // Simple implementation for class selectors
                    if (selector.startsWith('.')) {
                        const className = selector.substring(1);
                        const findByClass = (el: any): any => {
                            if (el.className === className || (el.className && el.className.includes(className))) {
                                return el;
                            }
                            for (const child of el.children || []) {
                                const found = findByClass(child);
                                if (found) return found;
                            }
                            return null;
                        };
                        return findByClass(element);
                    }
                    return null;
                }),
                querySelectorAll: vi.fn().mockReturnValue([]),
                setAttribute: vi.fn(),
                getAttribute: vi.fn(),
                classList: {
                    add: vi.fn(),
                    remove: vi.fn(),
                }
            };
            return element;
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: {
            appendChild: vi.fn(),
        }
    },
    writable: true
});