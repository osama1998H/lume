// eslint-disable-next-line @typescript-eslint/no-require-imports
const enLocale = require('../locales/en.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const arLocale = require('../locales/ar.json');

describe('Theme Locale Keys', () => {
  describe('English Locale (en.json)', () => {
    it('should have all required theme keys', () => {
      expect(enLocale.settings).toBeDefined();
      expect(enLocale.settings.theme).toBeDefined();
      expect(enLocale.settings.selectTheme).toBeDefined();
      expect(enLocale.settings.lightMode).toBeDefined();
      expect(enLocale.settings.darkMode).toBeDefined();
      expect(enLocale.settings.systemMode).toBeDefined();
    });

    it('should have non-empty theme translation values', () => {
      expect(enLocale.settings.theme).toBeTruthy();
      expect(enLocale.settings.theme.length).toBeGreaterThan(0);
      
      expect(enLocale.settings.selectTheme).toBeTruthy();
      expect(enLocale.settings.selectTheme.length).toBeGreaterThan(0);
      
      expect(enLocale.settings.lightMode).toBeTruthy();
      expect(enLocale.settings.lightMode.length).toBeGreaterThan(0);
      
      expect(enLocale.settings.darkMode).toBeTruthy();
      expect(enLocale.settings.darkMode.length).toBeGreaterThan(0);
      
      expect(enLocale.settings.systemMode).toBeTruthy();
      expect(enLocale.settings.systemMode.length).toBeGreaterThan(0);
    });

    it('should have meaningful theme descriptions', () => {
      expect(enLocale.settings.theme).toBe('Theme');
      expect(enLocale.settings.lightMode).toBe('Light');
      expect(enLocale.settings.darkMode).toBe('Dark');
      expect(enLocale.settings.systemMode).toBe('System');
    });

    it('should have descriptive helper text for theme selection', () => {
      expect(enLocale.settings.selectTheme).toContain('theme');
    });
  });

  describe('Arabic Locale (ar.json)', () => {
    it('should have all required theme keys matching English', () => {
      expect(arLocale.settings).toBeDefined();
      expect(arLocale.settings.theme).toBeDefined();
      expect(arLocale.settings.selectTheme).toBeDefined();
      expect(arLocale.settings.lightMode).toBeDefined();
      expect(arLocale.settings.darkMode).toBeDefined();
      expect(arLocale.settings.systemMode).toBeDefined();
    });

    it('should have non-empty Arabic theme translation values', () => {
      expect(arLocale.settings.theme).toBeTruthy();
      expect(arLocale.settings.theme.length).toBeGreaterThan(0);
      
      expect(arLocale.settings.selectTheme).toBeTruthy();
      expect(arLocale.settings.selectTheme.length).toBeGreaterThan(0);
      
      expect(arLocale.settings.lightMode).toBeTruthy();
      expect(arLocale.settings.lightMode.length).toBeGreaterThan(0);
      
      expect(arLocale.settings.darkMode).toBeTruthy();
      expect(arLocale.settings.darkMode.length).toBeGreaterThan(0);
      
      expect(arLocale.settings.systemMode).toBeTruthy();
      expect(arLocale.settings.systemMode.length).toBeGreaterThan(0);
    });

    it('should use Arabic text for theme translations', () => {
      // Verify Arabic characters are used
      expect(/[\u0600-\u06FF]/.test(arLocale.settings.theme)).toBe(true);
      expect(/[\u0600-\u06FF]/.test(arLocale.settings.lightMode)).toBe(true);
      expect(/[\u0600-\u06FF]/.test(arLocale.settings.darkMode)).toBe(true);
      expect(/[\u0600-\u06FF]/.test(arLocale.settings.systemMode)).toBe(true);
    });

    it('should have expected Arabic translations', () => {
      expect(arLocale.settings.theme).toBe('المظهر');
      expect(arLocale.settings.lightMode).toBe('فاتح');
      expect(arLocale.settings.darkMode).toBe('داكن');
      expect(arLocale.settings.systemMode).toBe('النظام');
    });
  });

  describe('Locale Consistency', () => {
    it('should have the same theme keys in both locales', () => {
      const enThemeKeys = [
        'theme',
        'selectTheme',
        'lightMode',
        'darkMode',
        'systemMode',
      ];
      
      enThemeKeys.forEach(key => {
        expect(enLocale.settings).toHaveProperty(key);
        expect(arLocale.settings).toHaveProperty(key);
      });
    });

    it('should have all new theme keys in settings section', () => {
      const newThemeKeys = ['theme', 'selectTheme', 'lightMode', 'darkMode', 'systemMode'];
      
      newThemeKeys.forEach(key => {
        expect(enLocale.settings).toHaveProperty(key);
        expect(arLocale.settings).toHaveProperty(key);
      });
    });

    it('should not have duplicate theme keys', () => {
      const enSettingsKeys = Object.keys(enLocale.settings);
      const uniqueKeys = new Set(enSettingsKeys);
      expect(enSettingsKeys.length).toBe(uniqueKeys.size);
      
      const arSettingsKeys = Object.keys(arLocale.settings);
      const uniqueArKeys = new Set(arSettingsKeys);
      expect(arSettingsKeys.length).toBe(uniqueArKeys.size);
    });
  });

  describe('Theme Key Types', () => {
    it('should have string type for all theme values in English', () => {
      expect(typeof enLocale.settings.theme).toBe('string');
      expect(typeof enLocale.settings.selectTheme).toBe('string');
      expect(typeof enLocale.settings.lightMode).toBe('string');
      expect(typeof enLocale.settings.darkMode).toBe('string');
      expect(typeof enLocale.settings.systemMode).toBe('string');
    });

    it('should have string type for all theme values in Arabic', () => {
      expect(typeof arLocale.settings.theme).toBe('string');
      expect(typeof arLocale.settings.selectTheme).toBe('string');
      expect(typeof arLocale.settings.lightMode).toBe('string');
      expect(typeof arLocale.settings.darkMode).toBe('string');
      expect(typeof arLocale.settings.systemMode).toBe('string');
    });
  });

  describe('Locale File Structure', () => {
    it('should have valid JSON structure for English locale', () => {
      expect(enLocale).toBeDefined();
      expect(typeof enLocale).toBe('object');
      expect(enLocale.settings).toBeDefined();
    });

    it('should have valid JSON structure for Arabic locale', () => {
      expect(arLocale).toBeDefined();
      expect(typeof arLocale).toBe('object');
      expect(arLocale.settings).toBeDefined();
    });

    it('should maintain existing locale structure with new keys', () => {
      // Verify existing keys still exist
      expect(enLocale.settings.language).toBeDefined();
      expect(enLocale.settings.general).toBeDefined();
      
      expect(arLocale.settings.language).toBeDefined();
      expect(arLocale.settings.general).toBeDefined();
    });
  });
});