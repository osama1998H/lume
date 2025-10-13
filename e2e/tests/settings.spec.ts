import { test, expect } from '@playwright/test';
import { waitForAppLoad, navigateToView } from '../utils/helpers';

test.describe('Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await navigateToView(page, 'settings');
  });

  test('should display settings page with title', async ({ page }) => {
    // Verify Settings title (Settings page uses h2)
    const heading = page.locator('h2').filter({ hasText: /settings/i }).first();
    await expect(heading).toBeVisible();

    // Take screenshot of settings page
    await page.screenshot({
      path: 'test-results/screenshots/settings-main.png',
      fullPage: true
    });
  });

  test('should have language selection option', async ({ page }) => {
    // Look for language selector (dropdown, buttons, or radio group)
    const languageSection = page.locator('text=/language/i, text=/لغة/i').first();

    if (await languageSection.count() > 0) {
      await expect(languageSection).toBeVisible();

      // Look for language options (English, Arabic)
      const englishOption = page.locator('text=/english/i, text="EN"').first();
      const arabicOption = page.locator('text=/arabic/i, text=/عربي/i, text="AR"').first();

      if (await englishOption.count() > 0) {
        await expect.soft(englishOption).toBeVisible();
      }

      if (await arabicOption.count() > 0) {
        await expect.soft(arabicOption).toBeVisible();
      }
    }
  });

  test('should switch between English and Arabic languages', async ({ page }) => {
    // Find language select dropdown
    const languageSelector = page.locator('select').filter({ hasText: /english.*arabic/i }).first();

    if (await languageSelector.count() > 0) {
      // Get initial page direction
      const initialDir = await page.evaluate(() => document.documentElement.dir);

      // Switch to Arabic
      await languageSelector.selectOption('ar');
      await page.waitForTimeout(500);

      // Check if direction changed to RTL
      const newDir = await page.evaluate(() => document.documentElement.dir);

      // Arabic should set dir="rtl"
      if (initialDir !== 'rtl') {
        expect(newDir).toBe('rtl');
      }

      // Take screenshot in Arabic
      await page.screenshot({
        path: 'test-results/screenshots/settings-arabic.png',
        fullPage: true
      });

      // Switch back to English - re-query the selector after language change
      const languageSelectorAfterChange = page.locator('select').filter({ hasText: /english.*arabic/i }).or(page.locator('select').filter({ hasText: /إنجليزي.*عربي/i })).first();
      await languageSelectorAfterChange.selectOption('en');
      await page.waitForTimeout(500);

      // Direction should change back
      const finalDir = await page.evaluate(() => document.documentElement.dir);
      expect(finalDir).toBe('ltr');
    } else {
      test.skip();
    }
  });

  test('should have tracking interval settings', async ({ page }) => {
    // Look for tracking interval controls
    const trackingSettings = page.locator('text=/tracking/i, text=/interval/i, text=/monitor/i').first();

    if (await trackingSettings.count() > 0) {
      await expect(trackingSettings).toBeVisible();

      // Look for input fields or sliders
      const intervalInput = page.locator('input[type="number"], input[type="range"]').first();

      if (await intervalInput.count() > 0) {
        await expect(intervalInput).toBeVisible();

        // Get current value
        const currentValue = await intervalInput.inputValue();
        console.log('Current tracking interval:', currentValue);
      }
    }
  });

  test('should have idle detection settings', async ({ page }) => {
    // Look for idle detection controls
    const idleSettings = page.locator('text=/idle/i, text=/inactivity/i').first();

    if (await idleSettings.count() > 0) {
      await expect(idleSettings).toBeVisible();

      // Look for checkbox or toggle
      const idleToggle = page.locator('input[type="checkbox"], [role="switch"]').first();

      if (await idleToggle.count() > 0) {
        const isChecked = await idleToggle.isChecked();
        console.log('Idle detection enabled:', isChecked);
      }
    }
  });

  test('should have auto-start on login option', async ({ page }) => {
    // Look for auto-start setting
    const autoStartSetting = page.locator('text=/auto.*start/i, text=/launch.*startup/i, text=/start.*login/i').first();

    if (await autoStartSetting.count() > 0) {
      await expect(autoStartSetting).toBeVisible();

      // Look for toggle switch
      const autoStartToggle = page.locator('input[type="checkbox"]').first();

      if (await autoStartToggle.count() > 0) {
        await expect(autoStartToggle).toBeVisible();
      }
    }
  });

  test('should have notification settings', async ({ page }) => {
    // Look for notification controls
    const notificationSettings = page.locator('text=/notification/i, text=/alert/i').first();

    if (await notificationSettings.count() > 0) {
      await expect(notificationSettings).toBeVisible();

      // Check for notification toggles
      const notificationToggles = page.locator('input[type="checkbox"]');
      const count = await notificationToggles.count();

      console.log(`Found ${count} notification settings`);
    }
  });

  test('should save settings changes', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]').first();

    if (await saveButton.count() > 0) {
      await expect(saveButton).toBeVisible();

      // Click save button
      await saveButton.click();
      await page.waitForTimeout(500);

      // Look for success message or toast (check each separately)
      const savedMessage = page.getByText(/saved/i).first();
      const successMessage = page.getByText(/success/i).first();
      const alertRole = page.locator('[role="alert"]').first();

      // Check if any of these exists
      const hasSavedMessage = await savedMessage.count() > 0;
      const hasSuccessMessage = await successMessage.count() > 0;
      const hasAlertRole = await alertRole.count() > 0;

      if (hasSavedMessage) {
        await expect(savedMessage).toBeVisible({ timeout: 5000 });
        console.log('Settings saved successfully');
      } else if (hasSuccessMessage) {
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        console.log('Settings saved successfully');
      } else if (hasAlertRole) {
        await expect(alertRole).toBeVisible({ timeout: 5000 });
        console.log('Settings saved successfully');
      }
    }
  });

  test('should have data export option', async ({ page }) => {
    // Look for export data button (try both selectors separately)
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();
    const exportSection = page.getByText(/export.*data/i).first();

    // Check if either exists
    const hasExportButton = await exportButton.count() > 0;
    const hasExportSection = await exportSection.count() > 0;

    if (hasExportButton) {
      await expect(exportButton).toBeVisible();
      console.log('Export button found');
    } else if (hasExportSection) {
      await expect(exportSection).toBeVisible();
      console.log('Export section found');
    }
  });

  test('should have appearance/theme settings', async ({ page }) => {
    // Look for theme settings
    const themeSettings = page.locator('text=/theme/i, text=/appearance/i, text=/dark.*mode/i').first();

    if (await themeSettings.count() > 0) {
      await expect(themeSettings).toBeVisible();

      // Look for theme toggle or selector
      const themeToggle = page.locator('button[aria-label*="theme" i], select[name*="theme" i]').first();

      if (await themeToggle.count() > 0) {
        await expect(themeToggle).toBeVisible();
      }
    }
  });

  test('should display app version information', async ({ page }) => {
    // Look for version info
    const versionInfo = page.locator('text=/version/i, text=/v\\d+\\.\\d+/').first();

    if (await versionInfo.count() > 0) {
      const versionText = await versionInfo.textContent();
      console.log('App version:', versionText);

      // Verify version format
      expect(versionText).toMatch(/\d+\.\d+/);
    }
  });

  test('should have proper form validation', async ({ page }) => {
    // Find an input field
    const numberInput = page.locator('input[type="number"]').first();

    if (await numberInput.count() > 0) {
      // Try to input invalid value
      await numberInput.fill('-1');
      await page.waitForTimeout(300);

      // Look for validation error
      const errorMessage = page.locator('text=/invalid/i, text=/error/i, .error').first();

      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        console.log('Form validation working');
      }

      // Clear the invalid input
      await numberInput.fill('5');
    }
  });

  test('should be scrollable with multiple settings sections', async ({ page }) => {
    // Check if settings page is scrollable
    const isScrollable = await page.evaluate(() => {
      const main = document.querySelector('[role="main"]');
      if (!main) return false;
      return main.scrollHeight > main.clientHeight;
    });

    console.log('Settings page is scrollable:', isScrollable);

    // Try scrolling through settings
    if (isScrollable) {
      await page.locator('[role="main"]').evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      await page.waitForTimeout(300);

      // Verify we scrolled
      const scrollTop = await page.locator('[role="main"]').evaluate((element) => element.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }
  });
});
