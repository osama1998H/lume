import i18n, { getDirection, isRTL, resources } from '../config';

describe('i18n configuration', () => {
  describe('getDirection', () => {
    it('should return "ltr" for English', () => {
      expect(getDirection('en')).toBe('ltr');
    });

    it('should return "rtl" for Arabic', () => {
      expect(getDirection('ar')).toBe('rtl');
    });

    it('should return "rtl" for Hebrew', () => {
      expect(getDirection('he')).toBe('rtl');
    });

    it('should return "rtl" for Farsi', () => {
      expect(getDirection('fa')).toBe('rtl');
    });

    it('should return "rtl" for Urdu', () => {
      expect(getDirection('ur')).toBe('rtl');
    });

    it('should return "ltr" for French', () => {
      expect(getDirection('fr')).toBe('ltr');
    });

    it('should return "ltr" for German', () => {
      expect(getDirection('de')).toBe('ltr');
    });

    it('should return "ltr" for Spanish', () => {
      expect(getDirection('es')).toBe('ltr');
    });

    it('should return "ltr" for unsupported languages', () => {
      expect(getDirection('xyz')).toBe('ltr');
    });

    it('should return "ltr" for empty string', () => {
      expect(getDirection('')).toBe('ltr');
    });

    it('should return "ltr" for undefined as any', () => {
      expect(getDirection(undefined as any)).toBe('ltr');
    });

    it('should handle language codes with region variants', () => {
      expect(getDirection('ar-SA')).toBe('ltr'); // Only base codes are checked
      expect(getDirection('en-US')).toBe('ltr');
    });
  });

  describe('isRTL', () => {
    it('should return false for English', () => {
      expect(isRTL('en')).toBe(false);
    });

    it('should return true for Arabic', () => {
      expect(isRTL('ar')).toBe(true);
    });

    it('should return true for Hebrew', () => {
      expect(isRTL('he')).toBe(true);
    });

    it('should return true for Farsi', () => {
      expect(isRTL('fa')).toBe(true);
    });

    it('should return true for Urdu', () => {
      expect(isRTL('ur')).toBe(true);
    });

    it('should return false for French', () => {
      expect(isRTL('fr')).toBe(false);
    });

    it('should return false for unsupported languages', () => {
      expect(isRTL('xyz')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isRTL('')).toBe(false);
    });

    it('should maintain consistency with getDirection', () => {
      const languages = ['en', 'ar', 'he', 'fa', 'ur', 'fr', 'de', 'es', 'xyz'];
      
      languages.forEach(lang => {
        const direction = getDirection(lang);
        const rtl = isRTL(lang);
        expect(rtl).toBe(direction === 'rtl');
      });
    });
  });

  describe('i18n instance', () => {
    it('should be properly initialized', () => {
      expect(i18n).toBeDefined();
      expect(i18n.isInitialized).toBe(true);
    });

    it('should have fallback language set to English', () => {
      const {fallbackLng} = i18n.options;
      expect(Array.isArray(fallbackLng) ? fallbackLng[0] : fallbackLng).toEqual('en');
    });

    it('should have interpolation escapeValue disabled', () => {
      expect(i18n.options.interpolation?.escapeValue).toBe(false);
    });

    // LanguageDetector tests skipped in test environment (not relevant for Node.js/Jest)

    it('should have English translations', () => {
      expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    });

    it('should have Arabic translations', () => {
      expect(i18n.hasResourceBundle('ar', 'translation')).toBe(true);
    });
  });

  describe('resources', () => {
    it('should include English translations', () => {
      expect(resources.en).toBeDefined();
      expect(resources.en.translation).toBeDefined();
    });

    it('should include Arabic translations', () => {
      expect(resources.ar).toBeDefined();
      expect(resources.ar.translation).toBeDefined();
    });

    it('should have app name in English', () => {
      expect(resources.en.translation.app.name).toBeDefined();
      expect(typeof resources.en.translation.app.name).toBe('string');
    });

    it('should have app name in Arabic', () => {
      expect(resources.ar.translation.app.name).toBeDefined();
      expect(typeof resources.ar.translation.app.name).toBe('string');
    });

    it('should have navigation items in English', () => {
      expect(resources.en.translation.navigation).toBeDefined();
      expect(resources.en.translation.navigation.dashboard).toBeDefined();
      expect(resources.en.translation.navigation.tracker).toBeDefined();
      expect(resources.en.translation.navigation.reports).toBeDefined();
      expect(resources.en.translation.navigation.settings).toBeDefined();
    });

    it('should have navigation items in Arabic', () => {
      expect(resources.ar.translation.navigation).toBeDefined();
      expect(resources.ar.translation.navigation.dashboard).toBeDefined();
      expect(resources.ar.translation.navigation.tracker).toBeDefined();
      expect(resources.ar.translation.navigation.reports).toBeDefined();
      expect(resources.ar.translation.navigation.settings).toBeDefined();
    });
  });

  describe('translation functionality', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('should translate simple keys', () => {
      const translated = i18n.t('app.name');
      expect(translated).toBe('Lume');
    });

    it('should translate nested keys', () => {
      const translated = i18n.t('navigation.dashboard');
      expect(translated).toBe('Dashboard');
    });

    it('should change language and translate', async () => {
      await i18n.changeLanguage('ar');
      const translated = i18n.t('app.name');
      expect(translated).toBe('لومي');
    });

    it('should fallback to English for missing translations', async () => {
      await i18n.changeLanguage('xyz');
      const translated = i18n.t('app.name');
      expect(translated).toBe('Lume');
    });

    it('should handle missing keys gracefully', () => {
      const translated = i18n.t('nonexistent.key');
      expect(translated).toContain('nonexistent.key');
    });
  });

  describe('edge cases', () => {
    it('should handle case-sensitive language codes', () => {
      expect(getDirection('AR')).toBe('ltr'); // Only lowercase is checked
      expect(getDirection('En')).toBe('ltr');
    });

    it('should handle null input gracefully', () => {
      expect(getDirection(null as any)).toBe('ltr');
      expect(isRTL(null as any)).toBe(false);
    });

    it('should handle numeric input gracefully', () => {
      expect(getDirection(123 as any)).toBe('ltr');
      expect(isRTL(123 as any)).toBe(false);
    });
  });
});