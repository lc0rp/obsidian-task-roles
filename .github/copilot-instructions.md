# Obsidian Task Roles Plugin Development Instructions

**ALWAYS follow these instructions first. Only fallback to additional search and context gathering if the information here is incomplete or found to be in error.**

## Project Overview

Obsidian Task Roles is a TypeScript plugin for Obsidian that enables DACI-style role assignment (Drivers, Approvers, Contributors, Informed) for tasks. The plugin provides inline task editing with role icons and a comprehensive Task Center dashboard.

## Essential Setup and Build Commands

### Dependencies and Environment Setup

```bash
# Install all dependencies - takes ~3-15 seconds
npm install
```

### Build Commands - TIMING CRITICAL

```bash
# Development mode with file watching - NEVER CANCEL
npm run dev
# Builds instantly and watches for changes. Let it run continuously.

# TypeScript compilation check - takes ~2-4 seconds, NEVER CANCEL
tsc -noEmit -skipLibCheck --project config/tsconfig.json

# Production build (esbuild) - takes ~0.1 seconds
node config/esbuild.config.mjs production

# Full production build with linting - takes ~6 seconds without linting, NEVER CANCEL
# NOTE: ESLint currently has configuration issues - see workarounds below
npm run build
```

### Testing Commands - TIMING CRITICAL

```bash
# Run test suite - takes ~7-8 seconds, NEVER CANCEL, set timeout to 30+ seconds
npm run test

# Generate test coverage - takes ~9 seconds, NEVER CANCEL, set timeout to 30+ seconds
npm run coverage
```

### Linting Commands

```bash
# ESlint commands:
npm run lint:ts        # Works - incorporates workaround above - takes ~1 second
npm run lint:ts:fix    # Works - incorporates workaround above with --fix flag - takes ~1 second

# Markdown linting works correctly:
npm run lint:md        # Works - takes ~1 second
npm run lint:md:fix    # Works - takes ~1 second

# Combined linting:
npm run lint           # Works
npm run lint:fix       # Works
```

## Validation Requirements

### Build Validation

1. ALWAYS run `npm install` first after cloning
2. ALWAYS test TypeScript compilation: `tsc -noEmit -skipLibCheck --project config/tsconfig.json`
3. ALWAYS test production build: `node config/esbuild.config.mjs production`
4. ALWAYS verify build outputs exist: `main.js` and `styles.css`

### Test Validation

1. ALWAYS run full test suite: `npm run test` (231 tests across 21 files)
2. Run test coverage for code changes: `npm run coverage`
3. Tests include comprehensive scenarios for:
    - Task parsing and role assignment
    - UI component behavior
    - Service layer functionality
    - Editor integration

### Code Quality Validation

1. Run es lint: `npm run lint:ts`
2. Run markdown linting: `npm run lint:md`
3. ALWAYS ensure no new linting errors before committing

### Functional Validation Limitations

**CRITICAL**: This is an Obsidian plugin - it cannot be validated as a standalone application.

-   The built `main.js` file must be loaded within Obsidian
-   UI functionality cannot be tested without Obsidian environment
-   Focus validation on build success, test passage, and linting compliance

## Project Architecture and Navigation

### Core Directory Structure

```
src/
├── main.ts                 # Plugin entry point and lifecycle
├── types/                  # TypeScript interfaces and constants
├── services/               # Business logic layer
│   ├── task-roles.service.ts      # Role parsing and file operations
│   ├── task-query.service.ts      # Task processing and caching
│   └── view-configuration.service.ts # View settings persistence
├── components/             # Reusable UI components
│   ├── task-roles-widget.ts       # Inline role assignment widget
│   ├── compact-filters.ts         # Task Center filter UI
│   └── task-card.ts              # Task display cards
├── editor/                 # CodeMirror 6 integration
├── modals/                 # Dialog interfaces
├── views/                  # Task Center implementation
└── settings/               # Plugin configuration

tests/                      # Comprehensive test suite (231 tests)
config/                     # Build and tooling configuration
docs/                       # Documentation including CLAUDE.md
```

### Key Components to Know

**Services Layer** (most frequent changes):

-   `TaskRolesService` - Core role and assignee parsing logic
-   `TaskQueryService` - Real-time task processing and file monitoring
-   `ViewConfigurationService` - Saved view management

**UI Components** (frequent updates):

-   `TaskRolesInlineWidget` - The 👤 icon that appears on task lines
-   `CompactFiltersComponent` - Task Center filtering interface
-   `TaskCardComponent` - Individual task display in Task Center

**Editor Integration** (complex, change carefully):

-   `TaskRolesExtension` - CodeMirror extension for task decoration
-   `TaskRolesSuggest` - Auto-completion for @person and +company
-   `BackslashTrigger` - Keyboard shortcuts (\d, \a, \c, \i)

## Common Development Tasks

### Making Code Changes

1. Start development mode: `npm run dev`
2. Make changes to TypeScript files in `src/`
3. Build rebuilds automatically and instantly
4. Test your changes: `npm run test`
5. Run linting: `ESLINT_USE_FLAT_CONFIG=true npx eslint -c config/eslint.config.js src`

### Adding New Features

1. Write tests first (TDD approach - see `docs/CLAUDE.md`)
2. Add failing tests to appropriate file in `tests/`
3. Implement minimal code to make tests pass
4. Verify all tests still pass: `npm run test`
5. Check test coverage: `npm run coverage`

### Debugging Build Issues

1. Check TypeScript compilation: `tsc -noEmit -skipLibCheck --project config/tsconfig.json`
2. Check individual build step: `node config/esbuild.config.mjs production`
3. Verify dependencies: `npm install`
4. Check for ESLint configuration issues (use workaround above)

### Working with Tests

-   Test files mirror source structure: `tests/service-name.test.ts`
-   Use Vitest framework with comprehensive mocking in `tests/__mocks__/`
-   ALWAYS run full test suite before committing
-   Key test types: unit tests, integration tests, component behavior tests

## Configuration Files Location

-   ESLint: `config/eslint.config.js` (flat config format)
-   TypeScript: `config/tsconfig.json`
-   Vitest: `config/vitest.config.mjs`
-   esbuild: `config/esbuild.config.mjs`
-   Markdownlint: `config/markdownlint.json`

### Plugin Development Limitations

-   Cannot run the plugin standalone
-   UI changes require manual testing in Obsidian
-   Focus on automated test coverage for functionality validation

## Critical Reminders

-   **NEVER CANCEL** any build or test command - wait for completion
-   **ALWAYS** run tests after code changes
-   **ALWAYS** use ESLint workaround for TypeScript linting
-   Set timeouts of 30+ seconds for test commands
-   Build times are very fast (~4 seconds total) so builds should complete quickly
-   Development mode with `npm run dev` provides instant rebuilds
