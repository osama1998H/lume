import { test, expect } from '@playwright/test';
import { waitForAppLoad, navigateToTodos, createTodo, verifyTodoExists } from '../utils/helpers';

test.describe('Todos Simple Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should navigate to Todos page', async ({ page }) => {
    await navigateToTodos(page);

    // Verify heading
    const heading = page.locator('h1, h2').filter({ hasText: 'Todos' });
    await expect(heading).toBeVisible();

    // Verify create button
    const createButton = page.locator('button').filter({ hasText: /create/i });
    await expect(createButton).toBeVisible();
  });

  test('should create a simple todo', async ({ page }) => {
    await navigateToTodos(page);

    const todoTitle = `Test Todo ${Date.now()}`;

    await createTodo(page, {
      title: todoTitle,
    });

    // Wait a bit for the todo to appear
    await page.waitForTimeout(1000);

    // Verify todo exists
    const todoElement = page.locator(`text="${todoTitle}"`);
    await expect(todoElement).toBeVisible({ timeout: 5000 });
  });
});
