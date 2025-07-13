# Components

This directory contains UI components that have been extracted from the main view for better maintainability and separation of concerns.

## Component Structure

### CompactFiltersComponent (`compact-filters.ts`)

Handles the compact horizontal filter UI. Includes:

- Search input
- Assignee selector
- Role multiselect dropdown
- Status multiselect dropdown
- Priority multiselect dropdown
- Date filter controls
- Filter action buttons (clear, cancel, apply, auto-apply toggle)

### TaskCardComponent (`task-card.ts`)

Renders individual task cards within columns. Handles:

- Task checkbox for status changes
- Action icons (priority, link, edit, assign)
- Task description rendering
- Task metadata (dates, priority, tags)
- Task status and priority CSS classes

### ViewHeaderComponent (`view-header.ts`)

Renders the top header section of the view. Includes:

- Title and icon
- Current view name display
- Layout selector dropdown
- Save config button
- Load config dropdown
- Refresh button

## Services

### TaskQueryService (`../services/task-query.service.ts`)

Handles task query building and rendering when `useTaskQueries` setting is enabled. Includes:

- Filter-to-query conversion
- Column query building based on layout
- Query column rendering with markdown

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be reused or replaced independently
3. **Maintainability**: Much smaller, focused files are easier to understand and modify
4. **Testability**: Components can be tested in isolation
5. **Readability**: The main view class is now much cleaner and easier to follow

## Main View Refactoring

The main `TaskRolesView` class has been reduced from ~1600 lines to ~250 lines by:

- Extracting large rendering methods into components
- Moving complex filter logic to dedicated filter components
- Moving task query logic to a service
- Keeping only the coordination logic in the main view
