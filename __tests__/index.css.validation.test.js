const fs = require('fs');
const path = require('path');

describe('CSS Dark Mode Styling', () => {
  let cssContent;

  beforeAll(() => {
    const cssPath = path.join(__dirname, '..', 'src', 'index.css');
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  });

  describe('Tailwind Directives', () => {
    it('should include Tailwind base layer', () => {
      expect(cssContent).toContain('@tailwind base');
    });

    it('should include Tailwind components layer', () => {
      expect(cssContent).toContain('@tailwind components');
    });

    it('should include Tailwind utilities layer', () => {
      expect(cssContent).toContain('@tailwind utilities');
    });
  });

  describe('Dark Mode Base Styles', () => {
    it('should have dark mode background color for body', () => {
      expect(cssContent).toContain('dark:bg-gray-900');
    });

    it('should have dark mode text color for body', () => {
      expect(cssContent).toContain('dark:text-gray-100');
    });

    it('should have background transition for smooth theme changes', () => {
      expect(cssContent).toMatch(/transition:.*background-color/);
    });

    it('should have color transition for smooth theme changes', () => {
      expect(cssContent).toMatch(/transition:.*color/);
    });
  });

  describe('Dark Mode Border Styles', () => {
    it('should have dark mode border color', () => {
      expect(cssContent).toContain('dark:border-gray-700');
    });
  });

  describe('Component Classes', () => {
    it('should have btn-primary class with dark mode support', () => {
      const btnPrimaryRegex = /\.btn-primary[\s\S]*?dark:bg-primary-500/;
      expect(btnPrimaryRegex.test(cssContent)).toBe(true);
    });

    it('should have btn-secondary class with dark mode support', () => {
      const btnSecondaryRegex = /\.btn-secondary[\s\S]*?dark:bg-gray-700/;
      expect(btnSecondaryRegex.test(cssContent)).toBe(true);
    });

    it('should have card class with dark mode background', () => {
      const cardRegex = /\.card[\s\S]*?dark:bg-gray-800/;
      expect(cardRegex.test(cssContent)).toBe(true);
    });

    it('should have card class with dark mode border', () => {
      const cardRegex = /\.card[\s\S]*?dark:border-gray-700/;
      expect(cardRegex.test(cssContent)).toBe(true);
    });
  });

  describe('Title Bar Styles', () => {
    it('should have titlebar class with dark mode background', () => {
      const titlebarRegex = /\.titlebar[\s\S]*?dark:bg-gray-800/;
      expect(titlebarRegex.test(cssContent)).toBe(true);
    });

    it('should have titlebar class with dark mode border', () => {
      const titlebarRegex = /\.titlebar[\s\S]*?dark:border-gray-700/;
      expect(titlebarRegex.test(cssContent)).toBe(true);
    });

    it('should have titlebar title with dark mode color', () => {
      const titleRegex = /\.titlebar-title[\s\S]*?dark:text-primary-400/;
      expect(titleRegex.test(cssContent)).toBe(true);
    });

    it('should have titlebar separator with dark mode color', () => {
      const separatorRegex = /\.titlebar-separator[\s\S]*?dark:text-gray-500/;
      expect(separatorRegex.test(cssContent)).toBe(true);
    });

    it('should have titlebar tagline with dark mode color', () => {
      const taglineRegex = /\.titlebar-tagline[\s\S]*?dark:text-gray-400/;
      expect(taglineRegex.test(cssContent)).toBe(true);
    });
  });

  describe('Button Focus Ring Offsets', () => {
    it('should have dark mode focus ring offset for btn-primary', () => {
      const btnPrimaryRegex = /\.btn-primary[\s\S]*?dark:focus:ring-offset-gray-900/;
      expect(btnPrimaryRegex.test(cssContent)).toBe(true);
    });

    it('should have dark mode focus ring offset for btn-secondary', () => {
      const btnSecondaryRegex = /\.btn-secondary[\s\S]*?dark:focus:ring-offset-gray-900/;
      expect(btnSecondaryRegex.test(cssContent)).toBe(true);
    });
  });

  describe('Transition Properties', () => {
    it('should have transition for card component', () => {
      const cardRegex = /\.card[\s\S]*?transition-colors/;
      expect(cardRegex.test(cssContent)).toBe(true);
    });

    it('should have transition for titlebar', () => {
      const titlebarRegex = /\.titlebar[\s\S]*?transition:.*background-color/;
      expect(titlebarRegex.test(cssContent)).toBe(true);
    });
  });

  describe('RTL Support Preservation', () => {
    it('should maintain RTL text alignment rules', () => {
      expect(cssContent).toContain('[dir="rtl"]');
    });

    it('should have RTL-specific styles for body', () => {
      const rtlRegex = /\[dir="rtl"\] body/;
      expect(rtlRegex.test(cssContent)).toBe(true);
    });
  });

  describe('CSS File Structure', () => {
    it('should have proper layer organization', () => {
      const baseIndex = cssContent.indexOf('@layer base');
      const componentsIndex = cssContent.indexOf('@layer components');
      
      expect(baseIndex).toBeGreaterThan(-1);
      expect(componentsIndex).toBeGreaterThan(-1);
      expect(baseIndex).toBeLessThan(componentsIndex);
    });

    it('should not have syntax errors (basic check)', () => {
      // Check for balanced braces
      const openBraces = (cssContent.match(/{/g) || []).length;
      const closeBraces = (cssContent.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });
  });
});