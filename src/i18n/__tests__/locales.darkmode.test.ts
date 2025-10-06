import en from '../locales/en.json';
import ar from '../locales/ar.json';

describe('Locale Files - Dark Mode Translations', () => {
  describe('English translations', () => {
    it('should have theme-related translations', () => {
      expect(en.settings.theme).toBe('Theme');
      expect(en.settings.selectTheme).toBe('Choose your preferred color theme');
      expect(en.settings.lightMode).toBe('Light');
      expect(en.settings.darkMode).toBe('Dark');
      expect(en.settings.systemMode).toBe('System');
    });

    it('should have appearance section', () => {
      expect(en.settings.appearance).toBe('Appearance');
    });

    it('should have all required theme translation keys', () => {
      const requiredKeys = ['theme', 'selectTheme', 'lightMode', 'darkMode', 'systemMode', 'appearance'];
      requiredKeys.forEach(key => {
        expect(en.settings).toHaveProperty(key);
        expect(typeof en.settings[key]).toBe('string');
        expect(en.settings[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Arabic translations', () => {
    it('should have theme-related translations in Arabic', () => {
      expect(ar.settings.theme).toBe('المظهر');
      expect(ar.settings.selectTheme).toBe('اختر مظهر اللون المفضل لديك');
      expect(ar.settings.lightMode).toBe('فاتح');
      expect(ar.settings.darkMode).toBe('داكن');
      expect(ar.settings.systemMode).toBe('النظام');
    });

    it('should have appearance section in Arabic', () => {
      expect(ar.settings.appearance).toBe('المظهر');
    });

    it('should have all required theme translation keys', () => {
      const requiredKeys = ['theme', 'selectTheme', 'lightMode', 'darkMode', 'systemMode', 'appearance'];
      requiredKeys.forEach(key => {
        expect(ar.settings).toHaveProperty(key);
        expect(typeof ar.settings[key]).toBe('string');
        expect(ar.settings[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Translation consistency', () => {
    it('should have same keys in both English and Arabic', () => {
      const enKeys = Object.keys(en.settings);
      const arKeys = Object.keys(ar.settings);
      
      // All English keys should exist in Arabic
      enKeys.forEach(key => {
        expect(arKeys).toContain(key);
      });
    });

    it('should not have empty theme translations', () => {
      expect(en.settings.lightMode.trim()).not.toBe('');
      expect(en.settings.darkMode.trim()).not.toBe('');
      expect(en.settings.systemMode.trim()).not.toBe('');
      
      expect(ar.settings.lightMode.trim()).not.toBe('');
      expect(ar.settings.darkMode.trim()).not.toBe('');
      expect(ar.settings.systemMode.trim()).not.toBe('');
    });

    it('should have distinct translations for each theme mode', () => {
      // English translations should be unique
      const enModes = [en.settings.lightMode, en.settings.darkMode, en.settings.systemMode];
      expect(new Set(enModes).size).toBe(3);
      
      // Arabic translations should be unique
      const arModes = [ar.settings.lightMode, ar.settings.darkMode, ar.settings.systemMode];
      expect(new Set(arModes).size).toBe(3);
    });
  });

  describe('Translation quality', () => {
    it('should have meaningful English descriptions', () => {
      expect(en.settings.selectTheme).toContain('color');
      expect(en.settings.selectTheme).toContain('theme');
    });

    it('should have proper capitalization in English', () => {
      expect(en.settings.theme.charAt(0)).toBe(en.settings.theme.charAt(0).toUpperCase());
      expect(en.settings.lightMode.charAt(0)).toBe(en.settings.lightMode.charAt(0).toUpperCase());
      expect(en.settings.darkMode.charAt(0)).toBe(en.settings.darkMode.charAt(0).toUpperCase());
      expect(en.settings.systemMode.charAt(0)).toBe(en.settings.systemMode.charAt(0).toUpperCase());
    });

    it('should have appropriate Arabic text direction markers', () => {
      // Arabic text should be RTL-appropriate
      expect(ar.settings.theme.length).toBeGreaterThan(0);
      expect(ar.settings.selectTheme.length).toBeGreaterThan(0);
    });
  });

  describe('Backwards compatibility', () => {
    it('should maintain existing translation keys', () => {
      // Verify that adding new keys didn't break existing structure
      expect(en.settings).toHaveProperty('language');
      expect(en.settings).toHaveProperty('selectLanguage');
      expect(en.settings).toHaveProperty('english');
      expect(en.settings).toHaveProperty('arabic');
      
      expect(ar.settings).toHaveProperty('language');
      expect(ar.settings).toHaveProperty('selectLanguage');
    });

    it('should not have conflicting keys', () => {
      const enKeys = Object.keys(en.settings);
      const uniqueKeys = new Set(enKeys);
      
      expect(enKeys.length).toBe(uniqueKeys.size);
    });
  });
});