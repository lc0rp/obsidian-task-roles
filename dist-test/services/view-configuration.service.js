export class ViewConfigurationService {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    async saveViewConfiguration(name, layout, filters, sortBy, overwrite = false) {
        // Check if name already exists
        const existingIndex = this.plugin.settings.savedViews.findIndex(view => view.name === name);
        if (existingIndex !== -1 && !overwrite) {
            return { success: false, error: 'A view with this name already exists' };
        }
        const config = {
            id: existingIndex !== -1 ? this.plugin.settings.savedViews[existingIndex].id : this.generateId(),
            name,
            layout,
            filters,
            sortBy,
            createdDate: existingIndex !== -1 ? this.plugin.settings.savedViews[existingIndex].createdDate : new Date()
        };
        if (existingIndex !== -1) {
            // Update existing view
            this.plugin.settings.savedViews[existingIndex] = config;
        }
        else {
            // Add new view
            this.plugin.settings.savedViews.push(config);
        }
        await this.plugin.saveSettings();
        return { success: true };
    }
    async updateViewConfiguration(id, updates) {
        const index = this.plugin.settings.savedViews.findIndex(view => view.id === id);
        if (index !== -1) {
            this.plugin.settings.savedViews[index] = {
                ...this.plugin.settings.savedViews[index],
                ...updates
            };
            await this.plugin.saveSettings();
        }
    }
    async deleteViewConfiguration(id) {
        this.plugin.settings.savedViews = this.plugin.settings.savedViews.filter(view => view.id !== id);
        await this.plugin.saveSettings();
    }
    getViewConfiguration(id) {
        return this.plugin.settings.savedViews.find(view => view.id === id);
    }
    getAllViewConfigurations() {
        return [...this.plugin.settings.savedViews].sort((a, b) => a.name.localeCompare(b.name));
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
