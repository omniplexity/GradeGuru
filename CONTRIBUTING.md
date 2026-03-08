# Contributing to GradeGuru

Thank you for your interest in contributing to GradeGuru! This document provides guidelines for contributing to the project. By participating in this project, you agree to abide by these guidelines.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Issue Reporting](#issue-reporting)

## Getting Started

### How to Contribute

1. **Fork the Repository**: Click the "Fork" button on the GitHub repository page to create your own copy of the repository.

2. **Clone Your Fork**: Clone your forked repository to your local machine.

   ```bash
   git clone https://github.com/YOUR-USERNAME/gradeguru.git
   cd gradeguru
   ```

3. **Create a Branch**: Create a new branch for your feature or bug fix.

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

4. **Make Changes**: Implement your feature or fix the bug. Follow the coding standards outlined below.

5. **Test Your Changes**: Ensure all tests pass and your changes don't break existing functionality.

6. **Commit Your Changes**: Write clear, descriptive commit messages following our guidelines.

7. **Push to Your Fork**: Push your changes to your forked repository.

   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request**: Open a pull request against the `main` branch of the original repository.

### Branch Naming Convention

Use descriptive branch names with the following prefixes:

- `feature/` - New features or functionality
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:
- `feature/add-model-support`
- `fix/chat-message-scroll`
- `docs/update-api-reference`

## Development Setup

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control

### Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

   This launches the Electron application in development mode with hot reloading enabled.

### Building for Production

To create a production build:

```bash
npm run build
```

The built executable will be generated in the `dist` folder.

### Running Tests

```bash
npm test
```

### Linting Code

```bash
npm run lint
```

## Coding Standards

### General Principles

- Write clean, readable, and maintainable code
- Follow the existing code style and conventions
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names
- Comment complex logic, not obvious code

### JavaScript Style Guide

This project follows [Airbnb's JavaScript Style Guide](https://github.com/airbnb/javascript) with some modifications enforced by ESLint.

Key points:

- **Indentation**: Use 2 spaces for indentation
- **Semicolons**: Always use semicolons
- **Quotes**: Use single quotes for strings, except when string contains single quotes
- **Variable Declarations**: Use `const` by default, `let` when reassignment is needed, never use `var`
- **Arrow Functions**: Prefer arrow functions for callbacks, but use function declarations for methods
- **Template Literals**: Use template literals for string interpolation

### Electron-Specific Guidelines

- **Main Process**: Place main process code in `src/main/`
- **Renderer Process**: Place renderer (UI) code in `src/renderer/`
- **Backend Services**: Place backend logic in `src/backend/`
- **Preload Scripts**: Use preload scripts for secure IPC communication between main and renderer
- **Context Isolation**: Always maintain context isolation and use `contextBridge` for exposing APIs

### Plugin Development

- Follow the plugin structure in `plugins/example-plugin/` as a reference
- Include a `manifest.json` with proper metadata
- Document all plugin APIs in the plugin's README

## Commit Message Guidelines

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements

### Examples

```
feat(chat): add message reaction support

fix(model-router): resolve timeout issue with Ollama provider

docs(readme): update installation instructions

refactor(plugin-manager): simplify plugin loading logic

test(chat): add unit tests for message parsing
```

### Best Practices

- Use imperative mood ("add" not "added" or "adds")
- Keep the subject line under 72 characters
- Capitalize the first letter of the description
- Don't end the subject line with a period
- Use the body to explain "what" and "why", not "how"
- Reference issues in the footer using `Closes #123` or `Fixes #456`

## Pull Request Process

### Before Submitting

1. **Run Tests**: Ensure all tests pass (`npm test`)
2. **Run Linter**: Fix any linting errors (`npm run lint`)
3. **Update Documentation**: Ensure documentation reflects your changes
4. **Rebase**: Rebase your branch on the latest `main` to avoid merge conflicts

### PR Title Format

Use the same format as commit messages:

```
<type>(<scope>): <description>
```

### PR Description

Include the following sections in your PR description:

1. **Summary**: Brief description of what this PR does
2. **Related Issues**: Reference any related issues (e.g., "Closes #123")
3. **Type of Change**: Mark all that apply:
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
4. **Testing**: Describe how you tested your changes
5. **Screenshots**: If applicable, include screenshots of UI changes

### Review Process

1. Maintainers will review your PR within 48 hours
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

### What Happens Next

- Your changes will be included in the next release
- You will be credited in the release notes

## Testing Requirements

### Running Tests

```bash
npm test
```

### Writing Tests

- All new features should include unit tests
- Bug fixes should include regression tests
- Test files should be placed in the `tests/` directory
- Follow the existing test structure in `tests/basic.test.js`

### Test Coverage

Aim for meaningful test coverage:
- Test core functionality thoroughly
- Test edge cases
- Test error handling

### Testing Best Practices

- Use descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern
- Keep tests independent and isolated
- Clean up any test data or mocks after tests complete

## Documentation Requirements

### When to Update Documentation

- Adding new features
- Changing existing functionality
- Fixing bugs that affect user-facing behavior
- Updating configuration options
- Adding new plugin APIs

### Documentation Types

1. **Code Comments**: Comment complex logic, explain "why" not "what"
2. **README Updates**: Update the main README for user-facing changes
3. **API Documentation**: Document any new APIs or changed interfaces
4. **Plugin Documentation**: Include documentation for new plugins

### Documentation Standards

- Use clear, concise language
- Include code examples where appropriate
- Keep documentation in sync with code changes
- Use proper markdown formatting

## Issue Reporting

### Before Submitting an Issue

1. Search existing issues to avoid duplicates
2. Try to reproduce the issue
3. Check if the issue has been fixed in a newer version

### Submitting a Bug Report

Include the following information:

- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Numbered list of steps to reproduce the bug
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: OS, Node.js version, Electron version
- **Screenshots**: If applicable, include screenshots
- **Logs**: Include any relevant error logs

### Submitting a Feature Request

Include the following information:

- **Description**: Clear description of the feature
- **Use Case**: Explain why this feature would be useful
- **Proposed Solution**: If you have ideas, describe them
- **Alternatives**: Any alternative solutions you've considered

## Questions?

If you have questions about contributing, feel free to:
- Open a discussion on GitHub Discussions
- Ask in the issue tracker
- Reach out to maintainers

Thank you for contributing to GradeGuru!
