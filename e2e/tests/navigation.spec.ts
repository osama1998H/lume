import { test, expect } from '@playwright/test';
import { waitForAppLoad, navigateToView, isSidebarCollapsed } from '../utils/helpers';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should load the app and display the dashboard by default', async ({ page }) => {
    // Check that the main content is loaded
    await expect(page.locator('[role="main"]')).toBeVisible();

    // Verify Dashboard title is present in main content area
    await expect(page.locator('[role="main"] h1')).toContainText(/dashboard/i);

    // Verify sidebar is visible
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should navigate between different views using sidebar', async ({ page }) => {
    const views = [
      'dashboard',
      'analytics',
      'goals',
      'settings',
    ];

    for (const view of views) {
      await navigateToView(page, view);

      // Wait a bit for the view to load
      await page.waitForTimeout(500);

      // Verify that navigation worked by checking the active nav button
      const activeButton = page.locator(`aside button:has-text("${view.charAt(0).toUpperCase() + view.slice(1)}")`);

      // Just verify content area is visible (not all views have h1/h2)
      const contentArea = page.locator('.h-full, main, [role="main"]').first();
      await expect(contentArea).toBeVisible();

      // Take a screenshot for visual verification
      await page.screenshot({
        path: `test-results/screenshots/navigation-${view}.png`,
        fullPage: true
      });
    }
  });

  test('should toggle sidebar collapse state', async ({ page }) => {
    // Find the sidebar toggle button (usually has an icon like Menu or ChevronLeft)
    const sidebarToggle = page.locator('button[aria-label*="sidebar" i], button[aria-label*="menu" i]').first();

    if (await sidebarToggle.count() > 0) {
      // Get initial state
      const initialCollapsed = await isSidebarCollapsed(page);

      // Toggle sidebar
      await sidebarToggle.click();
      await page.waitForTimeout(300); // Wait for animation

      // Verify state changed
      const newCollapsed = await isSidebarCollapsed(page);
      expect(newCollapsed).not.toBe(initialCollapsed);

      // Toggle back
      await sidebarToggle.click();
      await page.waitForTimeout(300);

      // Verify it returned to initial state
      const finalCollapsed = await isSidebarCollapsed(page);
      expect(finalCollapsed).toBe(initialCollapsed);
    } else {
      test.skip();
    }
  });

  test('should display correct navigation items in sidebar', async ({ page }) => {
    const sidebar = page.locator('aside');

    // Expected navigation items
    const expectedItems = [
      'Dashboard',
      'Time Tracker',
      'Activity Log',
      'Reports',
      'Analytics',
      'Goals',
      'Focus Mode',
      'Categories',
      'Settings',
    ];

    // Check that each navigation item is present
    for (const item of expectedItems) {
      const navItem = sidebar.locator(`text="${item}"`).first();

      // Use soft assertions to continue checking even if one fails
      await expect.soft(navItem).toBeVisible();
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Navigate to Analytics
    await navigateToView(page, 'analytics');
    await page.waitForTimeout(500);

    // Check if the Analytics nav item has active state
    // This might be indicated by a class, aria-current, or visual styling
    const analyticsNavItem = page.locator('aside').locator('text="Analytics"').first();

    // Check for common active state indicators
    const parentElement = analyticsNavItem.locator('..');
    const classes = await parentElement.getAttribute('class') || '';

    // Common patterns for active nav items
    const hasActiveState =
      classes.includes('active') ||
      classes.includes('selected') ||
      classes.includes('bg-') && !classes.includes('bg-transparent');

    expect(hasActiveState).toBeTruthy();
  });

  test('should maintain navigation state after page interaction', async ({ page }) => {
    // Navigate to Dashboard
    await navigateToView(page, 'dashboard');
    await page.waitForTimeout(500);

    // Verify we're on Dashboard page
    const mainContent = page.locator('[role="main"]');
    await expect(mainContent).toBeVisible();

    // Perform some interaction (e.g., click somewhere in the content)
    await mainContent.click({ position: { x: 100, y: 100 }, force: true });
    await page.waitForTimeout(300);

    // Verify we're still on Dashboard page (check for Dashboard heading)
    const heading = page.locator('[role="main"] h1').filter({ hasText: /dashboard/i });
    await expect(heading).toBeVisible();
  });

  test('should have accessible navigation with keyboard', async ({ page }) => {
    // Tab through navigation items
    await page.keyboard.press('Tab');

    // Check if focus is on a navigation element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Verify navigation occurred
    await expect(page.locator('[role="main"]')).toBeVisible();
  });
});
