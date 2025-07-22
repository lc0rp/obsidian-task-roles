# Source Code

This directory contains the main TypeScript source files for the Obsidian Task Roles plugin, organized into modular
subdirectories following best practices.

## Directory Structure

- `main.ts` - Main plugin entry point and core functionality
- `types/` - TypeScript interfaces and type definitions
- `services/` - Business logic and data processing services
- `components/` - Reusable UI components and widgets
- `editor/` - Editor extensions and suggestions
- `modals/` - Modal dialogs and popups
- `settings/` - Plugin settings and configuration
- `ui/` - UI utilities and helpers (reserved for future use)
- `utils/` - General utility functions (reserved for future use)
- `views/` - Custom views and panels (reserved for future use)

## Key Files

- `main.ts` - Plugin initialization and command registration
- `types/index.ts` - All TypeScript interfaces and constants
- `services/task-roles.service.ts` - Core business logic
- `components/task-roles-widget.ts` - Inline task roles widget
- `editor/task-roles-extension.ts` - CodeMirror extension for task icons
- `editor/role-suggest.ts` - Editor autocompletion for role suggestions
- `modals/task-roles-update-modal.ts` - Main role & assignee update dialog
- `modals/assignee-selector-modal.ts` - Person/company selector
- `modals/role-edit-modal.ts` - Role editing dialog
- `settings/task-roles-settings-tab.ts` - Plugin settings panel
