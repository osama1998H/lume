import { test, expect } from '@playwright/test';

test.describe('Todos Debug Tests', () => {
  test('should load app and check sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for main element
    await page.waitForSelector('[role="main"]', { timeout: 10000 });

    // Check if sidebar exists
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Log all button texts in sidebar
    const buttons = await sidebar.locator('button').all();
    console.log('Found', buttons.length, 'buttons in sidebar');

    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text}"`);
    }

    // Try to find Todos button
    const todosButton = sidebar.locator('button:has-text("Todos")');
    const todosCount = await todosButton.count();
    console.log('Todos button count:', todosCount);

    if (todosCount > 0) {
      console.log('Found Todos button, clicking it...');
      await todosButton.click();
      await page.waitForTimeout(1000);

      // Check what's in main
      const mainContent = await page.locator('[role="main"]').textContent();
      console.log('Main content after click:', mainContent?.substring(0, 200));
    }

    // Take a screenshot
    await page.screenshot({ path: 'test-results/screenshots/debug-sidebar.png', fullPage: true });
  });
});
