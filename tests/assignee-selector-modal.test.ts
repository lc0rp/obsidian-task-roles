import { describe, it, expect, vi } from 'vitest';
import { App } from 'obsidian';
import { AssigneeSelectorModal } from '../src/modals/assignee-selector-modal';
import { DEFAULT_SETTINGS } from '../src/types/index';

function createPlugin() {
    const app = new App();
    const service = {
        getContactsAndCompanies: vi.fn().mockImplementation(async (symbol) => {
            return symbol === DEFAULT_SETTINGS.contactSymbol ? ['John'] : ['Acme'];
        })
    };
    return { app, settings: DEFAULT_SETTINGS, taskAssignmentService: service };
}

describe('AssigneeSelectorModal', () => {
    it('onOpen refreshes suggestions by dispatching input event', async () => {
        const plugin = createPlugin();
        const modal = new AssigneeSelectorModal(plugin.app, plugin, () => { });
        await modal.onOpen();
        expect(modal.inputEl.dispatched).toContain('input');
    });
});
