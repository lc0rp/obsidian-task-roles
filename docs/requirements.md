# Obsidian Task Assignment

Obsidian Task Assignment allows you to associate tasks with contacts or companies. It pairs with the Obsidian Tasks plugin, although it is not required.

By default, contacts are created with @<contact_name> and groups or companies are created with the +<company_name>

These are linked to the directory from which the contact originates, using the Mention plugin.

When writing a task, you can trigger the Assign modal, which contains the configured roles and a "+" next to each role, allowing you to add multiple contacts or companies to each role. Clicking the + displays an auto-complete field that you can type in. It has placeholder text stating, "Type @ or + to find assignee."

When you type @, it searches the contact directory; when you type +, it searches the company directory. In both cases, suggestions are displayed below the field and can be selected by clicking on them, using the arrow keys to scroll up or down; alternatively, pressing "Enter" will select the first one. The selected contact or company is displayed as a link to that file, using the filename as an alias. E.g. [[Luke|@Luke]]

The + sign moves to the end so another selection can be made.

Entries that do not exist still display links, which, when clicked, will cause Obsidian to create the file in that directory.

@me or @Me is a special contact that refers to me, and is case-insensitive. The rest of the entries are case sensitive.

Under all the roles, there is an empty row that allows you to add a new role name and icon. Then the role can be assigned like the others.

## How are roles used?

Clicking "Done" in the Assign modal adds the selected contacts or companies to the task by appending them like this: icon space comma-separated contact links. The icon is the role icon. Order: DACI. Empty roles aren't shown.

## Editing assignments

Selecting "Assign task roles" on a task that already has roles will display the current data and enable you to edit it. Note that only known, unhidden roles will be parsed.

## Settings

- change @ sign - only updates future data
- change + sign - only updates future data
- select @ directory - only updates future data
- select + directory - only updates future data
- a button to create the @me contact if it doesn't exist
- manage roles
  - You cannot edit or delete the default roles, but you can hide them, which prevents them from being displayed in future Assign dialogs.
  - You can add, edit, and delete custom roles, but this version of the plugin won't update any historical records that utilize custom you edit later

## Default roles: based on DACI concept

- Drivers: car icon
- Approvers: thumbs up icon
- Contributors: two people icon
- Informed: loudspeaker icon

## Ways of assigning contacts

- "Assign task roles" command to pull up dialog (only if the cursor is on a checkbox item, aka task)
- A keyboard shortcut to trigger the command
- When typing on a task, you can type the relevant icon, a space <@ or +>, which will trigger an autosuggest search of the contact or company in the preconfigured directories.

## Architecture

The plugin follows a modular architecture with clear separation of concerns:

### Core Structure

- **Main Plugin** (`main.ts`) - Entry point, command registration, and plugin lifecycle
- **Types** (`types/`) - TypeScript interfaces and constants
- **Services** (`services/`) - Business logic and data processing
- **Components** (`components/`) - Reusable UI widgets
- **Editor** (`editor/`) - CodeMirror extensions and suggestions
- **Modals** (`modals/`) - Dialog windows and user interactions
- **Settings** (`settings/`) - Configuration and preferences

### Key Components

- **TaskAssignmentService** - Handles parsing, formatting, and file operations
- **TaskAssignmentWidget** - Inline assignment icon for tasks
- **AssignmentModal** - Main role assignment dialog
- **AssignmentSuggest** - Editor autocompletion for inline assignments
- **TaskAssignmentExtension** - CodeMirror extension for task decoration

This modular design makes the codebase more maintainable, testable, and extensible for future features.
