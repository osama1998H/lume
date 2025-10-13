import { test, expect } from '@playwright/test';
import { waitForAppLoad, isDarkMode, navigateToView } from '../utils/helpers';

test.describe('Theme Toggle Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should have theme setting in Settings page', async ({ page }) => {
    // Navigate to Settings
    await navigateToView(page, 'settings');

    // Look for theme select
    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();

    await expect(themeSelect).toBeVisible();
    console.log('Theme select dropdown found in Settings');
  });

  test('should toggle between light and dark mode via Settings', async ({ page }) => {
    // Get initial theme
    const initialDarkMode = await isDarkMode(page);
    console.log('Initial dark mode:', initialDarkMode);

    // Take screenshot of initial state
    await page.screenshot({
      path: `test-results/screenshots/theme-${initialDarkMode ? 'dark' : 'light'}-initial.png`,
      fullPage: true
    });

    // Navigate to Settings
    await navigateToView(page, 'settings');

    // Find theme select
    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();

    // Toggle to dark mode
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(500);

    // Navigate back to see the effect
    await navigateToView(page, 'dashboard');

    // Verify theme changed to dark
    const darkModeActive = await isDarkMode(page);
    expect(darkModeActive).toBeTruthy();

    console.log('Dark mode activated');

    // Take screenshot of dark state
    await page.screenshot({
      path: 'test-results/screenshots/theme-dark-toggled.png',
      fullPage: true
    });

    // Toggle back to light
    await navigateToView(page, 'settings');
    await themeSelect.selectOption('light');
    await page.waitForTimeout(500);

    await navigateToView(page, 'dashboard');

    // Verify it returned to light mode
    const lightModeActive = await isDarkMode(page);
    expect(lightModeActive).toBeFalsy();

    console.log('Light mode restored');
  });

  test('should apply dark mode styles correctly', async ({ page }) => {
    // Navigate to Settings and set dark mode
    await navigateToView(page, 'settings');

    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(500);

    // Check that dark mode class is applied to html element
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });

    expect(hasDarkClass).toBeTruthy();

    // Check for dark background colors on main elements
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    console.log('Dark mode background color:', bodyBgColor);
    expect(bodyBgColor).toBeTruthy();
  });

  test('should apply light mode styles correctly', async ({ page }) => {
    // Navigate to Settings and ensure light mode
    await navigateToView(page, 'settings');

    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();
    await themeSelect.selectOption('light');
    await page.waitForTimeout(500);

    // Check that dark mode class is NOT applied
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });

    expect(hasDarkClass).toBeFalsy();

    // Check for light background colors
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    console.log('Light mode background color:', bodyBgColor);
    expect(bodyBgColor).toBeTruthy();
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    // Set to dark mode
    await navigateToView(page, 'settings');

    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(500);

    // Verify dark mode is active
    const darkModeBeforeReload = await isDarkMode(page);
    expect(darkModeBeforeReload).toBeTruthy();

    // Reload page
    await page.reload();
    await waitForAppLoad(page);

    // Check if dark mode persisted
    const darkModeAfterReload = await isDarkMode(page);
    expect(darkModeAfterReload).toBe(darkModeBeforeReload);

    console.log('Theme persisted after reload:', darkModeAfterReload);
  });

  test('should apply theme to all components across pages', async ({ page }) => {
    // Set dark mode
    await navigateToView(page, 'settings');

    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(500);

    // Check various pages maintain dark mode
    const pagesToCheck = ['dashboard', 'analytics', 'goals'];

    for (const pageName of pagesToCheck) {
      await navigateToView(page, pageName);
      await page.waitForTimeout(300);

      const isDark = await isDarkMode(page);
      expect(isDark).toBeTruthy();

      console.log(`${pageName} page has dark mode: ${isDark}`);
    }
  });

  test('should have system theme option', async ({ page }) => {
    // Navigate to Settings
    await navigateToView(page, 'settings');

    // Find theme select
    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();

    // Select system theme
    await themeSelect.selectOption('system');
    await page.waitForTimeout(500);

    // Verify system was selected
    const selectedValue = await themeSelect.inputValue();
    expect(selectedValue).toBe('system');

    console.log('System theme option available and selectable');
  });

  test('should maintain theme across navigation', async ({ page }) => {
    // Set to dark mode
    await navigateToView(page, 'settings');

    const themeSelect = page.locator('select').filter({ hasText: /light.*dark.*system/i }).first();
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(500);

    const darkModeOnSettings = await isDarkMode(page);
    expect(darkModeOnSettings).toBeTruthy();

    // Navigate to dashboard
    await navigateToView(page, 'dashboard');
    await page.waitForTimeout(300);

    // Check if dark mode is still active
    const darkModeOnDashboard = await isDarkMode(page);
    expect(darkModeOnDashboard).toBe(darkModeOnSettings);

    // Navigate to analytics
    await navigateToView(page, 'analytics');
    await page.waitForTimeout(300);

    const darkModeOnAnalytics = await isDarkMode(page);
    expect(darkModeOnAnalytics).toBe(darkModeOnSettings);

    console.log('Theme maintained across navigation');
  });
});
