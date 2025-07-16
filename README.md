# Task Roles

Track who owns a task, who needs to be informed about it, who to follow up with, and more.

"Task Roles" lets you assign roles, contacts, and groups (or companies) to tasks using DACI (Driver, Approver, Contributors
, Informed) methodology.

## Features

### 🎯 Quick Role Updates

- **One-click role update**: A person icon (👤) appears at the end of every task line for instant access
- **Smart detection**: Icons appear automatically when you start typing task content
- **Natural workflow**: The cursor stays between the checkbox and icon, so you can type naturally

### 👥 Contact & Company Management

- Link tasks to contacts using `@` prefix (e.g., `@John`)
- Link tasks to companies using `+` prefix (e.g., `+AcmeCorp`)
- Auto-complete suggestions from configured directories
- Special `@me` contact for self-reference

### 🎭 Default Roles, based on DACI methodology

- **Drivers** 🚗: Who is responsible for driving the task forward
- **Approvers** 👍: Who needs to approve the task
- **Contributors** 👥: Who will contribute to the task
- **Informed** 📢: Who needs to be kept informed
- **Quick shortcuts**: Type `\d`, `\a`, `\c` or `\i` to insert role fields. Custom roles can define their own letter.
  This also works inside `tasks` or `taskview` query blocks, where the shortcut inserts `🚗 =` style markup.
- **Smart filtering**: Role suggestions only show roles that aren't already present on the task line

### ⚙️ Customizable Roles

- Add custom roles with your own icons
- Hide default roles you don't need
- Reorder roles by priority

### 📋 Task Center

The Task Center provides a comprehensive task management interface with advanced filtering, multiple view layouts, and
real-time task tracking.

#### **Opening the Task Center**

1. **Command Palette**: Use "Open Task Center" command
2. **Ribbon Icon**: Click the users icon in the left ribbon (if enabled)
3. **Hotkey**: Configure a keyboard shortcut for quick access

#### **View Layouts**

- **Status View**: Organize by task completion status (To Do, In Progress, Done, Cancelled)
- **Role View**: Group by assigned roles with DACI methodology
- **Assignees View**: Organize by individual people and companies
- **Date View**: Organize by date categories (Not Set, Past Due, Today, This Week, Next Week)

#### **Advanced Filtering**

The Task Center supports comprehensive filtering across multiple criteria:

**Entity-Based Filters:**

- **Roles**: Filter by specific roles or tasks with no role assigned
- **People**: Filter by individual contacts
- **Companies**: Filter by organizational entities
- **Combination filters**: Filter by person+role or company+role combinations

**Content-Based Filters:**

- **Status**: Multi-select filter for task statuses (To Do, In Progress, Done, Cancelled)
- **Priority**: Filter by task priority levels (Urgent, High, Medium, Low) or tasks with no explicit priority
- **Tags**: Filter by task tags
- **Text Search**: Full-text search across task descriptions, file paths, tags, and assignees

**Date-Based Filters:**

- **Date Range**: From-to date selection with "include not set" option
- **Date Types**: Filter by Created, Due, Completed, or Scheduled dates

#### **Filter Control Options**

The Task Center provides flexible filter control options:

- **Auto Apply Mode** (default): Filter changes apply immediately and close the filter section
- **Manual Apply Mode**: Experiment with filters before applying:
  - **Apply Filters**: Apply current filter settings and close section
  - **Cancel**: Revert all changes and close section (returns to original state when filter section was opened)
  - **Clear Filters**: Remove all filters and refresh view
- **Auto Apply Toggle**: Checkbox to switch between immediate and manual filter application
- **Persistent Settings**: Auto Apply preference is saved and remembered across sessions

#### **Interactive Task Cards**

Task cards display:

- Task description with clickable status checkbox
- Due date with overdue highlighting
- Priority indicators
- Tag display
- Click to open detailed side panel

#### **Task Details Side Panel**

Clicking a task card opens a detailed side panel showing:

- Full task description
- File location and line number
- Current status and priority
- All assigned roles and assignees
- Complete date information (created, due, scheduled, completed, modified)
- Tags

#### **View Configuration Management**

- **Save Configurations**: Save current filter and layout settings with custom names
- **Load Configurations**: Quickly apply saved view configurations
- **Configuration Autocomplete**: Type existing configuration names to overwrite
- **Configuration Display**: Shows currently loaded configuration name in header

#### **Real-Time Task Cache**

The Task Center uses an intelligent background task cache that:

- Automatically scans all markdown files for tasks
- Updates in real-time when files are modified, created, or deleted
- Parses comprehensive task metadata including:
  - Roles and assignees
  - Dates (due, scheduled, completed, created, modified)
  - Priority levels (🔴 Urgent, 🟡 High, 🟢 Low, or text indicators)
  - Status (including custom indicators like 🚧 for in-progress, ❌ for cancelled)
  - Tags
  - File metadata
- Stores cache data in `.obsidian/task-roles-cache.json`
- Manual refresh available via refresh button or command
- **Can be disabled** in settings to reduce memory usage (may impact performance)

## Usage

### Quick Role Addition and Updates with Icons

1. Create a task: `- [ ] Complete project documentation`
2. Start typing after the checkbox - a users icon automatically appears at the end
3. Click the icon to open the role edit dialog
4. Select roles and assign contacts/companies

### Role Format

When you assign a role to a task, it gets formatted using dataview inline format:
`[icon:: comma-separated assignees]`

Example: `[🚗:: @John, @Jane] [👍:: @Manager]`

