# Role Suggestion Dropdown Feature

## Overview

The Role Suggestion Dropdown is a DOM-based menu system that provides an intuitive way to insert role assignments
into tasks using a double backslash (`\\`) trigger. This feature complements the existing single backslash shortcuts
(`\o`, `\a`, `\c`, `\i`) by offering a visual selection interface for all available roles.

## Trigger Mechanism

### Double Backslash Activation

The dropdown is triggered by typing two consecutive backslashes (`\\`) in specific contexts:

- **Task lines**: Any line starting with a task marker (`- [ ]`, `- [x]`, `- [X]`)
- **Tasks codeblocks**: Inside ``\`\`\`tasks` code blocks
- **Dataview codeblocks**: Inside ``\`\`\`dataview` code blocks

### Visual Indicator

When the double backslash is typed, the system:

1. Detects the trigger pattern
2. Shows a styled dropdown menu below the cursor
3. Prevents the second backslash from being inserted into the text
4. Positions the menu with smart placement logic
5. Remove the first backslash upon finalization of the role update

## Menu Features

### Role Display

The dropdown shows all available roles with:

- **Role icon**: The emoji representation (👤, 👍, 👥, 📢)
- **Role name**: The full descriptive name (Owner, Approver, Contributor, Informed)
- **Visual highlighting**: The currently selected role is highlighted

### Intelligent Filtering

- **Available roles only**: Only shows roles that are not hidden in settings
- **Exclude existing**: Automatically filters out roles already present on the current task line
- **Real-time filtering**: Type letters to filter roles by name (e.g., "d", "dr", "dri" for "Owner")

### Navigation Methods

#### Keyboard Navigation

- **Arrow Up/Down**: Navigate through available roles
- **Enter**: Insert the selected role
- **Escape**: Close the dropdown without insertion
- **Backspace**: Remove filter characters or close menu when `\\` is deleted
- **Letter keys**: Filter roles by typing the first letters of role names

#### Mouse Interaction

- **Hover**: Highlight role on mouse hover
- **Click**: Select and insert role
- **Click outside**: Close dropdown without insertion

## Positioning Intelligence

### Tasks Plugin Conflict Avoidance

The dropdown uses smart positioning to avoid conflicts with the Tasks plugin suggestion menu:

- **Left edge detection**: When the cursor is close to the left edge of the editor (within ~300px)
- **Automatic offset**: Positions the dropdown with sufficient clearance (320px from left edge)
- **Dynamic positioning**: When the cursor is far enough from the left edge, positions directly at cursor location

### Screen Boundary Handling

- **Viewport awareness**: Ensures dropdown stays within screen boundaries
- **Automatic adjustment**: Repositions if dropdown would extend beyond screen edges
- **Consistent visibility**: Always maintains dropdown visibility regardless of cursor position

## Role Insertion Logic

### Legal Insertion Points

The system uses the same legal insertion point logic as existing shortcuts:

1. **End of line**: Appends role at the end of the task line
2. **Before existing roles**: Inserts before any existing role assignments
3. **Proper spacing**: Automatically adds appropriate spacing and formatting

### Format Consistency

Inserted roles maintain consistency with the existing system:

- **Dataview format**: `[👤::]` for standard task lines
- **Task block format**: `👤 =` for tasks/dataview codeblocks
- **Cursor positioning**: Places cursor in the assignee area for immediate editing

## Integration with Existing Features

### Compatibility with Single Backslash Shortcuts

- **Non-interfering**: Double backslash trigger doesn't affect existing `\o`, `\a`, `\c`, `\i` shortcuts
- **Shared insertion logic**: Uses the same role insertion methods for consistency
- **Setting respect**: Honors the same hidden roles settings

### Setting Synchronization

- **Dynamic updates**: Reflects changes to role visibility settings immediately
- **Custom roles**: Supports custom roles defined in plugin settings
- **Real-time filtering**: Updates available roles based on current settings

## User Experience Features

### Visual Feedback

- **Smooth operation**: Immediate response to user input
- **Clear selection**: Visual indication of currently selected role
- **Filtered highlighting**: Highlights matching characters when filtering

### Error Prevention

- **Context awareness**: Only activates in appropriate contexts (task lines, codeblocks)
- **Duplicate prevention**: Automatically excludes roles already present on the line
- **Clean cancellation**: Easy exit methods (ESC, click outside, backspace over trigger)

### Accessibility

- **Keyboard-first design**: Fully operable via keyboard
- **Visual clarity**: High contrast highlighting and clear role identification
- **Predictable behavior**: Consistent interaction patterns

## Technical Implementation

### DOM-Based Architecture

- **Independent rendering**: Creates dropdown as a separate DOM element
- **Event isolation**: Handles its own event listeners to prevent conflicts
- **Clean lifecycle**: Proper creation and cleanup of DOM elements

### Performance Optimization

- **Lazy creation**: Only creates DOM elements when needed
- **Event efficiency**: Uses capture phase event handling
- **Memory management**: Proper cleanup when dropdown is hidden

### Conflict Prevention

- **Event isolation**: Prevents interference with other editor functionality
- **Z-index management**: Ensures dropdown appears above other elements
- **Click-outside handling**: Properly detects and handles outside clicks

## Usage Examples

### Basic Usage

```markdown
- [ ] Review the proposal \\
```

Types double backslash, dropdown appears, user selects "Owner" role

Result:

```markdown
- [ ] Review the proposal [👤:: ]
```

### With Filtering

```markdown
- [ ] Update documentation \\ap
```

User types "ap" to filter for "Approver"

Result after selection:

```markdown
- [ ] Update documentation [👍:: ]
```

### In Codeblocks

```markdown
\```tasks
- [ ] Complete feature \\
\```
```

Dropdown works in task codeblocks with appropriate formatting

Result:

```markdown
\```tasks
- [ ] Complete feature 👤 = 
\```
```

## Troubleshooting

### Common Issues

1. **Dropdown doesn't appear**
   - Ensure you're in a task line or appropriate codeblock
   - Check that there are available roles to display
   - Verify roles aren't all hidden in settings

2. **Positioning issues**
   - Dropdown automatically adjusts for screen boundaries
   - May offset from cursor to avoid Tasks plugin conflicts

3. **Filtering not working**
   - Use exact letter matches from the beginning of role names
   - Backspace to clear filter if needed

### Expected Behavior

- Dropdown closes automatically when role is inserted
- Existing shortcuts continue to work normally
- Role insertion respects existing formatting and legal positions
- Settings changes are reflected immediately

## Future Enhancements

### Potential Improvements

- **Custom role icons**: Support for user-defined role icons
- **Role descriptions**: Optional tooltips with role descriptions
- **Keyboard shortcuts**: Assignable hotkeys for specific roles
- **Theme integration**: Better integration with Obsidian themes

### Extension Points

- **Plugin API**: Potential for other plugins to extend role definitions
- **Template support**: Integration with task templates
- **Bulk operations**: Multi-role assignment capabilities
