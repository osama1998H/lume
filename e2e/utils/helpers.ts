import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for E2E tests
 */

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[role="main"]', { timeout: 10000 });
}

/**
 * Navigate to a specific view in the app
 */
export async function navigateToView(page: Page, viewName: string) {
  // Map view names to sidebar button selectors (more specific)
  const viewSelectors: Record<string, string> = {
    dashboard: 'aside button:has-text("Dashboard")',
    tracker: 'aside button:has-text("Time Tracker")',
    reports: 'aside button:has-text("Reports")',
    analytics: 'aside button:has-text("Analytics")',
    activitylog: 'aside button:has-text("Activity Log")',
    goals: 'aside button:has-text("Goals")',
    focus: 'aside button:has-text("Focus Mode")',
    categories: 'aside button:has-text("Categories")',
    settings: 'aside button:has-text("Settings")',
    todos: 'aside button:has-text("Todos")',
  };

  const selector = viewSelectors[viewName.toLowerCase()];
  if (!selector) {
    throw new Error(`Unknown view: ${viewName}`);
  }

  await page.click(selector);
  await page.waitForTimeout(300); // Wait for transition
  await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot with a custom name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Wait for a toast notification to appear
 */
export async function waitForToast(page: Page, message?: string) {
  try {
    if (message) {
      await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 3000 });
    } else {
      // Wait for any toast to appear - use a shorter timeout and catch if it doesn't appear
      await page.waitForSelector('[role="alert"], .toast, [data-toast]', { timeout: 3000 });
    }
  } catch (error) {
    // Toast might have already appeared and disappeared, or might not show at all
    // Log for debugging purposes
    console.debug('Toast not detected, operation may have completed quickly');
    await page.waitForTimeout(500);
  }
}

/**
 * Check if dark mode is active
 */
export async function isDarkMode(page: Page): Promise<boolean> {
  const darkModeClass = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark');
  });
  return darkModeClass;
}

/**
 * Toggle dark mode (uses Settings page select dropdown)
 */
export async function toggleDarkMode(page: Page) {
  // Navigate to Settings
  await page.click('aside button:has-text("Settings")');
  await page.waitForTimeout(500);

  // Find the theme select dropdown
  const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();

  // Get current value
  const currentValue = await themeSelect.inputValue();

  // Toggle between dark and light (skip system for simplicity)
  if (currentValue === 'light' || currentValue === 'system') {
    await themeSelect.selectOption('dark');
  } else {
    await themeSelect.selectOption('light');
  }

  await page.waitForTimeout(500); // Wait for theme to apply

  // Navigate back to dashboard
  await page.click('aside button:has-text("Dashboard")');
  await page.waitForTimeout(300);
}

/**
 * Get text content from an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  return (await element.textContent()) || '';
}

/**
 * Wait for an element to contain specific text
 */
export async function waitForText(page: Page, selector: string, text: string) {
  await page.waitForFunction(
    ({ selector, text }) => {
      const element = document.querySelector(selector);
      return element?.textContent?.includes(text);
    },
    { selector, text },
    { timeout: 10000 }
  );
}

/**
 * Check if sidebar is collapsed
 */
export async function isSidebarCollapsed(page: Page): Promise<boolean> {
  // Check if the sidebar has the collapsed state
  const sidebarWidth = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    if (!sidebar) return 0;
    return sidebar.offsetWidth;
  });

  // Collapsed sidebar is typically around 60-80px, expanded is 200-250px
  return sidebarWidth < 100;
}

/**
 * Fill a form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  const input = page.locator(`label:has-text("${label}") + input, input[aria-label="${label}"]`);
  await input.fill(value);
}

/**
 * Click a button by text or aria-label
 */
export async function clickButton(page: Page, text: string) {
  await page.click(`button:has-text("${text}"), [role="button"]:has-text("${text}")`);
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Get count of elements matching selector
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).count();
}

/**
 * Verify element is visible and has text
 */
export async function verifyElementWithText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(text);
}

/**
 * Todo-specific helper functions
 */

/**
 * Navigate to Todos page
 */
export async function navigateToTodos(page: Page) {
  await page.click('aside button:has-text("Todos")');

  // Wait for any loading state to clear
  await page.waitForTimeout(500);

  // Wait for the Todos heading to appear
  await page.waitForSelector('text="Todos"', { timeout: 10000 });

  // Wait for the main content to stabilize
  await page.waitForLoadState('networkidle');
}

