# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development

- `npm run dev` - Start development mode with file watching and automatic rebuilding
- `npm run build` - Production build with TypeScript compilation check and linting
- `npm run test` - Run Vitest test suite
- `npm run coverage` - Generate test coverage report

### Code Quality

- `npm run lint` - Run both TypeScript and markdown linting
- `npm run lint:ts` - Check TypeScript files for ESLint issues
- `npm run lint:ts:fix` - Auto-fix TypeScript linting issues
- `npm run lint:md` - Check markdown files with markdownlint
- `npm run lint:md:fix` - Auto-fix markdown formatting issues
- `npm run lint:fix` - Fix both TypeScript and markdown issues

### Testing

- `npm run test` - Run all tests with Vitest
- `npm run coverage` - Generate coverage report using c8/v8

### Version Management

- `npm run version` - Bump version and update manifest/versions.json
- `npm run preversion` - Pre-version hook that runs full linting

## Architecture Overview

### Plugin Structure

This is an Obsidian plugin built with TypeScript that implements task role assignment using the DACI methodology
(Drivers, Approvers, Contributors, Informed). The plugin provides both inline task editing and a comprehensive Task Center
 view.

### Key Architectural Components

**Main Plugin (`src/main.ts`)**

- Entry point and plugin lifecycle management
- Command registration and editor extension setup
- Service initialization and dependency injection
- Compatibility mode detection for Tasks plugin integration

**Services Layer (`src/services/`)**

- `TaskRolesService` - Core role and assignee parsing, formatting, and file operations
- `TaskQueryService` - Task query building and real-time task processing
- `ViewConfigurationService` - Persistent view configuration management

**UI Components (`src/components/`)**

- `TaskRolesInlineWidget` - CodeMirror widget for inline task role icons
- `TaskCardComponent` - Task card rendering in the Task Center
- `CompactFiltersComponent` - Compact filter UI implementation
- `ViewHeaderComponent` - Task Center header with controls and view management

**Editor Integration (`src/editor/`)**

- `TaskRolesExtension` - CodeMirror 6 extension for task detection and icon decoration
- `TaskRolesSuggest` - Auto-completion for inline role assignments
- `RoleSuggest` - Backslash shortcut system for role insertion
- `BackslashTrigger` - Compatibility mode trigger for Tasks plugin integration

**Modal Dialogs (`src/modals/`)**

- `AssignmentModal` - Role assignment and editing interface
- `SaveViewModal` - View configuration saving interface
- `RoleEditModal` - Custom role creation and editing
- `AssigneeSelectorModal` - Person and company selection interface

**Views (`src/views/`)**

- `TaskRolesView` - Main Task Center implementation with filtering and layouts
- `TaskRolesViewBase` - Base class with common view functionality

### Data Flow Architecture

1. **Task Detection**: CodeMirror extension scans for task patterns and adds interactive icons
2. **Role Parsing**: TaskRolesService parses existing role assignments from task content
3. **Task Processing**: TaskQueryService uses task queries for real-time task processing
4. **View Rendering**: Task Center uses task queries with filtering and layout management
5. **Persistence**: Changes are written back to markdown files using dataview inline format

### Key Design Patterns

**Service-Oriented Architecture**: Clear separation between data services, UI components, and editor integration

**Real-Time Processing**: Task queries for real-time task processing and updates

**Component-Based UI**: Modular, reusable UI components for consistent interface

**Settings-Driven Configuration**: Extensive user customization with persistent settings

**Compatibility Mode**: Adaptive behavior based on installed plugins (Tasks plugin detection)

### Task Data Model

Tasks are processed with comprehensive metadata:

- Role assignments using DACI methodology
- Status tracking (To Do, In Progress, Done, Cancelled)
- Priority levels (Low, Medium, High, Urgent)
- Date management (due, scheduled, completed, created)
- Tag extraction and file location tracking

### CodeMirror Integration

The plugin extensively uses CodeMirror 6 for editor integration:

- Custom decorations for task icons
- Real-time task detection and parsing
- Inline widgets for interactive elements
- Editor suggestions for role assignment
- Syntax tree analysis for context detection

## Development Guidelines

### Test-Driven Development Workflow

**CRITICAL**: All coding tasks must follow this Test-Driven Development (TDD) workflow:

1. **Write Tests First**: Before implementing any bug fix or feature, write tests that:
   - Verify the current bug/issue exists (tests should fail initially)
   - Define the expected behavior after the fix
   - Cover edge cases and error conditions

2. **Implement the Fix**: Write the minimal code needed to make the tests pass

3. **Verify Tests Pass**: Run `npm run test` to ensure all tests pass

4. **Iterate**: Repeat steps 1-3 until all functionality is complete and tests pass

5. **Update Documentation**: Update relevant documentation if the changes affect user-facing behavior

6. **Coverage Verification**: Run `npm run coverage` and report on coverage improvements

**Example TDD Workflow:**

```bash
# 1. Write failing test
npm run test  # Should fail, proving the bug exists

# 2. Implement fix
# Make code changes...

# 3. Verify tests pass
npm run test  # Should pass

# 4. Check coverage
npm run coverage  # Report coverage improvements
```

### TypeScript Standards

- Strict TypeScript configuration with `noImplicitAny` and `strictNullChecks`
- Comprehensive type definitions in `src/types/index.ts`
- Async/await for all asynchronous operations
- Proper error handling and logging

### Code Quality Requirements

- All code must pass ESLint checks before building
- TypeScript compilation must succeed without errors
- Markdown documentation must pass markdownlint validation
- Use meaningful variable names and add comments for complex logic
- **MANDATORY**: All bug fixes and features must have accompanying tests

### Testing Approach

- Vitest for unit testing with mocked Obsidian APIs
- Test files located in `tests/` directory
- Mock Obsidian API in `tests/__mocks__/obsidian.ts`
- Coverage reporting with @vitest/coverage-v8 provider
- **Target**: Maintain or improve test coverage with each change
- **Minimum**: New code must have at least 80% test coverage

### File Organization

- Services handle business logic and data processing
- Components manage UI rendering and user interaction
- Modals handle dialog-based user interactions
- Utils contain shared utility functions
- Types define comprehensive TypeScript interfaces

### Build Process

The esbuild configuration (`esbuild.config.mjs`) handles:

- TypeScript compilation and bundling
- Development mode with file watching
- CSS concatenation from multiple style files
- Production minification and optimization

### Compatibility Considerations

- Automatic Tasks plugin detection for compatibility mode
- Fallback mechanisms for different Obsidian versions
- CodeMirror version compatibility handling
- Graceful degradation for unsupported features

## Important Implementation Details

### Task Role Format

- Uses dataview inline format: `[icon:: assignees]`
- Supports legacy format for backward compatibility
- Assignees use `@` prefix for people, `+` for companies
- Special `@me` person for self-reference

### Task Processing

- Real-time task queries for immediate updates
- Direct file system operations for task modifications
- Automatic refresh when files change through task queries

### Settings Architecture

- Comprehensive settings interface with defaults
- Plugin-specific settings tab integration
- Runtime settings updates with service reinitialization
- Backward compatibility for setting migrations

### Performance Considerations

- Efficient task queries for real-time processing
- Direct file system operations for task modifications
- Optimized CodeMirror decorations for large documents
- Configurable features to reduce memory usage

## Also

- DO NOT add your signature to git commit messages
- DO NOT add "Generated with Claud Code" or anthing like that anywhere
- DO NOT add "Co-Authored-By" anywhere
- DO NOT prefix comments with "ABOUTME"
