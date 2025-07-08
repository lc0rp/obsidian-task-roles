# Source Code

This directory contains the main TypeScript source files for the Obsidian Task Assignment plugin, organized into modular
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
- `services/task-assignment.service.ts` - Core business logic
- `components/task-assignment-widget.ts` - Inline task assignment widget
- `editor/task-assignment-extension.ts` - CodeMirror extension for task icons
- `editor/assignment-suggest.ts` - Editor autocompletion for assignments
- `modals/assignment-modal.ts` - Main assignment dialog
- `modals/assignee-selector-modal.ts` - Contact/company selector
- `modals/role-edit-modal.ts` - Role editing dialog
- `settings/task-assignment-settings-tab.ts` - Plugin settings panel
