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
  if (message) {
    await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
  } else {
    // Wait for any toast to appear
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
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