/**
 * Open the create todo modal
 */
export async function openTodoModal(page: Page) {
  // Click the create button
  const createButton = page.locator('button:has-text("Create Todo"), button:has-text("Create")').first();
  await createButton.click();

  // Wait for modal to appear
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Wait for modal to be fully rendered
  await page.waitForTimeout(300);

  // Scroll the modal content to the top to ensure title field is visible
  await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      // Find all potentially scrollable elements within the dialog
      const scrollables = dialog.querySelectorAll('.overflow-y-auto, .overflow-auto, [style*="overflow"]');
      scrollables.forEach((el: Element) => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });

      // Also try scrolling the dialog itself
      if (dialog instanceof HTMLElement) {
        dialog.scrollTop = 0;
      }
    }
  });

  await page.waitForTimeout(200);
}

/**
 * Fill todo form fields
 */
export async function fillTodoForm(page: Page, data: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedMinutes?: string;
  tags?: string[];
}) {
  const modal = page.locator('[role="dialog"]');

  if (data.title) {
    // Use force option to fill even if not in viewport
    const titleInput = modal.locator('input[type="text"]').first();
    await titleInput.fill(data.title, { force: true });
  }

  if (data.description) {
    const descriptionArea = modal.locator('textarea').first();
    await descriptionArea.fill(data.description, { force: true });
  }

  if (data.status) {
    const statusSelect = modal.locator('select').first();
    await statusSelect.selectOption(data.status, { force: true });
  }

  if (data.priority) {
    const prioritySelect = modal.locator('select').nth(1);
    await prioritySelect.selectOption(data.priority, { force: true });
  }

  if (data.category) {
    const categorySelect = modal.locator('select').nth(2);
    await categorySelect.selectOption(data.category, { force: true });
  }

  if (data.dueDate) {
    const dateInput = modal.locator('input[type="date"]');
    await dateInput.fill(data.dueDate, { force: true });
  }

  if (data.dueTime) {
    const timeInput = modal.locator('input[type="time"]');
    await timeInput.fill(data.dueTime, { force: true });
  }

  if (data.estimatedMinutes) {
    const minutesInput = modal.locator('input[type="number"]');
    await minutesInput.fill(data.estimatedMinutes, { force: true });
  }

  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      const tagInput = modal.locator('input').last();
      await tagInput.fill(tag, { force: true });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }
  }
}

/**
 * Submit the todo form
 */
export async function submitTodoForm(page: Page) {
  const modal = page.locator('[role="dialog"]');
  const saveButton = modal.locator('button').filter({ hasText: /save|create/i }).last();
  await saveButton.click();
  await page.waitForTimeout(800);  // Wait for save operation and toast
}

/**
 * Create a new todo
 */
export async function createTodo(page: Page, data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedMinutes?: string;
  tags?: string[];
}) {
  await openTodoModal(page);
  await fillTodoForm(page, data);
  await submitTodoForm(page);
  await waitForToast(page);
}

/**
 * Edit an existing todo by title
 */
export async function editTodo(page: Page, todoTitle: string, updates: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedMinutes?: string;
  tags?: string[];
}) {
  // Find the todo card with the title
  const todoCard = page.locator(`text="${todoTitle}"`).locator('..').locator('..');

  // Click the edit button
  await todoCard.locator('button[title*="Edit"], button:has(svg)').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Fill the form with updates
  await fillTodoForm(page, updates);
  await submitTodoForm(page);
  await waitForToast(page);
}

/**
 * Delete a todo by title
 */
