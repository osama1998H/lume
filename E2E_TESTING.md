# E2E Testing with Playwright

This document describes how to set up, run, and write end-to-end (E2E) tests for the Lume application using Playwright.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

## Overview

Lume uses [Playwright](https://playwright.dev/) for end-to-end testing. Playwright provides reliable, fast, and capable automation for modern web apps.

### What We Test

- **Navigation**: Sidebar navigation, view switching, keyboard accessibility
- **Dashboard**: Stats display, activity overview, loading states
- **Settings**: Language switching (EN/AR), preferences, form validation
- **Theme**: Dark/light mode toggle, theme persistence, styling
- **Focus Mode**: Pomodoro timer functionality (future)
- **Time Tracking**: Activity tracking, manual entries (future)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- All project dependencies installed (`npm install`)

### Installation

Playwright and its dependencies are already installed as part of the project setup:

```bash
npm install
```

If you need to install browsers separately:

```bash
npx playwright install chromium
```

## Running Tests

### Available Commands

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests (step through)
npm run test:e2e:debug

# View HTML test report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/tests/navigation.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should display dashboard"

# Run a specific test by line number
npx playwright test e2e/tests/dashboard.spec.ts:10
```

### Watch Mode

Playwright doesn't have built-in watch mode, but you can use:

```bash
npx playwright test --ui
```

This opens an interactive UI where you can rerun tests on demand.

## Writing Tests

### Test Structure

Tests are organized in the `e2e/` directory:

```
e2e/
├── tests/           # Test files
│   ├── navigation.spec.ts
│   ├── dashboard.spec.ts
│   ├── settings.spec.ts
│   └── theme.spec.ts
├── fixtures/        # Test fixtures and setup
└── utils/           # Helper functions
    └── helpers.ts
```

### Creating a New Test

1. Create a new file in `e2e/tests/` with the `.spec.ts` extension
2. Import necessary utilities:

```typescript
import { test, expect } from '@playwright/test';
import { waitForAppLoad, navigateToView } from '../utils/helpers';
```

3. Write your tests:

```typescript
test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code here
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Using Helper Functions

The `e2e/utils/helpers.ts` file contains reusable helper functions:

```typescript
// Wait for app to load
await waitForAppLoad(page);

// Navigate to a specific view
await navigateToView(page, 'settings');

// Check dark mode
const darkMode = await isDarkMode(page);

// Toggle dark mode
await toggleDarkMode(page);

// Take screenshot
await takeScreenshot(page, 'my-screenshot');

// Wait for toast notification
await waitForToast(page, 'Settings saved');
```

### Assertions

Playwright provides powerful assertion methods:

```typescript
// Visibility
await expect(page.locator('h1')).toBeVisible();
await expect(page.locator('h1')).toBeHidden();

// Text content
await expect(page.locator('h1')).toContainText('Dashboard');
await expect(page.locator('h1')).toHaveText('Dashboard');

// Attributes
await expect(page.locator('button')).toHaveAttribute('disabled');
await expect(page.locator('input')).toHaveValue('test');

// Count
await expect(page.locator('li')).toHaveCount(5);

// State
await expect(page.locator('input')).toBeChecked();
await expect(page.locator('button')).toBeEnabled();
```

## Test Structure

### Test Lifecycle

```typescript
test.describe('Feature Tests', () => {
  // Runs once before all tests in this describe block
  test.beforeAll(async () => {
    // Setup code
  });

  // Runs before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Your tests
  test('test 1', async ({ page }) => {
    // Test code
  });

  // Runs after each test
  test.afterEach(async ({ page }) => {
    // Cleanup code
  });

  // Runs once after all tests
  test.afterAll(async () => {
    // Teardown code
  });
});
```

### Soft Assertions

Use soft assertions to continue test execution even if an assertion fails:

```typescript
await expect.soft(page.locator('h1')).toContainText('Dashboard');
await expect.soft(page.locator('h2')).toBeVisible();
// Test continues even if above fail
```

### Conditional Tests

Skip tests based on conditions:

```typescript
test('feature only on macOS', async ({ page }) => {
  test.skip(process.platform !== 'darwin', 'macOS only');
  // Test code
});
```

## Best Practices

### 1. Use Data Attributes

Add `data-testid` attributes to make tests more reliable:

```tsx
<button data-testid="save-button">Save</button>
```

```typescript
await page.click('[data-testid="save-button"]');
```

### 2. Wait for Actions to Complete

```typescript
// Wait for navigation
await page.click('text="Settings"');
await page.waitForLoadState('networkidle');

// Wait for element to be visible
await page.locator('h1').waitFor({ state: 'visible' });

// Wait for API calls
await page.waitForResponse(resp => resp.url().includes('/api/data'));
```

### 3. Use Descriptive Test Names

```typescript
// Good ✅
test('should display error message when form is submitted with empty fields', ...);

// Bad ❌
test('test form', ...);
```

### 4. Keep Tests Independent

Each test should be able to run independently:

```typescript
// Good ✅
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await setupTestData();
});

// Bad ❌ - Tests depend on each other
test('create item', ...);
test('edit item', ...); // Assumes item from previous test exists
```

### 5. Take Screenshots on Failure

This is configured automatically in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

## Troubleshooting

### Dev Server Not Starting

Make sure the dev server is running:

```bash
npm run dev:react
```

The Playwright config automatically starts it, but you can also run it manually.

### Tests Timing Out

Increase timeout in test or config:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // Test code
});
```

### Element Not Found

Use `page.locator()` with proper selectors:

```typescript
// Try different selectors
await page.locator('text="Dashboard"').click();
await page.locator('[aria-label="Dashboard"]').click();
await page.locator('button:has-text("Dashboard")').click();
```

### Tests Flaky

Add explicit waits:

```typescript
await page.waitForLoadState('networkidle');
await page.locator('h1').waitFor({ state: 'visible' });
```

### Docker/Container Issues

The MCP Docker Playwright browser runs in an isolated container and cannot access `localhost` on the host machine. To run tests:

1. **Run locally** (recommended):
   ```bash
   npm run test:e2e
   ```

2. **Use host IP** (if needed):
   - Find your local IP: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)
   - Update `baseURL` in `playwright.config.ts` to use your IP

3. **Deploy to a network-accessible URL** for container testing

## CI/CD Integration

### GitHub Actions

Example workflow (`.github/workflows/e2e-tests.yml`):

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build:react
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

Configure environment-specific settings:

```typescript
// playwright.config.ts
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
```

### Parallel Execution

For faster CI runs:

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : 1,
  fullyParallel: true,
});
```

## Test Coverage

Current test coverage:

- ✅ Navigation and routing
- ✅ Dashboard display and stats
- ✅ Settings and preferences
- ✅ Theme switching (dark/light mode)
- ⏳ Focus mode (Pomodoro timer)
- ⏳ Time tracking features
- ⏳ Goals and progress
- ⏳ Analytics and charts
- ⏳ Data export

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Electron Testing with Playwright](https://playwright.dev/docs/api/class-electron)

## Contributing

When adding new features:

1. Write E2E tests alongside your feature
2. Ensure tests pass locally
3. Add test coverage to this document
4. Update helper functions if needed

---

For questions or issues, please open an issue on GitHub or contact the team.
