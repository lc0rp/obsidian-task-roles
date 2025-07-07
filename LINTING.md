# Linting Setup

This project uses ESLint for TypeScript code quality and markdownlint for documentation formatting.

## Available Commands

### TypeScript Linting

- `npm run lint:ts` - Check TypeScript files for issues
- `npm run lint:ts:fix` - Automatically fix TypeScript issues where possible

### Markdown Linting

- `npm run lint:md` - Check markdown files for formatting issues
- `npm run lint:md:fix` - Automatically fix markdown formatting issues

### Combined Linting

- `npm run lint` - Run both TypeScript and markdown linting
- `npm run lint:fix` - Fix both TypeScript and markdown issues

## Integration

- **Build Process**: `npm run build` runs TypeScript linting before compilation
- **Version Management**: `npm run preversion` runs full linting before version bumps
- **Development**: Use `npm run lint:fix` to quickly resolve most formatting issues

## Configuration Files

- **ESLint**: `.eslintrc` - TypeScript-specific rules with strict configuration
- **markdownlint**: `.markdownlint.json` - 120-character line limit with sensible exceptions
- **ESLint Ignore**: `.eslintignore` - Excludes build artifacts and JavaScript files

## Current Status

TypeScript linting is enforced in the build process with only 2 warnings remaining (non-blocking).
Markdown linting is available for documentation quality but doesn't block builds. 