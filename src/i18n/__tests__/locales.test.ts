import en from '../locales/en.json';
import ar from '../locales/ar.json';

describe('Locale Files', () => {
  describe('Structure validation', () => {
    it('English locale should have valid structure', () => {
      expect(en).toBeDefined();
      expect(typeof en).toBe('object');
    });

    it('Arabic locale should have valid structure', () => {
      expect(ar).toBeDefined();
      expect(typeof ar).toBe('object');
    });

    it('Both locales should have the same top-level keys', () => {
      const enKeys = Object.keys(en).sort();
      const arKeys = Object.keys(ar).sort();
      expect(enKeys).toEqual(arKeys);
    });
  });

  describe('Required sections', () => {
    const requiredSections = ['app', 'navigation', 'dashboard', 'timeTracker', 'reports', 'settings', 'common', 'errors'];

    requiredSections.forEach(section => {
      it('English should have ' + section + ' section', () => {
        expect(en).toHaveProperty(section);
        expect(typeof (en as any)[section]).toBe('object');
      });

      it('Arabic should have ' + section + ' section', () => {
        expect(ar).toHaveProperty(section);
        expect(typeof (ar as any)[section]).toBe('object');
      });
    });
  });

  describe('Key parity between locales', () => {
    const checkKeyParity = (obj1: any, obj2: any, path: string = '') => {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();

      expect(keys1).toEqual(keys2);

      keys1.forEach(key => {
        const newPath = path ? path + '.' + key : key;

        if (typeof obj1[key] === 'object' && obj1[key] !== null) {
          checkKeyParity(obj1[key], obj2[key], newPath);
        } else {
          expect(typeof obj1[key]).toBe(typeof obj2[key]);
        }
      });
    };

    it('should have matching keys in all sections', () => {
      checkKeyParity(en, ar);
    });
  });

  describe('App section', () => {
    it('should have required app keys in English', () => {
      expect(en.app).toHaveProperty('name');
      expect(en.app).toHaveProperty('tagline');
    });

    it('should have required app keys in Arabic', () => {
      expect(ar.app).toHaveProperty('name');
      expect(ar.app).toHaveProperty('tagline');
    });

    it('should have non-empty app values', () => {
      expect(en.app.name).toBeTruthy();
      expect(en.app.tagline).toBeTruthy();
      expect(ar.app.name).toBeTruthy();
      expect(ar.app.tagline).toBeTruthy();
    });
  });

  describe('Navigation section', () => {
    const navKeys = ['dashboard', 'tracker', 'reports', 'settings'];

    navKeys.forEach(key => {
      it('should have ' + key + ' navigation item in English', () => {
        expect(en.navigation).toHaveProperty(key);
        expect(typeof en.navigation[key as keyof typeof en.navigation]).toBe('string');
        expect(en.navigation[key as keyof typeof en.navigation]).toBeTruthy();
      });

      it('should have ' + key + ' navigation item in Arabic', () => {
        expect(ar.navigation).toHaveProperty(key);
        expect(typeof ar.navigation[key as keyof typeof ar.navigation]).toBe('string');
        expect(ar.navigation[key as keyof typeof ar.navigation]).toBeTruthy();
      });
    });
  });

  describe('Dashboard section', () => {
    const dashboardKeys = [
      'title', 'subtitle', 'todayTime', 'tasksDone', 'activeTask',
      'noActiveTask', 'recentEntries', 'appUsageSummary', 'noEntries',
      'noAppUsage', 'active'
    ];

    dashboardKeys.forEach(key => {
      it('should have ' + key + ' in English dashboard', () => {
        expect(en.dashboard).toHaveProperty(key);
        expect(typeof en.dashboard[key as keyof typeof en.dashboard]).toBe('string');
      });

      it('should have ' + key + ' in Arabic dashboard', () => {
        expect(ar.dashboard).toHaveProperty(key);
        expect(typeof ar.dashboard[key as keyof typeof ar.dashboard]).toBe('string');
      });
    });
  });

  describe('Settings section', () => {
    it('should have language options in English', () => {
      expect(en.settings).toHaveProperty('language');
      expect(en.settings).toHaveProperty('english');
      expect(en.settings).toHaveProperty('arabic');
      expect(en.settings).toHaveProperty('selectLanguage');
    });

    it('should have language options in Arabic', () => {
      expect(ar.settings).toHaveProperty('language');
      expect(ar.settings).toHaveProperty('english');
      expect(ar.settings).toHaveProperty('arabic');
      expect(ar.settings).toHaveProperty('selectLanguage');
    });

    it('should have proper Arabic language display names', () => {
      expect(ar.settings.arabic).toContain('العربية');
      expect(ar.settings.english).toContain('English');
    });

    it('should have proper English language display names', () => {
      expect(en.settings.english).toBe('English');
      expect(en.settings.arabic).toContain('العربية');
    });
  });

  describe('Common section', () => {
    const commonKeys = [
      'save', 'cancel', 'delete', 'edit', 'close', 'loading',
      'error', 'success', 'confirm', 'hours', 'minutes', 'seconds',
      'h', 'm', 's'
    ];

    commonKeys.forEach(key => {
      it('should have ' + key + ' in English common', () => {
        expect(en.common).toHaveProperty(key);
        expect(typeof en.common[key as keyof typeof en.common]).toBe('string');
      });

      it('should have ' + key + ' in Arabic common', () => {
        expect(ar.common).toHaveProperty(key);
        expect(typeof ar.common[key as keyof typeof ar.common]).toBe('string');
      });
    });
  });

  describe('Errors section', () => {
    const errorKeys = ['somethingWentWrong', 'tryAgain', 'refreshPage', 'unexpectedError'];

    errorKeys.forEach(key => {
      it('should have ' + key + ' error message in English', () => {
        expect(en.errors).toHaveProperty(key);
        expect(typeof en.errors[key as keyof typeof en.errors]).toBe('string');
        expect(en.errors[key as keyof typeof en.errors]).toBeTruthy();
      });

      it('should have ' + key + ' error message in Arabic', () => {
        expect(ar.errors).toHaveProperty(key);
        expect(typeof ar.errors[key as keyof typeof ar.errors]).toBe('string');
        expect(ar.errors[key as keyof typeof ar.errors]).toBeTruthy();
      });
    });
  });

  describe('Value validation', () => {
    it('should not have empty string values in English', () => {
      const checkNoEmptyStrings = (obj: any, path: string = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? path + '.' + key : key;
          if (typeof value === 'string') {
            expect(value).not.toBe('');
          } else if (typeof value === 'object' && value !== null) {
            checkNoEmptyStrings(value, currentPath);
          }
        });
      };

      checkNoEmptyStrings(en);
    });

    it('should not have empty string values in Arabic', () => {
      const checkNoEmptyStrings = (obj: any, path: string = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? path + '.' + key : key;
          if (typeof value === 'string') {
            expect(value).not.toBe('');
          } else if (typeof value === 'object' && value !== null) {
            checkNoEmptyStrings(value, currentPath);
          }
        });
      };

      checkNoEmptyStrings(ar);
    });

    it('should not have placeholder values in English', () => {
      const checkNoPlaceholders = (obj: any) => {
        Object.values(obj).forEach(value => {
          if (typeof value === 'string') {
            expect(value).not.toMatch(/TODO|FIXME|XXX/i);
          } else if (typeof value === 'object' && value !== null) {
            checkNoPlaceholders(value);
          }
        });
      };

      checkNoPlaceholders(en);
    });

    it('should not have placeholder values in Arabic', () => {
      const checkNoPlaceholders = (obj: any) => {
        Object.values(obj).forEach(value => {
          if (typeof value === 'string') {
            expect(value).not.toMatch(/TODO|FIXME|XXX/i);
          } else if (typeof value === 'object' && value !== null) {
            checkNoPlaceholders(value);
          }
        });
      };

      checkNoPlaceholders(ar);
    });
  });

  describe('TimeTracker section', () => {
    const trackerKeys = [
      'title', 'subtitle', 'taskName', 'taskPlaceholder', 'category',
      'categoryPlaceholder', 'startTracking', 'stopTracking', 'currentSession',
      'noActiveSession', 'startSession', 'recentSessions', 'noSessions'
    ];

    trackerKeys.forEach(key => {
      it('should have ' + key + ' in English timeTracker', () => {
        expect(en.timeTracker).toHaveProperty(key);
      });

      it('should have ' + key + ' in Arabic timeTracker', () => {
        expect(ar.timeTracker).toHaveProperty(key);
      });
    });
  });

  describe('Reports section', () => {
    const reportKeys = [
      'title', 'subtitle', 'timePeriod', 'today', 'week', 'month',
      'totalTime', 'avgSessionTime', 'totalSessions', 'timeByCategory',
      'topApplications', 'topWebsites', 'noData', 'noCategories',
      'noApplications', 'noWebsites'
    ];

    reportKeys.forEach(key => {
      it('should have ' + key + ' in English reports', () => {
        expect(en.reports).toHaveProperty(key);
      });

      it('should have ' + key + ' in Arabic reports', () => {
        expect(ar.reports).toHaveProperty(key);
      });
    });
  });

  describe('Character encoding', () => {
    it('should have proper Arabic characters', () => {
      const arabicText = ar.app.name;
      // Check for Arabic Unicode range
      expect(arabicText).toMatch(/[\u0600-\u06FF]/);
    });

    it('should not have mojibake or encoding issues in Arabic', () => {
      const checkEncoding = (obj: any) => {
        Object.values(obj).forEach(value => {
          if (typeof value === 'string') {
            // Check for common encoding issue indicators
            expect(value).not.toMatch(/Ã|â€|Ã¢â‚¬/);
          } else if (typeof value === 'object' && value !== null) {
            checkEncoding(value);
          }
        });
      };

      checkEncoding(ar);
    });
  });

  describe('Consistency checks', () => {
    it('should have consistent punctuation style in English', () => {
      // Most English strings should not end with periods (UI convention)
      const checkPunctuation = (obj: any) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            if (value.length > 20) { // Only check longer strings
              expect(value.endsWith('.')).toBe(false);
            }
          } else if (typeof value === 'object' && value !== null) {
            checkPunctuation(value);
          }
        });
      };

      checkPunctuation(en);
    });

    it('should have similar string lengths between locales (within reason)', () => {
      const compareLength = (enObj: any, arObj: any, path: string = '') => {
        Object.keys(enObj).forEach(key => {
          const newPath = path ? path + '.' + key : key;

          if (typeof enObj[key] === 'string' && typeof arObj[key] === 'string') {
            const enLength = enObj[key].length;
            const arLength = arObj[key].length;
            // Allow for up to 3x difference in length (some languages are more verbose)
            const ratio = Math.max(enLength, arLength) / Math.min(enLength, arLength);
            expect(ratio).toBeLessThan(3);
          } else if (typeof enObj[key] === 'object' && enObj[key] !== null) {
            compareLength(enObj[key], arObj[key], newPath);
          }
        });
      };

      compareLength(en, ar);
    });
  });
});

