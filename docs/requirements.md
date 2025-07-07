# Obsidian Task Assignment

Obsidian Task Assignment allows you to associate tasks with contacts or companies. It pairs with the Obsidian Tasks plugin,
although it is not required.

By default, contacts are created with @<contact_name> and groups or companies are created with the +<company_name>

These are linked to the directory from which the contact originates, using the Mention plugin.

When writing a task, you can trigger the Assign modal, which contains the configured roles and a "+" next to each role,
allowing you to add multiple contacts or companies to each role. Clicking the + displays an auto-complete field that you
can type in. It has placeholder text stating, "Type @contact or +company to search or create."

When you type @, it searches the contact directory; when you type +, it searches the company directory. In both cases,
suggestions are displayed below the field and can be selected by clicking on them, using the arrow keys to scroll up or
down; alternatively, pressing "Enter" will select the first one. The selected contact or company is displayed as a link
to that file, using the filename as an alias. E.g. [[Luke|@Luke]]

The + sign moves to the end so another selection can be made.

Entries that do not exist still display links, which, when clicked, will cause Obsidian to create the file in that directory.

@me or @Me is a special contact that refers to me, and is case-insensitive. The rest of the entries are case sensitive.

Under all the roles, there is an empty row that allows you to add a new role name and icon. Then the role can be assigned
like the others.

## How are roles used?

Clicking "Done" in the Assign modal adds the selected contacts or companies to the task by appending them like this: icon
space comma-separated contact links. The icon is the role icon. Order: DACI. Empty roles aren't shown.

## Editing assignments

Selecting "Assign task roles" on a task that already has roles will display the current data and enable you to edit it.
Note that only known, unhidden roles will be parsed.

## Task Center Implementation

The Task Center is a comprehensive task management interface that provides advanced filtering, multiple view layouts,
and real-time task tracking.

### Features Implemented

#### **Task Cache System**

- **Real-time scanning**: Automatically scans all markdown files for tasks
- **Live updates**: Updates cache when files are modified, created, deleted, or renamed
- **Comprehensive parsing**: Extracts all task metadata including:
  - Task assignments and roles
  - Priority levels (🔴🟡🟢 icons, [urgent]/[high]/[low] text, ! indicators)
  - Status indicators (including custom 🚧 in-progress, ❌ cancelled)
  - Dates (due, scheduled, completed, created, modified)
  - Tags (#tag format)
  - File location and line numbers
- **Persistent storage**: Saves cache to `.obsidian/task-assignment-cache.json`

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

#### **Task Details Side Panel**

- Full task description and file location
- Complete assignment information with roles
- All date fields (created, due, scheduled, completed, modified)
- Priority and status information
- Tags display

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
- **"Assign task roles"**: Opens assignment modal (context-sensitive)

#### **Access Methods**

- Command palette access
- Ribbon icon (users icon)
- Configurable keyboard shortcuts
- Inline task icons for assignment

## Settings

- change @ sign - only updates future data
- change + sign - only updates future data
- select @ directory - only updates future data
- select + directory - only updates future data
- a button to create the @me contact if it doesn't exist
- manage roles
  - You cannot edit or delete the default roles, but you can hide them, which prevents them from being displayed in future
    Assign dialogs.
  - You can add, edit, and delete custom roles, but this version of the plugin won't update any historical records that
    utilize custom roles you edit later

## Default roles: based on DACI concept

- Drivers: car icon
- Approvers: thumbs up icon
- Contributors: two people icon
- Informed: loudspeaker icon

## Ways of assigning contacts

- "Assign task roles" command to pull up dialog (only if the cursor is on a checkbox item, aka task)
- A keyboard shortcut to trigger the command
- When typing on a task, you can type the relevant icon, a space <@ or +>, which will trigger an autosuggest search of
  the contact or company in the preconfigured directories.
- Inline task icons that appear automatically at the end of task lines

## Architecture

The plugin follows a modular architecture with clear separation of concerns:

### Core Structure

- **Main Plugin** (`main.ts`) - Entry point, command registration, and plugin lifecycle
- **Types** (`types/`) - TypeScript interfaces and constants including comprehensive task data models
- **Services** (`services/`) - Business logic including task caching, assignment processing, and view configuration
- **Components** (`components/`) - Reusable UI widgets including the task assignment widget
- **Editor** (`editor/`) - CodeMirror extensions and suggestions
- **Modals** (`modals/`) - Dialog windows for assignments, role editing, and view configuration
- **Views** (`views/`) - Task Center implementation with base and concrete view classes
- **Settings** (`settings/`) - Configuration and preferences

### Key Components

#### **Core Services**

- **TaskCacheService** - Real-time task scanning, parsing, caching, and file monitoring
- **TaskAssignmentService** - Assignment parsing, formatting, and file operations
- **ViewConfigurationService** - Saved view management and persistence

#### **View System**

- **TaskAssignmentViewBase** - Abstract base class with common filtering and layout logic
- **TaskAssignmentView** - Concrete implementation with UI rendering and interaction handling

#### **Task Data Model**

- **TaskData Interface** - Comprehensive task representation including:
  - File metadata (path, line number, creation/modification dates)
  - Content parsing (description, full content)
  - Status and priority information
  - Assignment data with parsed roles
  - Date fields (due, scheduled, completed, etc.)
  - Tags and search metadata

#### **Editor Integration**

- **TaskAssignmentExtension** - CodeMirror extension for task decoration with person icons
- **TaskAssignmentWidget** - Clickable widget for inline task assignment
- **AssignmentSuggest** - Auto-completion for inline assignment typing

This modular design makes the codebase more maintainable, testable, and extensible for future features.
