# Task Assignment View Requirements

## Filtering Capabilities

The view should support filtering tasks by multiple criteria:

### Entity-Based Filters

- **Role**: Filter tasks by specific roles
- **Person or Contact**: Filter by individual people or contacts
- **Combination of Person and Role**: Filter by a specific person in a specific role
- **Company or Group**: Filter by organizational entities
- **Combination of Company and Role**: Filter by a specific company/group in a specific role

### Date-Based Filters

- **Date Range**: From-to date range selection and "not set" option
- **Date Types**: Support for multiple date types:
  - Created date
  - Due date
  - Completed date
  - Scheduled date

### Content-Based Filters

- **Status**: Multi-select filter for task statuses
- **Priority**: Filter by task priority levels
- **Tags**: Filter by task tags
- **Text Search**: Full-text search capability

## View Layout Options

The view should support different organizational layouts:

### Status View

- Kanban-style columns organized by different task statuses - sorted by urgency then task description

### Role View

- Kanban columns organized by roles
- **Top half**: Tasks where the current user is in that role
- **Bottom half**: Tasks where others are in that role

### Person/Contact View

- Kanban columns organized by people or contacts - sorted by contact name or recency

### Company/Group View

- Kanban columns organized by companies or groups - sorted by group name or recency

### Date View

- Kanban columns organized by date categories for a selected date type:
  - Not set
  - Today
  - This week
  - Past due
  - Next week
  - All

## View Management

- **Save View Configurations**: Ability to save current filter and view settings with a custom name
- **Recall Saved Views**: Ability to quickly summon previously saved view configurations

## Task cards

Within the columns, tasks are displayed as cards, with the following fields:

- Task name
- Task description
- Task status - a checkbox that is clickable to toggle the task status

Clicking on a task card opens it up in a side panel with the rest of the fields:

- Task priority
- Task tags
- Task assignees
- Task dates

## Task caching

Views are fed from a cache of tasks. The cache is updated in the background, and the view is updated in real time.

The cache is updated by the following mechanisms:

- On task creation, the cache is updated
- On task update, the cache is updated
- On task deletion, the cache is updated

The initial cache is populated by the following mechanisms:

- On app startup, the cache is populated with all tasks
- There is a cache refresh button and a cache refresh command
- The cache is a json file in .obsidian/task-assignment-cache.json