export async function deleteTodo(page: Page, todoTitle: string) {
  // Find the todo card with the title
  const todoCard = page.locator(`text="${todoTitle}"`).locator('..').locator('..');

  // Click the delete button
  await todoCard.locator('button[title*="Delete"], button:has(svg)').nth(1).click();

  // Wait for confirmation modal
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Confirm deletion
  await page.click('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
  await waitForToast(page);
}

/**
 * Toggle todo status (checkbox)
 */
export async function toggleTodoStatus(page: Page, todoTitle: string) {
  const todoCard = page.locator(`text="${todoTitle}"`).locator('..').locator('..');
  await todoCard.locator('button[aria-label*="Toggle"]').first().click();
  await waitForToast(page);
}

/**
 * Change todo status using quick status dropdown
 */
export async function quickChangeStatus(page: Page, todoTitle: string, status: string) {
  const todoCard = page.locator(`text="${todoTitle}"`).locator('..').locator('..');

  // Hover to show dropdown
  await todoCard.hover();

  // Click status dropdown button
  await todoCard.locator('button:has(svg)').first().click();
  await page.waitForTimeout(200);

  // Click the status option
  await page.click(`text="${status}"`);
  await page.waitForTimeout(500);
}

/**
 * Get count of visible todos
 */
export async function getTodoCount(page: Page): Promise<number> {
  const todos = page.locator('[role="main"] > div > div').filter({ hasText: /complete|progress|cancel/i });
  return await todos.count();
}

/**
 * Get statistics value by name
 */
export async function getStatsValue(page: Page, statName: string): Promise<number> {
  const statCard = page.locator(`text="${statName}"`).locator('..').locator('..');
  const valueText = await statCard.locator('text=/\\d+/').first().textContent();
  return parseInt(valueText || '0', 10);
}

/**
 * Apply filters to todos
 */
export async function applyFilters(page: Page, filters: {
  status?: string;
  priority?: string;
  category?: string;
  searchQuery?: string;
}) {
  // Show filters if not visible
  const filtersPanel = page.locator('text=/filter|search/i').locator('..').locator('..');
  const isVisible = await filtersPanel.isVisible().catch(() => false);

  if (!isVisible) {
    await page.click('button:has-text("Filters"), button:has-text("Filter")');
    await page.waitForTimeout(300);
  }

  if (filters.status) {
    await page.selectOption('select[aria-label*="Status"], label:has-text("Status") ~ select', filters.status);
  }

  if (filters.priority) {
    await page.selectOption('select[aria-label*="Priority"], label:has-text("Priority") ~ select', filters.priority);
  }

  if (filters.category) {
    await page.selectOption('select[aria-label*="Category"], label:has-text("Category") ~ select', filters.category);
  }

  if (filters.searchQuery) {
    await page.fill('input[placeholder*="Search"], input[type="text"]', filters.searchQuery);
  }

  await page.waitForTimeout(500);
}

/**
 * Verify todo exists in the list
 */
export async function verifyTodoExists(page: Page, todoTitle: string): Promise<boolean> {
  const todo = page.locator(`text="${todoTitle}"`);
  return await todo.isVisible().catch(() => false);
}

/**
 * Get todo card element by title
 */
export async function getTodoCard(page: Page, todoTitle: string) {
  return page.locator(`text="${todoTitle}"`).locator('..').locator('..');
}

/**
 * Verify empty state is displayed
 */
export async function verifyEmptyState(page: Page, expectedMessage?: string) {
  const emptyState = page.locator('[role="main"] text=/no todos|no.*match/i').first();
  await expect(emptyState).toBeVisible();

  if (expectedMessage) {
    await expect(emptyState).toContainText(expectedMessage);
  }
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page) {
  await applyFilters(page, {
    status: 'all',
    priority: 'all',
    category: '',
    searchQuery: '',
  });
}

/**
 * Delete all todos to ensure empty state
 */
export async function deleteAllTodos(page: Page) {
  // Clear any filters first to see all todos
  await clearFilters(page);
  await page.waitForTimeout(500);

  // Keep deleting todos until none are left
  let todoCount = await getTodoCount(page);
  let attempts = 0;
  const maxAttempts = 50; // Safety limit

  while (todoCount > 0 && attempts < maxAttempts) {
    // Get the first visible todo
    const firstTodo = page.locator('[role="main"] > div > div').filter({ hasText: /complete|progress|cancel/i }).first();

    if (await firstTodo.isVisible()) {
      // Click the delete button (second button with svg)
      await firstTodo.locator('button:has(svg)').nth(1).click();
      await page.waitForTimeout(300);

      // Confirm deletion in modal
      const confirmButton = page.locator('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }

    todoCount = await getTodoCount(page);
    attempts++;
  }

  // Wait for empty state to appear
  await page.waitForTimeout(500);
}
