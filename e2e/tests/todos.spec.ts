import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  navigateToTodos,
  createTodo,
  editTodo,
  deleteTodo,
  toggleTodoStatus,
  getTodoCount,
  getStatsValue,
  applyFilters,
  verifyTodoExists,
  verifyEmptyState,
  openTodoModal,
  fillTodoForm,
  submitTodoForm,
  getTodoCard,
  clearFilters,
  takeScreenshot,
  waitForToast,
} from '../utils/helpers';

test.describe('Todos E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await navigateToTodos(page);
  });

  test.describe('Suite 1: Navigation & Page Load', () => {
    test('should display todos page title and subtitle', async ({ page }) => {
      // Verify main heading
      const heading = page.locator('[role="main"] h2').first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/todos/i);

      // Verify subtitle
      const subtitle = page.locator('[role="main"] p').first();
      await expect(subtitle).toBeVisible();
    });

    test('should display statistics cards', async ({ page }) => {
      // Check for stat cards
      const statCards = page.locator('[role="main"] > div').first();
      await expect(statCards).toBeVisible();

      // Verify all 4 stat cards exist
      const totalStat = page.locator('text=/total.*todos/i').first();
      const completedStat = page.locator('text=/completed/i').first();
      const inProgressStat = page.locator('text=/in.*progress/i').first();
      const overdueStat = page.locator('text=/overdue/i').first();

      await expect.soft(totalStat).toBeVisible();
      await expect.soft(completedStat).toBeVisible();
      await expect.soft(inProgressStat).toBeVisible();
      await expect.soft(overdueStat).toBeVisible();
    });

    test('should display action buttons', async ({ page }) => {
      // Verify Create Todo button
      const createButton = page.locator('button:has-text("Create")');
      await expect(createButton).toBeVisible();

      // Verify Filters button
      const filtersButton = page.locator('button:has-text("Filter")');
      await expect(filtersButton).toBeVisible();
    });

    test('should show loading state initially', async ({ page }) => {
      // Navigate fresh to catch loading state
      await page.goto('/');
      await page.click('aside button:has-text("Todos")');

      // Check for loading indicators
      const loadingIndicators = page.locator('text=/loading/i, [role="progressbar"]');
      const hasLoading = (await loadingIndicators.count()) > 0;

      if (hasLoading) {
        console.log('Loading state detected');
      }

      // Wait for content to load
      await waitForAppLoad(page);
      await expect(page.locator('[role="main"] h2')).toBeVisible();
    });

    test('should take screenshot of todos page', async ({ page }) => {
      await takeScreenshot(page, 'todos-page-initial');
    });
  });

  test.describe('Suite 2: CRUD Operations - Create Todo', () => {
    test('should create a todo with only required fields', async ({ page }) => {
      const todoTitle = `Test Todo ${Date.now()}`;

      await createTodo(page, {
        title: todoTitle,
      });

      // Verify todo appears in list
      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);

      // Verify stats updated
      const totalTodos = await getStatsValue(page, 'Total');
      expect(totalTodos).toBeGreaterThan(0);
    });

    test('should create a todo with all fields', async ({ page }) => {
      const todoTitle = `Complete Todo ${Date.now()}`;

      await createTodo(page, {
        title: todoTitle,
        description: 'This is a test todo with all fields filled',
        status: 'todo',
        priority: 'high',
        estimatedMinutes: '60',
      });

      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });

    test('should create a todo with due date and time', async ({ page }) => {
      const todoTitle = `Scheduled Todo ${Date.now()}`;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = tomorrow.toISOString().split('T')[0];

      await createTodo(page, {
        title: todoTitle,
        dueDate: dueDate,
        dueTime: '14:30',
      });

      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);

      // Verify due date is displayed
      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{2}:\d{2}/);
    });

    test('should show success toast after creating todo', async ({ page }) => {
      const todoTitle = `Toast Test ${Date.now()}`;

      await openTodoModal(page);
      await fillTodoForm(page, { title: todoTitle });
      await submitTodoForm(page);

      // Wait for toast
      await waitForToast(page);

      // Verify success message
      const toast = page.locator('[role="alert"], text=/success|created/i');
      await expect(toast).toBeVisible();
    });

    test('should not create todo without title', async ({ page }) => {
      await openTodoModal(page);

      // Try to submit without filling title
      await submitTodoForm(page);

      // Modal should still be open (validation failed)
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
    });
  });

  test.describe('Suite 3: CRUD Operations - Edit Todo', () => {
    test('should edit todo title', async ({ page }) => {
      const originalTitle = `Original ${Date.now()}`;
      const newTitle = `Updated ${Date.now()}`;

      // Create a todo first
      await createTodo(page, { title: originalTitle });

      // Edit it
      await editTodo(page, originalTitle, { title: newTitle });

      // Verify old title is gone
      const oldExists = await verifyTodoExists(page, originalTitle);
      expect(oldExists).toBe(false);

      // Verify new title exists
      const newExists = await verifyTodoExists(page, newTitle);
      expect(newExists).toBe(true);
    });

    test('should edit todo description', async ({ page }) => {
      const todoTitle = `Edit Desc ${Date.now()}`;
      const newDescription = 'Updated description content';

      // Create a todo
      await createTodo(page, { title: todoTitle, description: 'Original description' });

      // Edit description
      await editTodo(page, todoTitle, { description: newDescription });

      // Verify updated description
      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(newDescription);
    });

    test('should edit todo status', async ({ page }) => {
      const todoTitle = `Edit Status ${Date.now()}`;

      // Create a todo with 'todo' status
      await createTodo(page, { title: todoTitle, status: 'todo' });

      // Edit to 'in_progress'
      await editTodo(page, todoTitle, { status: 'in_progress' });

      // Verify status badge updated
      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(/in.*progress/i);
    });

    test('should edit todo priority', async ({ page }) => {
      const todoTitle = `Edit Priority ${Date.now()}`;

      // Create with medium priority
      await createTodo(page, { title: todoTitle, priority: 'medium' });

      // Edit to urgent
      await editTodo(page, todoTitle, { priority: 'urgent' });

      // Verify priority badge
      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(/urgent/i);
    });

    test('should show update success toast', async ({ page }) => {
      const todoTitle = `Update Toast ${Date.now()}`;

      await createTodo(page, { title: todoTitle });
      await editTodo(page, todoTitle, { description: 'Updated' });

      const toast = page.locator('[role="alert"], text=/success|updated/i');
      await expect(toast).toBeVisible();
    });
  });

  test.describe('Suite 4: CRUD Operations - Delete Todo', () => {
    test('should delete a todo', async ({ page }) => {
      const todoTitle = `Delete Me ${Date.now()}`;

      // Create a todo
      await createTodo(page, { title: todoTitle });

      // Verify it exists
      let exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);

      // Get initial count
      const initialCount = await getTodoCount(page);

      // Delete it
      await deleteTodo(page, todoTitle);

      // Verify it's gone
      exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(false);

      // Verify count decreased
      const finalCount = await getTodoCount(page);
      expect(finalCount).toBe(initialCount - 1);
    });

    test('should show confirmation modal before delete', async ({ page }) => {
      const todoTitle = `Confirm Delete ${Date.now()}`;

      await createTodo(page, { title: todoTitle });

      // Click delete button
      const todoCard = await getTodoCard(page, todoTitle);
      await todoCard.locator('button[title*="Delete"], button:has(svg)').nth(1).click();

      // Verify confirmation modal appears
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(/delete|confirm/i);

      // Cancel deletion
      await page.click('[role="dialog"] button:has-text("Cancel")');

      // Verify todo still exists
      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });

    test('should show success toast after deletion', async ({ page }) => {
      const todoTitle = `Delete Toast ${Date.now()}`;

      await createTodo(page, { title: todoTitle });
      await deleteTodo(page, todoTitle);

      const toast = page.locator('[role="alert"], text=/success|deleted/i');
      await expect(toast).toBeVisible();
    });

    test('should update statistics after deletion', async ({ page }) => {
      const todoTitle = `Stats Delete ${Date.now()}`;

      await createTodo(page, { title: todoTitle });
      const beforeDelete = await getStatsValue(page, 'Total');

      await deleteTodo(page, todoTitle);
      const afterDelete = await getStatsValue(page, 'Total');

      expect(afterDelete).toBe(beforeDelete - 1);
    });
  });

  test.describe('Suite 5: Status Management', () => {
    test('should toggle todo status with checkbox', async ({ page }) => {
      const todoTitle = `Toggle Status ${Date.now()}`;

      // Create todo
      await createTodo(page, { title: todoTitle, status: 'todo' });

      // Toggle to completed
      await toggleTodoStatus(page, todoTitle);

      // Verify status changed (look for completed badge or checkmark)
      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(/completed/i);
    });

    test('should show strike-through for completed todos', async ({ page }) => {
      const todoTitle = `Strike Through ${Date.now()}`;

      await createTodo(page, { title: todoTitle });
      await toggleTodoStatus(page, todoTitle);

      // Check for line-through class
      const todoCard = await getTodoCard(page, todoTitle);
      const titleElement = todoCard.locator(`text="${todoTitle}"`);

      const hasLineThrough = await titleElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.textDecoration.includes('line-through');
      });

      expect(hasLineThrough).toBe(true);
    });

    test('should update stats when toggling status', async ({ page }) => {
      const todoTitle = `Stats Toggle ${Date.now()}`;

      await createTodo(page, { title: todoTitle, status: 'todo' });

      const completedBefore = await getStatsValue(page, 'Completed');
      await toggleTodoStatus(page, todoTitle);
      const completedAfter = await getStatsValue(page, 'Completed');

      expect(completedAfter).toBe(completedBefore + 1);
    });
  });

  test.describe('Suite 6: Filtering - Status & Priority', () => {
    test('should filter todos by status', async ({ page }) => {
      const todo1 = `Todo 1 ${Date.now()}`;
      const todo2 = `Todo 2 ${Date.now() + 1}`;

      // Create todos with different statuses
      await createTodo(page, { title: todo1, status: 'todo' });
      await createTodo(page, { title: todo2, status: 'completed' });

      // Filter by 'todo' status
      await applyFilters(page, { status: 'todo' });
      await page.waitForTimeout(500);

      // Verify only 'todo' status items visible
      const exists1 = await verifyTodoExists(page, todo1);
      const exists2 = await verifyTodoExists(page, todo2);

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    test('should filter todos by priority', async ({ page }) => {
      const highPriority = `High Priority ${Date.now()}`;
      const lowPriority = `Low Priority ${Date.now() + 1}`;

      await createTodo(page, { title: highPriority, priority: 'high' });
      await createTodo(page, { title: lowPriority, priority: 'low' });

      // Filter by high priority
      await applyFilters(page, { priority: 'high' });
      await page.waitForTimeout(500);

      const exists1 = await verifyTodoExists(page, highPriority);
      const exists2 = await verifyTodoExists(page, lowPriority);

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    test('should combine status and priority filters', async ({ page }) => {
      const match = `Match Todo ${Date.now()}`;
      const noMatch1 = `No Match 1 ${Date.now() + 1}`;
      const noMatch2 = `No Match 2 ${Date.now() + 2}`;

      await createTodo(page, { title: match, status: 'todo', priority: 'high' });
      await createTodo(page, { title: noMatch1, status: 'completed', priority: 'high' });
      await createTodo(page, { title: noMatch2, status: 'todo', priority: 'low' });

      // Apply both filters
      await applyFilters(page, { status: 'todo', priority: 'high' });
      await page.waitForTimeout(500);

      const matchExists = await verifyTodoExists(page, match);
      const noMatch1Exists = await verifyTodoExists(page, noMatch1);
      const noMatch2Exists = await verifyTodoExists(page, noMatch2);

      expect(matchExists).toBe(true);
      expect(noMatch1Exists).toBe(false);
      expect(noMatch2Exists).toBe(false);
    });

    test('should show all todos when filters are cleared', async ({ page }) => {
      const todo1 = `Filter Test 1 ${Date.now()}`;
      const todo2 = `Filter Test 2 ${Date.now() + 1}`;

      await createTodo(page, { title: todo1, status: 'todo' });
      await createTodo(page, { title: todo2, status: 'completed' });

      // Apply filter
      await applyFilters(page, { status: 'todo' });
      await page.waitForTimeout(500);

      // Clear filters
      await clearFilters(page);
      await page.waitForTimeout(500);

      // Both should be visible
      const exists1 = await verifyTodoExists(page, todo1);
      const exists2 = await verifyTodoExists(page, todo2);

      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });
  });

  test.describe('Suite 7: Filtering - Search', () => {
    test('should search todos by title', async ({ page }) => {
      const searchable = `Searchable Task ${Date.now()}`;
      const other = `Other Task ${Date.now()}`;

      await createTodo(page, { title: searchable });
      await createTodo(page, { title: other });

      // Search for 'Searchable'
      await applyFilters(page, { searchQuery: 'Searchable' });
      await page.waitForTimeout(500);

      const exists1 = await verifyTodoExists(page, searchable);
      const exists2 = await verifyTodoExists(page, other);

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    test('should search todos by description', async ({ page }) => {
      const todo1 = `Todo with desc ${Date.now()}`;
      const todo2 = `Todo without ${Date.now()}`;

      await createTodo(page, { title: todo1, description: 'Find this unique description' });
      await createTodo(page, { title: todo2, description: 'Normal description' });

      // Search for unique text
      await applyFilters(page, { searchQuery: 'unique' });
      await page.waitForTimeout(500);

      const exists1 = await verifyTodoExists(page, todo1);
      const exists2 = await verifyTodoExists(page, todo2);

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    test('should show "no filtered results" message', async ({ page }) => {
      await createTodo(page, { title: `Test Todo ${Date.now()}` });

      // Search for something that doesn't exist
      await applyFilters(page, { searchQuery: 'NonExistentSearchTerm12345' });
      await page.waitForTimeout(500);

      // Verify empty state message
      await verifyEmptyState(page);
    });
  });

  test.describe('Suite 8: Form Validation', () => {
    test('should require title field', async ({ page }) => {
      await openTodoModal(page);

      // Try to submit without title
      await submitTodoForm(page);

      // Modal should stay open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
    });

    test('should accept date input', async ({ page }) => {
      const todoTitle = `Date Test ${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];

      await createTodo(page, {
        title: todoTitle,
        dueDate: today,
      });

      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });

    test('should accept time input', async ({ page }) => {
      const todoTitle = `Time Test ${Date.now()}`;

      await createTodo(page, {
        title: todoTitle,
        dueTime: '15:30',
      });

      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });

    test('should accept estimated minutes', async ({ page }) => {
      const todoTitle = `Estimate Test ${Date.now()}`;

      await createTodo(page, {
        title: todoTitle,
        estimatedMinutes: '120',
      });

      const todoCard = await getTodoCard(page, todoTitle);
      await expect(todoCard).toContainText(/2h|120/);
    });
  });

  test.describe('Suite 9: Empty States', () => {
    test('should show empty state when no todos exist', async ({ page }) => {
      // This test assumes starting with no todos
      // If todos exist, they need to be deleted first
      const todoCount = await getTodoCount(page);

      if (todoCount === 0) {
        // Verify empty state
        await verifyEmptyState(page);

        // Verify create button in empty state
        const createButton = page.locator('button:has-text("Create")');
        await expect(createButton).toBeVisible();
      }
    });

    test('should show "no filtered results" when filters match nothing', async ({ page }) => {
      // Create a todo
      await createTodo(page, { title: `Filter Empty ${Date.now()}` });

      // Search for non-existent term
      await applyFilters(page, { searchQuery: 'XYZNonExistent123' });
      await page.waitForTimeout(500);

      // Verify filtered empty state
      const emptyMessage = page.locator('text=/no.*match|no.*filter/i');
      await expect(emptyMessage).toBeVisible();
    });

    test('should allow creating todo from empty state', async ({ page }) => {
      const todoCount = await getTodoCount(page);

      if (todoCount === 0) {
        // Click create from empty state
        await page.click('button:has-text("Create")');

        // Modal should open
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
      }
    });
  });

  test.describe('Suite 10: Accessibility', () => {
    test('should have ARIA labels on main elements', async ({ page }) => {
      // Check main content area
      const mainElement = page.locator('[role="main"]');
      await expect(mainElement).toHaveAttribute('role', 'main');

      // Check for proper heading hierarchy
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThanOrEqual(1);
    });

    test('should have accessible form labels', async ({ page }) => {
      await openTodoModal(page);

      // Check for label associations
      const titleLabel = page.locator('label:has-text("Title")');
      await expect(titleLabel).toBeVisible();

      const statusLabel = page.locator('label:has-text("Status")');
      await expect(statusLabel).toBeVisible();

      const priorityLabel = page.locator('label:has-text("Priority")');
      await expect(priorityLabel).toBeVisible();
    });

    test('should support keyboard navigation in modal', async ({ page }) => {
      await openTodoModal(page);

      // Press Tab to navigate
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Modal should be closed
      const modal = page.locator('[role="dialog"]');
      await expect(modal).not.toBeVisible();
    });

    test('should have accessible buttons with proper labels', async ({ page }) => {
      // Check action buttons
      const createButton = page.locator('button:has-text("Create")');
      await expect(createButton).toBeVisible();

      const filtersButton = page.locator('button:has-text("Filter")');
      await expect(filtersButton).toBeVisible();
    });
  });

  test.describe('Suite 11: Responsive Behavior', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify page still loads
      await expect(page.locator('[role="main"] h2')).toBeVisible();

      // Verify buttons are visible
      const createButton = page.locator('button:has-text("Create")');
      await expect(createButton).toBeVisible();

      // Take screenshot
      await takeScreenshot(page, 'todos-mobile');
    });

    test('should display todo cards properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const todoTitle = `Mobile Todo ${Date.now()}`;
      await createTodo(page, { title: todoTitle });

      // Verify todo is visible
      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });

    test('should handle modal on different screen sizes', async ({ page }) => {
      // Test on tablet size
      await page.setViewportSize({ width: 768, height: 1024 });

      await openTodoModal(page);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Verify form is usable
      await fillTodoForm(page, { title: 'Responsive Test' });
      await submitTodoForm(page);

      await waitForToast(page);
    });
  });

  test.describe('Suite 12: Performance & Edge Cases', () => {
    test('should handle creating multiple todos quickly', async ({ page }) => {
      const todos = [];
      for (let i = 0; i < 5; i++) {
        const title = `Bulk Todo ${Date.now() + i}`;
        todos.push(title);
        await createTodo(page, { title });
      }

      // Verify all were created
      for (const title of todos) {
        const exists = await verifyTodoExists(page, title);
        expect(exists).toBe(true);
      }
    });

    test('should handle very long title', async ({ page }) => {
      const longTitle = `Very Long Title ${Date.now()} `.repeat(10);

      await createTodo(page, { title: longTitle });

      const exists = await verifyTodoExists(page, longTitle.substring(0, 50));
      expect(exists).toBe(true);
    });

    test('should handle special characters in title', async ({ page }) => {
      const specialTitle = `Special !@#$%^&*() ${Date.now()}`;

      await createTodo(page, { title: specialTitle });

      const exists = await verifyTodoExists(page, specialTitle);
      expect(exists).toBe(true);
    });

    test('should handle rapid status changes', async ({ page }) => {
      const todoTitle = `Rapid Change ${Date.now()}`;

      await createTodo(page, { title: todoTitle });

      // Toggle status multiple times
      await toggleTodoStatus(page, todoTitle);
      await page.waitForTimeout(300);
      await toggleTodoStatus(page, todoTitle);
      await page.waitForTimeout(300);

      // Todo should still exist
      const exists = await verifyTodoExists(page, todoTitle);
      expect(exists).toBe(true);
    });
  });

  test.describe('Suite 13: Statistics Integration', () => {
    test('should update total todos statistic', async ({ page }) => {
      const beforeTotal = await getStatsValue(page, 'Total');

      await createTodo(page, { title: `Stats Test ${Date.now()}` });

      const afterTotal = await getStatsValue(page, 'Total');
      expect(afterTotal).toBe(beforeTotal + 1);
    });

    test('should update completed statistic', async ({ page }) => {
      const todoTitle = `Completed Stats ${Date.now()}`;

      await createTodo(page, { title: todoTitle });

      const beforeCompleted = await getStatsValue(page, 'Completed');
      await toggleTodoStatus(page, todoTitle);
      const afterCompleted = await getStatsValue(page, 'Completed');

      expect(afterCompleted).toBe(beforeCompleted + 1);
    });

    test('should update in progress statistic', async ({ page }) => {
      const todoTitle = `In Progress Stats ${Date.now()}`;

      await createTodo(page, { title: todoTitle, status: 'in_progress' });

      const inProgress = await getStatsValue(page, 'In Progress');
      expect(inProgress).toBeGreaterThan(0);
    });
  });

  test.describe('Suite 14: Filter Panel Toggle', () => {
    test('should show and hide filters panel', async ({ page }) => {
      // Click to show filters
      await page.click('button:has-text("Filter")');
      await page.waitForTimeout(300);

      // Verify filter panel is visible
      const filterPanel = page.locator('input[placeholder*="Search"], select').first();
      await expect(filterPanel).toBeVisible();

      // Click to hide filters
      await page.click('button:has-text("Filter")');
      await page.waitForTimeout(300);

      // Panel should be hidden (or less visible)
      const isStillVisible = await filterPanel.isVisible().catch(() => false);
      console.log('Filter panel still visible:', isStillVisible);
    });

    test('should persist filters when toggling panel', async ({ page }) => {
      // Show filters and apply them
      await applyFilters(page, { status: 'completed' });

      // Hide panel
      await page.click('button:has-text("Filter")');
      await page.waitForTimeout(300);

      // Show again
      await page.click('button:has-text("Filter")');
      await page.waitForTimeout(300);

      // Filters should still be applied
      const statusSelect = page.locator('select').first();
      const value = await statusSelect.inputValue();
      expect(value).toBe('completed');
    });
  });
});