describe('Locale Files - Theme Integration', () => {
  describe('Theme-related keys in English', () => {
    it('should have theme key', () => {
      expect(en.settings).toHaveProperty('theme');
      expect(typeof en.settings.theme).toBe('string');
      expect(en.settings.theme).toBeTruthy();
    });

    it('should have selectTheme key', () => {
      expect(en.settings).toHaveProperty('selectTheme');
      expect(typeof en.settings.selectTheme).toBe('string');
      expect(en.settings.selectTheme).toBeTruthy();
    });

    it('should have lightMode key', () => {
      expect(en.settings).toHaveProperty('lightMode');
      expect(typeof en.settings.lightMode).toBe('string');
      expect(en.settings.lightMode).toBeTruthy();
    });

    it('should have darkMode key', () => {
      expect(en.settings).toHaveProperty('darkMode');
      expect(typeof en.settings.darkMode).toBe('string');
      expect(en.settings.darkMode).toBeTruthy();
    });

    it('should have systemMode key', () => {
      expect(en.settings).toHaveProperty('systemMode');
      expect(typeof en.settings.systemMode).toBe('string');
      expect(en.settings.systemMode).toBeTruthy();
    });

    it('should have appearance key', () => {
      expect(en.settings).toHaveProperty('appearance');
      expect(typeof en.settings.appearance).toBe('string');
      expect(en.settings.appearance).toBeTruthy();
    });
  });

  describe('Theme-related keys in Arabic', () => {
    it('should have theme key', () => {
      expect(ar.settings).toHaveProperty('theme');
      expect(typeof ar.settings.theme).toBe('string');
      expect(ar.settings.theme).toBeTruthy();
    });

    it('should have selectTheme key', () => {
      expect(ar.settings).toHaveProperty('selectTheme');
      expect(typeof ar.settings.selectTheme).toBe('string');
      expect(ar.settings.selectTheme).toBeTruthy();
    });

    it('should have lightMode key', () => {
      expect(ar.settings).toHaveProperty('lightMode');
      expect(typeof ar.settings.lightMode).toBe('string');
      expect(ar.settings.lightMode).toBeTruthy();
    });

    it('should have darkMode key', () => {
      expect(ar.settings).toHaveProperty('darkMode');
      expect(typeof ar.settings.darkMode).toBe('string');
      expect(ar.settings.darkMode).toBeTruthy();
    });

    it('should have systemMode key', () => {
      expect(ar.settings).toHaveProperty('systemMode');
      expect(typeof ar.settings.systemMode).toBe('string');
      expect(ar.settings.systemMode).toBeTruthy();
    });

    it('should have appearance key', () => {
      expect(ar.settings).toHaveProperty('appearance');
      expect(typeof ar.settings.appearance).toBe('string');
      expect(ar.settings.appearance).toBeTruthy();
    });
  });

  describe('Theme translations quality', () => {
    it('should have appropriate English theme translations', () => {
      expect(en.settings.lightMode).toBe('Light');
      expect(en.settings.darkMode).toBe('Dark');
      expect(en.settings.systemMode).toBe('System');
    });

    it('should have appropriate Arabic theme translations', () => {
      expect(ar.settings.lightMode).toBe('فاتح');
      expect(ar.settings.darkMode).toBe('داكن');
      expect(ar.settings.systemMode).toBe('النظام');
    });

    it('should have meaningful selectTheme descriptions', () => {
      expect(en.settings.selectTheme.length).toBeGreaterThan(10);
      expect(ar.settings.selectTheme.length).toBeGreaterThan(5);
    });

    it('should not use generic placeholder values for theme keys', () => {
      expect(en.settings.theme).not.toMatch(/theme|appearance/i);
      expect(ar.settings.theme).not.toMatch(/ثيم|مظهر عام/i);
    });
  });

  describe('Theme key consistency', () => {
    it('should have same number of theme-related keys in both locales', () => {
      const enThemeKeys = ['theme', 'selectTheme', 'lightMode', 'darkMode', 'systemMode', 'appearance'];
      const arThemeKeys = ['theme', 'selectTheme', 'lightMode', 'darkMode', 'systemMode', 'appearance'];

      enThemeKeys.forEach(key => {
        expect(en.settings).toHaveProperty(key);
      });

      arThemeKeys.forEach(key => {
        expect(ar.settings).toHaveProperty(key);
      });
    });

    it('should not have duplicate theme keys', () => {
      const keys = Object.keys(en.settings);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });

  describe('Complete settings section after theme addition', () => {
    it('should still have all original settings keys', () => {
      const originalKeys = [
        'title', 'subtitle', 'general', 'language', 'selectLanguage',
        'english', 'arabic', 'tracking', 'autoTrackApps', 'autoTrackAppsDesc'
      ];

      originalKeys.forEach(key => {
        expect(en.settings).toHaveProperty(key);
        expect(ar.settings).toHaveProperty(key);
      });
    });

    it('should maintain settings structure integrity', () => {
      const enKeys = Object.keys(en.settings).sort();
      const arKeys = Object.keys(ar.settings).sort();
      expect(enKeys).toEqual(arKeys);
    });
  });

  describe('Theme translations semantic correctness', () => {
    it('should use appropriate terminology for light theme', () => {
      expect(en.settings.lightMode).toMatch(/light/i);
      expect(ar.settings.lightMode).toMatch(/فاتح/);
    });

    it('should use appropriate terminology for dark theme', () => {
      expect(en.settings.darkMode).toMatch(/dark/i);
      expect(ar.settings.darkMode).toMatch(/داكن/);
    });

    it('should use appropriate terminology for system theme', () => {
      expect(en.settings.systemMode).toMatch(/system/i);
      expect(ar.settings.systemMode).toMatch(/النظام/);
    });
  });
});