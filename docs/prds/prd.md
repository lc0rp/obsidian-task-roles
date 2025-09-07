# Obsidian Task Roles

Obsidian Task Roles allows you to associate tasks with roles, people or companies. It is intended for use with
the tasks plugin.

By default, people are created with @<person_name> and companies are created with the +<company_name>

These are linked to the directory from which the person originates, using the Mention plugin.

When writing a task, you can trigger the Assign modal, which contains the configured roles and a "+" next to each role,
allowing you to add multiple people or companies to each role. Clicking the + displays an auto-complete field that you
can type in. It has placeholder text stating, "Type @person or +company to search or create."

When you type @, it searches the person directory; when you type +, it searches the company directory. In both cases,
suggestions are displayed below the field and can be selected by clicking on them, using the arrow keys to scroll up or
down; alternatively, pressing "Enter" will select the first one. The selected person or company is displayed as a link
to that file, using the filename as an alias. E.g. [[Luke|@Luke]]

The + sign moves to the end so another selection can be made.

Entries that do not exist still display links, which, when clicked, will cause Obsidian to create the file in that directory.

@me or @Me is a special person that refers to me, and is case-insensitive. The rest of the entries are case sensitive.

Under all the roles, there is an empty row that allows you to add a new role name and icon. Then the role can be assigned
like the others.

## How are roles used?

Clicking "Done" in the Assign modal adds the selected people or companies to the task by appending them like this: icon
space comma-separated person links. The icon is the role icon. Order: DACI. Empty roles aren't shown.

## Editing task roles

Selecting "Assign or Update Roles" on a task that already has roles will display the current data and enable you to edit
it. Note that only known, unhidden roles will be parsed.

## Task Center Implementation

The Task Center is a comprehensive task management interface that provides advanced filtering, multiple view layouts,
and real-time task tracking.

### Features Implemented

#### **Task Cache System**

- **Real-time scanning**: Automatically scans all markdown files for tasks
- **Live updates**: Updates cache when files are modified, created, deleted, or renamed
- **Comprehensive parsing**: Extracts all task metadata including:
  - Task roles and assignees
  - Priority levels (🔴🟡🟢 icons, [urgent]/[high]/[low] text, ! indicators)
  - Status indicators (including custom 🚧 in-progress, ❌ cancelled)
  - Dates (due, scheduled, completed, created, modified)
  - Tags (#tag format)
  - File location and line numbers
- **Persistent storage**: Saves cache to `.obsidian/task-roles-cache.json`

#### **View Layouts**

- **Status View**: Organizes tasks by completion status (To Do, In Progress, Done, Cancelled)
- **Role View**: Groups tasks by assigned roles using DACI methodology
- **Assignees View**: Organizes by individual people and companies
- **Date View**: Groups by date categories (Not Set, Past Due, Today, This Week, Next Week)

#### **Advanced Filtering System**

- **Entity Filters**: Role, People, Companies with "none-set" options
- **Content Filters**: Status (multi-select), Priority (including none-set), Tags, Text search
- **Date Filters**: Date ranges with type selection (Created, Due, Completed, Scheduled)
- **Combination Filters**: Support for complex filtering combinations
- **Filter Workflow Control**:
  - **Auto Apply Mode**: Immediate application of filter changes (default behavior)
  - **Manual Apply Mode**: Batch filter changes with explicit apply/cancel actions
  - **State Management**: Ability to revert filter changes to original state
  - **Persistent Preferences**: Auto Apply setting saved across sessions

#### **Interactive Task Cards**

- Clickable status checkboxes for immediate task completion
- Visual priority indicators and overdue highlighting
- Tag display
- Click-to-expand detailed side panel

#### **View Configuration Management**

- **Save Configurations**: Save current filter and layout settings with custom names
- **Load Configurations**: Dropdown to quickly apply saved configurations
- **Configuration Persistence**: Stored in plugin settings
- **Overwrite Protection**: Warns before overwriting existing configurations

#### **User Interface**

- **Responsive Layout**: Kanban-style columns with task cards
- **Filter Toggle**: Collapsible filter panel with state management
- **Header Controls**: Layout selector, save/load configurations, cache refresh
- **Filter Action Buttons**: Clear Filters, Cancel, Apply Filters, and Auto Apply toggle
- **Smart Button States**: Apply and Cancel buttons automatically disabled in Auto Apply mode
- **Real-time Updates**: Immediate UI updates when cache changes

### Commands and Access

#### **Available Commands**

- **"Open Task Center"**: Opens the main task view
- **"Refresh Task Cache"**: Manually rebuilds the task cache
- **"Assign or Update Roles"**: Opens role & assignee modal (context-sensitive)

#### **Access Methods**

- Command palette access
- Ribbon icon (users icon)
- Configurable keyboard shortcuts
- Inline task icons for role & assignee updates

## Settings

- change @ sign - only updates future data
- change + sign - only updates future data
- select @ directory - only updates future data
- select + directory - only updates future data
- a button to create the @me person if it doesn't exist
- manage roles
  - You cannot edit or delete the default roles, but you can hide them, which prevents them from being displayed in future
    Assign dialogs.
  - You can add, edit, and delete custom roles, but this version of the plugin won't update any historical records that
    utilize custom roles you edit later

## Default roles: based on DACI concept

- Owner: car icon
- Approver: thumbs up icon
- Contributor: two people icon
- Informed: loudspeaker icon

## Ways of assigning people

- "Assign task roles" command to pull up dialog (only if the cursor is on a checkbox item, aka task)
- A keyboard shortcut to trigger the command
- When typing on a task, you can type the relevant icon, a space <@ or +>, which will trigger an autosuggest search of
  the person or company in the preconfigured directories.
- Inline task icons that appear automatically at the end of task lines

## Architecture

The plugin follows a modular architecture with clear separation of concerns:

### Core Structure

- **Main Plugin** (`main.ts`) - Entry point, command registration, and plugin lifecycle
- **Types** (`types/`) - TypeScript interfaces and constants including comprehensive task data models
- **Services** (`services/`) - Business logic including task caching, role & assignee processing, and view configuration
- **Components** (`components/`) - Reusable UI widgets including the task roles widget
- **Editor** (`editor/`) - CodeMirror extensions and suggestions
- **Modals** (`modals/`) - Dialog windows for role & assignee editing, and view configuration
- **Views** (`views/`) - Task Center implementation with base and concrete view classes
- **Settings** (`settings/`) - Configuration and preferences

### Key Components

#### **Core Services**

- **TaskCacheService** - Real-time task scanning, parsing, caching, and file monitoring
- **TaskRolesService** - Role & assignee parsing, formatting, and file operations
- **ViewConfigurationService** - Saved view management and persistence

#### **View System**

- **TaskRolesViewBase** - Abstract base class with common filtering and layout logic
- **TaskRolesView** - Concrete implementation with UI rendering and interaction handling

#### **Task Data Model**

- **TaskData Interface** - Comprehensive task representation including:
  - File metadata (path, line number, creation/modification dates)
  - Content parsing (description, full content)
  - Status and priority information
  - Role & assignee data with parsing
  - Date fields (due, scheduled, completed, etc.)
  - Tags and search metadata

#### **Editor Integration**

- **TaskRolesExtension** - CodeMirror extension for task decoration with person icons
- **TaskRolesInlineWidget** - Clickable widget for inline task roles
- **TaskRolesSuggest** - Auto-completion for inline role typing

This modular design makes the codebase more maintainable, testable, and extensible for future features.