The plugin also supports reading the legacy format for backward compatibility.

### Task Metadata Support

The plugin recognizes and parses various task metadata formats:

**Priority Indicators:**

- 🔴 or `[urgent]` or `!!!` → Urgent priority
- 🟡 or `[high]` or `!!` → High priority
- 🟢 or `[low]` → Low priority
- No indicator → Medium priority (default)

**Status Indicators:**

- `[x]` or `[X]` → Done
- 🚧 or `[in-progress]` → In Progress
- ❌ or `[cancelled]` → Cancelled
- `[ ]` → To Do (default)

**Date Formats:**

- `due: 2024-01-15`
- `scheduled: 2024-01-15`
- `completed: 2024-01-15`
- `📅 2024-01-15`
- `[due:: 2024-01-15]`

**Tags:**

- Standard Obsidian tags: `#project #urgent`

## Ways to Assign

1. **Click the person icon**: Appears automatically at the end of task lines
2. **"Assign task roles to People/Companies" command**: Use on any checkbox item (task)
3. **Keyboard shortcut**: Configurable shortcut to trigger the role edit dialog
4. **Inline typing**: Type role icon + space + `@` or `+` to trigger auto-suggest
5. **Role shortcuts**: Type `\` followed by a role shortcut letter (e.g., `\d` for Drivers) - only shows roles not already
   assigned

## Editing Roles

Select "Assign or Update Roles" on a task that already has roles setup to edit them. Only known,
unhidden roles will be parsed and displayed.

## Settings

- **Change @ symbol**: Customize contact prefix (affects future data only)
- **Change + symbol**: Customize company prefix (affects future data only)
- **Select @ directory**: Choose directory for contacts (affects future data only)
- **Select + directory**: Choose directory for companies (affects future data only)
- **Create @me contact**: Button to create the special @me contact if it doesn't exist
- **Use compact filters**: Display all filters in a single horizontal line instead of the collapsible panel
- **Enable debug logging**: Log additional information to the console
- **Compatibility mode**: Use custom backslash trigger instead of built-in editor suggest (automatically enabled when
  Tasks plugin is installed)
- **Disable task caching**: Turn off task caching to reduce memory usage (may impact performance)
- **Assign or Update Roles**:
  - Hide default roles (prevents them from appearing in future dialogs)
  - Add, edit, and delete custom roles
  - Note: Editing custom roles won't update historical records

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Task Roles"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/obsidian-task-roles/` folder
3. Reload Obsidian and enable the plugin in settings

## How It Works

The plugin uses CodeMirror editor extensions to:

- Detect task lines in real-time
- Add clickable person icons at the end of task lines
- Maintain cursor position between checkbox and icon
- Trigger role edit dialogs when icons are clicked

This approach is similar to how TaskNotes implements their functionality, providing a seamless user experience.

## Development

This plugin is built with TypeScript and follows Obsidian's plugin development guidelines.

### Project Structure

```shell

obsidian-task-roles/
├── docs/                    # Documentation files
├── src/                     # TypeScript source code
│   ├── main.ts             # Main plugin entry point
│   ├── types/              # TypeScript interfaces and constants
│   ├── services/           # Business logic and data processing
│   ├── components/         # Reusable UI components and widgets
│   ├── editor/             # Editor extensions and suggestions
│   ├── modals/             # Modal dialogs and popups
│   ├── settings/           # Plugin settings and configuration
│   ├── ui/                 # UI utilities (reserved for future use)
│   ├── utils/              # General utilities (reserved for future use)
│   └── views/              # Task Center view implementation
├── styles/                 # CSS stylesheets
│   └── task-roles-view.css # Task Center styles
├── tests/                  # Test files (future)
├── media/                  # Media assets (icons, images)
├── manifest.json           # Plugin manifest
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

### Architecture

The plugin follows a modular architecture with clear separation of concerns:

- **Main Plugin** (`main.ts`) - Entry point, command registration, and plugin lifecycle
- **Types** (`types/`) - TypeScript interfaces and constants for task data models
- **Services** (`services/`) - Business logic including task caching, role & assignee processing, and view configuration
- **Components** (`components/`) - Reusable UI widgets including the task roles icon
- **Editor** (`editor/`) - CodeMirror extensions and auto-suggestions
- **Modals** (`modals/`) - Dialog windows for role & assignee editing, and view saving
- **Views** (`views/`) - Task Center implementation with filtering and layout management
- **Settings** (`settings/`) - Configuration and preferences

### Key Components

**Core Services:**

- **TaskCacheService** - Real-time task scanning, parsing, and caching
- **TaskRolesService** - Role & assignee parsing, formatting, and file operations
- **ViewConfigurationService** - Saved view management

**UI Components:**

- **TaskRolesView** - Main Task Center interface
- **TaskRolesInlineWidget** - Inline task roles icon for tasks
- **AssignmentModel** - Role & assignee update dialog
- **TaskRolesSaveViewModal** - View configuration saving interface

**Editor Integration:**

- **TaskRolesExtension** - CodeMirror extension for task decoration
- **TaskRolesSuggest** - Auto-completion for inline role suggestions

This modular design makes the codebase more maintainable, testable, and extensible for future features.

### Building

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT

## Support

If you find this plugin helpful, consider supporting its development:

- ⭐ Star this repository
- 🐛 Report bugs and request features
- 💡 Contribute code improvements
- ☕ [Buy me a coffee](https://buymeacoffee.com) (if funding URL is configured)
