# Compatibility Mode

The Task Roles plugin now includes a **Compatibility Mode** that provides an alternative way to handle role shortcuts
using a custom backslash trigger instead of the built-in Obsidian editor suggest system.

## Overview

By default, the plugin uses Obsidian's built-in `EditorSuggest` system for role shortcuts (typing `\` followed by a role
shortcut).
However, some users may experience conflicts with other plugins or prefer a different interaction model.

Compatibility mode replaces the editor suggest with a custom `ViewPlugin` that:

- Intercepts backslash key presses
- Shows a custom popup with role options
- Provides keyboard navigation (arrow keys, enter, escape)
- Supports mouse interaction

## How to Enable

### Automatic (Recommended)

If you have the **Tasks plugin** installed, compatibility mode will be automatically enabled by default. This ensures
optimal compatibility between the two plugins.

### Manual

1. Open Obsidian Settings
2. Navigate to Task Roles plugin settings
3. Enable the "Compatibility mode" toggle
4. The plugin will automatically switch to using the custom backslash trigger

## Implementation Details

### Settings

- Added `compatMode: boolean` to `TaskRolesPluginSettings`
- Default value is `false` (uses standard editor suggest)
- **Auto-enable**: Automatically set to `true` when Tasks plugin is detected
- Setting is saved and persists across sessions

### Conditional Registration

The main plugin (`src/main.ts`) now conditionally registers either:

```typescript
if (this.settings.compatMode) {
    this.registerEditorExtension(backslashTrigger(this.app, this.settings));
} else {
    this.registerEditorSuggest(new RoleSuggest(this.app, this));
}
```

### Custom Backslash Trigger

The `backslashTrigger` function (`src/editor/backslash-trigger.ts`) creates a `ViewPlugin` that:

1. **Intercepts Keydown Events**: Listens for backslash key presses
2. **Prevents Default Behavior**: Stops propagation to avoid conflicts
3. **Shows Role Popup**: Displays available roles in a custom popup
4. **Handles Selection**: Inserts the selected role with proper formatting

### Features

- **Visual Popup**: Custom-styled popup with role icons and names
- **Keyboard Navigation**:
  - Arrow keys to navigate options
  - Enter to select
  - Escape or `\` to dismiss and insert a literal backslash
- **Mouse Support**: Click to select roles
- **Context Awareness**: Detects task code blocks and formats accordingly
- **Proper Cleanup**: Removes event listeners on destroy

### Styling

Custom CSS classes provide consistent styling:

- `.backslash-trigger-popup`: Main popup container
- `.backslash-trigger-option`: Individual role options
- Hover and selection states
- Responsive design matching Obsidian's theme

## Benefits

- **Compatibility**: Avoids conflicts with other plugins that might interfere with editor suggest
- **Customization**: Allows for future enhancements to the trigger behavior
- **User Choice**: Provides flexibility for different user preferences
- **Fallback**: Maintains the same functionality as the original editor suggest

## Usage

With compatibility mode enabled:

1. Type `\` in the editor
2. A popup appears with available roles
3. Press `\` again or hit <kbd>Esc</kbd> to dismiss the popup and insert a single backslash
4. Use arrow keys or mouse to select a role
5. Press Enter or click to insert the role
6. The role is formatted as `[🚗:: ]` or `🚗 =` depending on context

The behavior is identical to the standard mode, just with a different interaction method.
