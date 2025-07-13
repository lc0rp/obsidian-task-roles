# Styles

This directory contains the CSS stylesheets for the Obsidian Task Roles plugin.

## Files

- `styles.css` - Main plugin stylesheet with all component styles

## Build Process

The `styles.css` file is automatically copied to the root directory during the build process:

- **Production build**: `npm run build` copies the file once
- **Development build**: `npm run dev` copies the file and watches for changes
- **Auto-reload**: In development mode, changes to `styles.css` trigger automatic copying

## CSS Structure

The stylesheet is organized into sections:

### Core Components

- `.roles-container` - Main roles container in roles update modal
- `.role-row` - Individual role rows
- `.role-header` - Role name and icon header
- `.assignee-container` - Container for assignee tags
- `.assignee-tag` - Individual assignee badges

### Interactive Elements

- `.add-assignee-btn` - Add button for roles
- `.remove-assignee` - Remove button in assignee tags
- `.button-container` - Modal button containers

### Editor Components

- `.task-roles-icon-container` - Container for inline task icons
- `.task-roles-icon-button` - Clickable icon button
- `.task-roles-icon` - Icon styling

### Settings

- Settings page specific styles
- Custom role management styles
- Form input styling

### Responsive Design

- Mobile-friendly styles for smaller screens
- Adaptive layout for different screen sizes

## CSS Variables

The styles use Obsidian's CSS variables for consistent theming:

- `--background-primary` - Primary background color
- `--background-secondary` - Secondary background color
- `--text-normal` - Normal text color
- `--text-muted` - Muted text color
- `--interactive-accent` - Accent color for buttons
- `--tag-background` - Tag background color

This ensures the plugin matches the user's chosen Obsidian theme.

## Development

When making changes to styles:

1. Edit `styles/styles.css`
2. If running `npm run dev`, changes are automatically copied
3. If not, run `npm run build` to copy changes
4. Reload the plugin in Obsidian to see changes
