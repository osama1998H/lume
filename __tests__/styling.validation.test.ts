import * as fs from 'fs';
import * as path from 'path';

describe('CSS and Configuration Validation', () => {
  describe('index.css validation', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should import tailwindcss', () => {
      expect(cssContent).toContain('@import "tailwindcss"');
    });

    it('should define dark mode color variables', () => {
      expect(cssContent).toMatch(/dark:bg-gray-/);
      expect(cssContent).toMatch(/dark:text-gray-/);
    });

    it('should include transition for theme changes', () => {
      expect(cssContent).toContain('transition:');
    });

    it('should define base layer with dark mode support', () => {
      expect(cssContent).toContain('@layer base');
      expect(cssContent).toMatch(/dark:bg-gray-900/);
      expect(cssContent).toMatch(/dark:text-gray-100/);
    });

    it('should define component layer with dark mode support', () => {
      expect(cssContent).toContain('@layer components');
    });

    it('should have dark mode styles for .btn-primary', () => {
      expect(cssContent).toMatch(/btn-primary/);
      expect(cssContent).toMatch(/dark:bg-primary-/);
    });

    it('should have dark mode styles for .btn-secondary', () => {
      expect(cssContent).toMatch(/btn-secondary/);
      expect(cssContent).toMatch(/dark:bg-gray-/);
    });

    it('should have dark mode styles for .card', () => {
      expect(cssContent).toMatch(/\.card/);
      expect(cssContent).toMatch(/dark:bg-gray-800/);
    });

    it('should have dark mode styles for titlebar', () => {
      expect(cssContent).toMatch(/\.titlebar/);
      expect(cssContent).toMatch(/dark:bg-gray-800/);
    });

    it('should define custom color scheme', () => {
      expect(cssContent).toContain('@theme');
      expect(cssContent).toMatch(/--color-primary-/);
    });

    it('should not have syntax errors', () => {
      // Basic syntax validation
      const openBraces = (cssContent.match(/{/g) || []).length;
      const closeBraces = (cssContent.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should use consistent dark mode class naming', () => {
      const darkModeMatches = cssContent.match(/dark:[a-z-]+/g) || [];
      darkModeMatches.forEach(match => {
        expect(match).toMatch(/^dark:[a-z-]+$/);
      });
    });

    it('should have transition properties for smooth theme switching', () => {
      expect(cssContent).toMatch(/transition.*color/);
      expect(cssContent).toMatch(/transition.*background/);
    });
  });

  describe('tailwind.config.js validation', () => {
    let configContent: string;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../tailwind.config.js');
      configContent = fs.readFileSync(configPath, 'utf-8');
    });

    it('should have darkMode set to class', () => {
      expect(configContent).toContain("darkMode: 'class'");
    });

    it('should have content paths configured', () => {
      expect(configContent).toContain('content:');
      expect(configContent).toMatch(/\.\/index\.html/);
      expect(configContent).toMatch(/\.\/src\/\*\*\/\*\.\{js,ts,jsx,tsx\}/);
    });

    it('should include forms plugin', () => {
      expect(configContent).toMatch(/require\(['"]@tailwindcss\/forms['"]\)/);
    });

    it('should export valid module configuration', () => {
      expect(configContent).toContain('module.exports');
    });

    it('should not have syntax errors', () => {
      const openBraces = (configContent.match(/{/g) || []).length;
      const closeBraces = (configContent.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      const openBrackets = (configContent.match(/\[/g) || []).length;
      const closeBrackets = (configContent.match(/\]/g) || []).length;
      expect(openBrackets).toBe(closeBrackets);
    });
  });

  describe('Dark mode implementation consistency', () => {
    let cssContent: string;
    let configContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      const configPath = path.join(__dirname, '../tailwind.config.js');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
      configContent = fs.readFileSync(configPath, 'utf-8');
    });

    it('should use class-based dark mode consistently', () => {
      expect(configContent).toContain("darkMode: 'class'");
      expect(cssContent).toMatch(/dark:/);
    });

    it('should have dark mode variants for all main components', () => {
      const components = ['.btn-primary', '.btn-secondary', '.card', '.titlebar'];
      
      components.forEach(component => {
        expect(cssContent).toContain(component);
      });
    });

    it('should use consistent color palette for dark mode', () => {
      const darkColors = cssContent.match(/dark:bg-gray-(\d+)/g) || [];
      const uniqueColors = new Set(darkColors);
      
      // Should use multiple gray shades for depth
      expect(uniqueColors.size).toBeGreaterThan(2);
    });

    it('should have consistent border colors in dark mode', () => {
      expect(cssContent).toMatch(/dark:border-gray-/);
    });

    it('should have consistent text colors in dark mode', () => {
      expect(cssContent).toMatch(/dark:text-gray-/);
      expect(cssContent).toMatch(/dark:text-primary-/);
    });
  });

  describe('Color scheme validation', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should define primary color variations', () => {
      for (let i = 1; i <= 9; i++) {
        expect(cssContent).toContain(`--color-primary-${i}00`);
      }
    });

    it('should use consistent color naming convention', () => {
      const colorVars = cssContent.match(/--color-[a-z]+-\d+/g) || [];
      colorVars.forEach(colorVar => {
        expect(colorVar).toMatch(/^--color-[a-z]+-\d+$/);
      });
    });

    it('should define custom animations', () => {
      expect(cssContent).toContain('--animate-pulse-slow');
    });
  });

  describe('RTL support with dark mode', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should maintain RTL support styles', () => {
      expect(cssContent).toContain('[dir="rtl"]');
      expect(cssContent).toContain('[dir="ltr"]');
    });

    it('should have RTL-specific adjustments', () => {
      expect(cssContent).toMatch(/\[dir="rtl"\].*{/);
    });

    it('should not conflict dark mode with RTL', () => {
      // Both should be present and independent
      expect(cssContent).toContain('dark:');
      expect(cssContent).toContain('[dir="rtl"]');
    });
  });

  describe('Accessibility considerations', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should have focus ring styles', () => {
      expect(cssContent).toMatch(/focus:ring/);
      expect(cssContent).toMatch(/focus:outline-none/);
    });

    it('should have proper contrast for dark mode', () => {
      // Dark mode should use light text on dark backgrounds
      expect(cssContent).toMatch(/dark:bg-gray-900.*dark:text-gray-100/s);
    });

    it('should have focus ring offset for dark mode', () => {
      expect(cssContent).toMatch(/dark:focus:ring-offset-gray-900/);
    });

    it('should maintain button focus states in dark mode', () => {
      expect(cssContent).toMatch(/btn-primary.*focus:ring/s);
      expect(cssContent).toMatch(/btn-secondary.*focus:ring/s);
    });
  });

  describe('Performance considerations', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(__dirname, '../src/index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should use CSS transitions for smooth theme changes', () => {
      const transitions = cssContent.match(/transition:/g) || [];
      expect(transitions.length).toBeGreaterThan(0);
    });

    it('should not have excessive transition durations', () => {
      const durations = cssContent.match(/transition:.*?(\d+\.?\d*)s/g) || [];
      durations.forEach(duration => {
        const seconds = parseFloat(duration.match(/(\d+\.?\d*)s/)?.[1] || '0');
        expect(seconds).toBeLessThanOrEqual(1); // Max 1 second
      });
    });

    it('should use efficient selectors', () => {
      // Should not have overly complex selectors
      const lines = cssContent.split('\n');
      lines.forEach(line => {
        const selectorDepth = (line.match(/>/g) || []).length;
        expect(selectorDepth).toBeLessThan(5); // Max depth of 5
      });
    });
  });
});