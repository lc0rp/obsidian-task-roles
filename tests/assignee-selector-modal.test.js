import { test } from 'node:test';
import assert from 'node:assert/strict';
import { App, FuzzySuggestModal } from './obsidian/index.js';
import { AssigneeSelectorModal } from '../dist-test/modals/assignee-selector-modal.js';
import { DEFAULT_SETTINGS } from '../dist-test/types/index.js';

function createPlugin() {
  const app = new App();
  const service = {
    getContactsAndCompanies: async (symbol) => {
      return symbol === DEFAULT_SETTINGS.contactSymbol ? ['John'] : ['Acme'];
    }
  };
  return { app, settings: DEFAULT_SETTINGS, taskAssignmentService: service };
}

test('onOpen refreshes suggestions by dispatching input event', async () => {
  const plugin = createPlugin();
  const modal = new AssigneeSelectorModal(plugin.app, plugin, () => { });
  await modal.onOpen();
  assert.ok(modal.inputEl.dispatched.includes('input'));
});
