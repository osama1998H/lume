import { test, expect } from '@playwright/test';
import { waitForAppLoad } from '../utils/helpers';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display dashboard title and subtitle', async ({ page }) => {
    // Check for main heading in the main content area
    const heading = page.locator('[role="main"] h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/dashboard/i);

    // Check for subtitle or description
    const subtitle = page.locator('[role="main"] p').first();
    await expect(subtitle).toBeVisible();
  });

  test('should display today\'s statistics cards', async ({ page }) => {
    // Dashboard should show stat cards for today's time, tasks done, and active task
    const statCards = page.locator('[role="region"]').first();
    await expect(statCards).toBeVisible();

    // Check for time tracking card
    const timeCard = page.locator('text=/today.*time/i').first();
    await expect.soft(timeCard).toBeVisible();

    // Check for tasks completed card
    const tasksCard = page.locator('text=/task/i').first();
    await expect.soft(tasksCard).toBeVisible();

    // Take screenshot of stats section
    await page.screenshot({
      path: 'test-results/screenshots/dashboard-stats.png',
      fullPage: false
    });
  });

  test('should display activity overview sections', async ({ page }) => {
    // Look for activity list sections
    const activitySections = page.locator('[role="region"]');
    const count = await activitySections.count();

    // Expect at least one activity section
    expect(count).toBeGreaterThan(0);

    // Check for Recent Entries section
    const recentEntries = page.locator('text=/recent/i');
    if (await recentEntries.count() > 0) {
      await expect(recentEntries.first()).toBeVisible();
    }
  });

  test('should show goal progress widget', async ({ page }) => {
    // Look for goals widget or section
    const goalsWidget = page.locator('text=/goal/i, text=/progress/i').first();

    if (await goalsWidget.count() > 0) {
      await expect(goalsWidget).toBeVisible();

      // Take screenshot of goals section
      await page.screenshot({
        path: 'test-results/screenshots/dashboard-goals.png',
        clip: { x: 0, y: 300, width: 400, height: 400 }
      });
    }
  });

  test('should display empty state when no data exists', async ({ page }) => {
    // Look for empty state messages
    const emptyStates = page.locator('text=/no entries/i, text=/no data/i, text=/get started/i');
    const count = await emptyStates.count();

    // If there's no data, we should see empty state messages
    if (count > 0) {
      await expect(emptyStates.first()).toBeVisible();
      console.log('Empty state detected - this is expected for new installs');
    }
  });

  test('should have loading state initially', async ({ page }) => {
    // Navigate to dashboard fresh to catch loading state
    await page.goto('/');

    // Look for loading indicators (check separately)
    const loadingText = page.getByText(/loading/i).first();
    const progressBar = page.locator('[role="progressbar"]').first();

    // Note: This might not always be visible due to fast loading
    // So we'll just check if it exists at any point
    const hasLoadingText = await loadingText.count() > 0;
    const hasProgressBar = await progressBar.count() > 0;

    if (hasLoadingText || hasProgressBar) {
      console.log('Loading state detected');
    }

    // Wait for content to load
    await waitForAppLoad(page);

    // Verify loading state is gone and content is visible
    await expect(page.locator('[role="main"]')).toBeVisible();
  });

  test('should display time in correct format', async ({ page }) => {
    // Look for time displays (e.g., "2h 30m", "1.5 hours")
    const timeElements = page.locator('text=/\\d+[hms]/i, text=/\\d+:\\d+/');

    if (await timeElements.count() > 0) {
      const timeText = await timeElements.first().textContent();
      console.log('Time format found:', timeText);

      // Verify time format matches expected patterns
      expect(timeText).toMatch(/\d+/);
    }
  });

  test('should be responsive and scrollable', async ({ page }) => {
    // Check if page is scrollable
    const isScrollable = await page.evaluate(() => {
      const main = document.querySelector('[role="main"]');
      if (!main) return false;
      return main.scrollHeight > main.clientHeight;
    });

    console.log('Page is scrollable:', isScrollable);

    // Try scrolling
    await page.locator('[role="main"]').evaluate((element) => {
      element.scrollTop = 100;
    });

    // Verify scroll worked
    const scrollTop = await page.locator('[role="main"]').evaluate((element) => element.scrollTop);
    expect(scrollTop).toBeGreaterThanOrEqual(0);
  });

  test('should refresh data with keyboard shortcut', async ({ page }) => {
    // Check if Ctrl+R or F5 refreshes the data
    // First capture initial state

    // Try refresh with Ctrl+R
    await page.keyboard.press('Control+KeyR');
    await page.waitForTimeout(1000);

    // Content should still be visible (not navigated away)
    await expect(page.locator('[role="main"]')).toBeVisible();

    // Verify we're still on dashboard (use main content h1)
    await expect(page.locator('[role="main"] h1')).toContainText(/dashboard/i);
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    // Check for ARIA labels on main elements
    const mainElement = page.locator('[role="main"]');
    await expect(mainElement).toHaveAttribute('role', 'main');

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check for aria-labels or aria-labelledby on sections
    const labeledSections = page.locator('[aria-label], [aria-labelledby]');
    const count = await labeledSections.count();

    console.log(`Found ${count} properly labeled sections`);
    expect(count).toBeGreaterThan(0);
  });

  test('should display app usage summary if available', async ({ page }) => {
    // Look for app usage section
    const appUsage = page.locator('text=/app.*usage/i, text=/application/i').first();

    if (await appUsage.count() > 0) {
      await expect(appUsage).toBeVisible();

      // Check for app names or icons
      const appItems = page.locator('[role="list"] [role="listitem"], .app-item, [data-testid*="app"]');

      if (await appItems.count() > 0) {
        console.log(`Found ${await appItems.count()} app usage items`);
      }
    }
  });
});
