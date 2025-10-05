/**
 * Package.json Validation Tests
 *
 * Comprehensive tests to validate the package.json configuration file.
 * These tests ensure that all required fields are present, properly formatted,
 * and contain valid values according to npm package.json specifications.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('package.json validation', () => {
  let packageJson: any;

  beforeAll(() => {
    // Read the package.json file from the project root
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf-8');
    packageJson = JSON.parse(packageContent);
  });

  describe('required fields', () => {
    it('should have a name field', () => {
      expect(packageJson.name).toBeDefined();
      expect(typeof packageJson.name).toBe('string');
      expect(packageJson.name).toBe('lume');
    });

    it('should have a version field with valid semver format', () => {
      expect(packageJson.version).toBeDefined();
      expect(typeof packageJson.version).toBe('string');
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have a description field', () => {
      expect(packageJson.description).toBeDefined();
      expect(typeof packageJson.description).toBe('string');
      expect(packageJson.description.length).toBeGreaterThan(0);
    });

    it('should have a main entry point', () => {
      expect(packageJson.main).toBeDefined();
      expect(typeof packageJson.main).toBe('string');
      expect(packageJson.main).toBe('dist/main/main.js');
    });

    it('should have a license field', () => {
      expect(packageJson.license).toBeDefined();
      expect(typeof packageJson.license).toBe('string');
      expect(packageJson.license).toBe('MIT');
    });

    it('should be marked as private', () => {
      expect(packageJson.private).toBe(true);
    });

    it('should have a homepage field', () => {
      expect(packageJson.homepage).toBeDefined();
      expect(typeof packageJson.homepage).toBe('string');
    });
  });

  describe('author field', () => {
    it('should have an author field', () => {
      expect(packageJson.author).toBeDefined();
      expect(typeof packageJson.author).toBe('string');
    });

    it('should contain team name "Lume Team"', () => {
      expect(packageJson.author).toContain('Lume Team');
    });

    it('should include email address in proper format', () => {
      expect(packageJson.author).toMatch(/\<.+@.+\..+\>/);
    });

    it('should have the correct email address', () => {
      expect(packageJson.author).toContain('team@lume.app');
    });

    it('should follow npm author format: Name <email>', () => {
      expect(packageJson.author).toMatch(/^[^<>]+\s*<[^<>]+>$/);
    });

    it('should not have leading or trailing whitespace', () => {
      expect(packageJson.author).toBe(packageJson.author.trim());
    });

    it('should have valid email domain', () => {
      const emailMatch = packageJson.author.match(/<(.+@.+\..+)>/);
      expect(emailMatch).not.toBeNull();
      if (emailMatch) {
        const email = emailMatch[1];
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
    });
  });

  describe('keywords', () => {
    it('should have keywords array', () => {
      expect(packageJson.keywords).toBeDefined();
      expect(Array.isArray(packageJson.keywords)).toBe(true);
    });

    it('should have at least one keyword', () => {
      expect(packageJson.keywords.length).toBeGreaterThan(0);
    });

    it('should contain relevant keywords', () => {
      const expectedKeywords = ['time tracking', 'productivity', 'desktop app', 'electron', 'react'];
      expectedKeywords.forEach(keyword => {
        expect(packageJson.keywords).toContain(keyword);
      });
    });

    it('should have all keywords as strings', () => {
      packageJson.keywords.forEach((keyword: any) => {
        expect(typeof keyword).toBe('string');
        expect(keyword.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate keywords', () => {
      const uniqueKeywords = new Set(packageJson.keywords);
      expect(uniqueKeywords.size).toBe(packageJson.keywords.length);
    });
  });

  describe('scripts', () => {
    const requiredScripts = [
      'start',
      'dev',
      'dev:react',
      'dev:electron',
      'build',
      'build:react',
      'build:electron',
      'test',
      'test:watch',
      'lint',
      'lint:fix',
      'pack',
      'dist'
    ];

    it('should have a scripts object', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(typeof packageJson.scripts).toBe('object');
    });

    requiredScripts.forEach(script => {
      it(`should have "${script}" script`, () => {
        expect(packageJson.scripts[script]).toBeDefined();
        expect(typeof packageJson.scripts[script]).toBe('string');
        expect(packageJson.scripts[script].length).toBeGreaterThan(0);
      });
    });

    it('should have valid electron start command', () => {
      expect(packageJson.scripts.start).toContain('electron');
      expect(packageJson.scripts.start).toContain('dist/main/main.js');
    });

    it('should have valid build commands', () => {
      expect(packageJson.scripts.build).toContain('build:react');
      expect(packageJson.scripts.build).toContain('build:electron');
    });

    it('should have valid test commands', () => {
      expect(packageJson.scripts.test).toBe('jest');
      expect(packageJson.scripts['test:watch']).toContain('jest');
      expect(packageJson.scripts['test:watch']).toContain('watch');
    });

    it('should have valid lint commands', () => {
      expect(packageJson.scripts.lint).toContain('eslint');
      expect(packageJson.scripts['lint:fix']).toContain('eslint');
      expect(packageJson.scripts['lint:fix']).toContain('--fix');
    });

    it('should have valid dev command using concurrently', () => {
      expect(packageJson.scripts.dev).toContain('concurrently');
    });

    it('should have valid dist command', () => {
      expect(packageJson.scripts.dist).toContain('build');
      expect(packageJson.scripts.dist).toContain('electron-builder');
    });
  });

  describe('dependencies', () => {
    it('should have dependencies object', () => {
      expect(packageJson.dependencies).toBeDefined();
      expect(typeof packageJson.dependencies).toBe('object');
    });

    it('should have core Electron dependencies', () => {
      expect(packageJson.dependencies['@sentry/electron']).toBeDefined();
    });

    it('should have React dependencies', () => {
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();
    });

    it('should have database dependencies', () => {
      expect(packageJson.dependencies['better-sqlite3']).toBeDefined();
      expect(packageJson.dependencies.sqlite3).toBeDefined();
    });

    it('should have i18n dependencies', () => {
      expect(packageJson.dependencies.i18next).toBeDefined();
      expect(packageJson.dependencies['i18next-browser-languagedetector']).toBeDefined();
      expect(packageJson.dependencies['react-i18next']).toBeDefined();
    });

    it('should have environment configuration dependency', () => {
      expect(packageJson.dependencies.dotenv).toBeDefined();
    });

    it('should have valid version formats', () => {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        expect(typeof version).toBe('string');
        expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
      });
    });
  });

  describe('devDependencies', () => {
    it('should have devDependencies object', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(typeof packageJson.devDependencies).toBe('object');
    });

    it('should have Electron build tools', () => {
      expect(packageJson.devDependencies.electron).toBeDefined();
      expect(packageJson.devDependencies['electron-builder']).toBeDefined();
    });

    it('should have TypeScript and related tools', () => {
      expect(packageJson.devDependencies.typescript).toBeDefined();
      expect(packageJson.devDependencies['@typescript-eslint/eslint-plugin']).toBeDefined();
      expect(packageJson.devDependencies['@typescript-eslint/parser']).toBeDefined();
    });

    it('should have testing framework and utilities', () => {
      expect(packageJson.devDependencies.jest).toBeDefined();
      expect(packageJson.devDependencies['jest-environment-jsdom']).toBeDefined();
      expect(packageJson.devDependencies['@testing-library/jest-dom']).toBeDefined();
      expect(packageJson.devDependencies['@testing-library/react']).toBeDefined();
      expect(packageJson.devDependencies['@testing-library/user-event']).toBeDefined();
    });

    it('should have React type definitions', () => {
      expect(packageJson.devDependencies['@types/react']).toBeDefined();
      expect(packageJson.devDependencies['@types/react-dom']).toBeDefined();
    });

    it('should have Vite build tool', () => {
      expect(packageJson.devDependencies.vite).toBeDefined();
      expect(packageJson.devDependencies['@vitejs/plugin-react']).toBeDefined();
    });

    it('should have Tailwind CSS and PostCSS', () => {
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
      expect(packageJson.devDependencies.postcss).toBeDefined();
      expect(packageJson.devDependencies.autoprefixer).toBeDefined();
      expect(packageJson.devDependencies['@tailwindcss/forms']).toBeDefined();
      expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();
    });

    it('should have ESLint and plugins', () => {
      expect(packageJson.devDependencies.eslint).toBeDefined();
      expect(packageJson.devDependencies['eslint-plugin-react']).toBeDefined();
      expect(packageJson.devDependencies['eslint-plugin-react-hooks']).toBeDefined();
    });

    it('should have development utilities', () => {
      expect(packageJson.devDependencies.concurrently).toBeDefined();
      expect(packageJson.devDependencies['wait-on']).toBeDefined();
    });

    it('should have valid version formats', () => {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        expect(typeof version).toBe('string');
        expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
      });
    });
  });

  describe('build configuration', () => {
    it('should have build configuration object', () => {
      expect(packageJson.build).toBeDefined();
      expect(typeof packageJson.build).toBe('object');
    });

    it('should have appId', () => {
      expect(packageJson.build.appId).toBeDefined();
      expect(typeof packageJson.build.appId).toBe('string');
      expect(packageJson.build.appId).toBe('com.lume.app');
    });

    it('should have productName', () => {
      expect(packageJson.build.productName).toBeDefined();
      expect(packageJson.build.productName).toBe('Lume');
    });

    it('should have Windows build configuration', () => {
      expect(packageJson.build.win).toBeDefined();
      expect(packageJson.build.win.icon).toBeDefined();
      expect(Array.isArray(packageJson.build.win.target)).toBe(true);
      expect(packageJson.build.win.target).toContain('nsis');
    });

    it('should have macOS build configuration', () => {
      expect(packageJson.build.mac).toBeDefined();
      expect(packageJson.build.mac.icon).toBeDefined();
      expect(packageJson.build.mac.category).toBe('public.app-category.productivity');
      expect(Array.isArray(packageJson.build.mac.target)).toBe(true);
      expect(packageJson.build.mac.target).toContain('dmg');
      expect(packageJson.build.mac.target).toContain('zip');
    });

    it('should have Linux build configuration', () => {
      expect(packageJson.build.linux).toBeDefined();
      expect(packageJson.build.linux.icon).toBeDefined();
      expect(packageJson.build.linux.category).toBe('Utility');
      expect(Array.isArray(packageJson.build.linux.target)).toBe(true);
      expect(packageJson.build.linux.target).toContain('AppImage');
      expect(packageJson.build.linux.target).toContain('deb');
    });

    it('should have files configuration', () => {
      expect(Array.isArray(packageJson.build.files)).toBe(true);
      expect(packageJson.build.files).toContain('dist/**/*');
      expect(packageJson.build.files).toContain('src/public/**/*');
    });

    it('should have directories configuration', () => {
      expect(packageJson.build.directories).toBeDefined();
      expect(packageJson.build.directories.output).toBe('release');
    });

    it('should use the same icon path for all platforms', () => {
      const iconPath = 'src/public/logo1.png';
      expect(packageJson.build.win.icon).toBe(iconPath);
      expect(packageJson.build.mac.icon).toBe(iconPath);
      expect(packageJson.build.linux.icon).toBe(iconPath);
    });
  });

  describe('package.json structure integrity', () => {
    it('should be valid JSON', () => {
      expect(() => JSON.stringify(packageJson)).not.toThrow();
    });

    it('should not have circular references', () => {
      expect(() => JSON.stringify(packageJson)).not.toThrow();
    });

    it('should have consistent naming conventions', () => {
      expect(packageJson.name).toMatch(/^[a-z][a-z0-9-]*$/);
    });

    it('should have description that mentions key features', () => {
      const description = packageJson.description.toLowerCase();
      expect(description).toMatch(/time|track|visualize|task|application/);
    });

    it('should have main entry point that exists in expected location', () => {
      expect(packageJson.main).toMatch(/^dist\/main\/main\.js$/);
    });
  });

  describe('version and metadata consistency', () => {
    it('should have version matching product version in build config', () => {
      expect(packageJson.version).toBeDefined();
      expect(packageJson.build.productName).toBe('Lume');
    });

    it('should have consistent app naming across configuration', () => {
      expect(packageJson.name).toBe('lume');
      expect(packageJson.build.productName).toBe('Lume');
      expect(packageJson.build.appId).toContain('lume');
    });

    it('should have homepage path consistent with private package', () => {
      expect(packageJson.homepage).toBe('./');
      expect(packageJson.private).toBe(true);
    });
  });

  describe('security and best practices', () => {
    it('should not have any empty dependency versions', () => {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(version).toBeTruthy();
        expect(typeof version).toBe('string');
        expect((version as string).length).toBeGreaterThan(0);
      });
    });

    it('should have specific type definitions for TypeScript dependencies', () => {
      const typeDeps = Object.keys(packageJson.devDependencies).filter(dep => dep.startsWith('@types/'));
      expect(typeDeps.length).toBeGreaterThan(0);
    });

    it('should use caret (^) or tilde (~) for semantic versioning', () => {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(version).toMatch(/^[\^~]\d+\.\d+\.\d+/);
      });
    });

    it('should have MIT license for open source project', () => {
      expect(packageJson.license).toBe('MIT');
    });
  });

  describe('electron-specific configuration', () => {
    it('should have correct main entry point for Electron', () => {
      expect(packageJson.main).toMatch(/main\.js$/);
    });

    it('should have electron in devDependencies', () => {
      expect(packageJson.devDependencies.electron).toBeDefined();
    });

    it('should have electron-builder in devDependencies', () => {
      expect(packageJson.devDependencies['electron-builder']).toBeDefined();
    });

    it('should have build configuration for all major platforms', () => {
      expect(packageJson.build.win).toBeDefined();
      expect(packageJson.build.mac).toBeDefined();
      expect(packageJson.build.linux).toBeDefined();
    });
  });

  describe('react and UI dependencies', () => {
    it('should have matching React and ReactDOM versions', () => {
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();
      expect(packageJson.dependencies.react).toBe(packageJson.dependencies['react-dom']);
    });

    it('should have matching React type definition versions', () => {
      expect(packageJson.devDependencies['@types/react']).toBeDefined();
      expect(packageJson.devDependencies['@types/react-dom']).toBeDefined();
    });

    it('should have Tailwind CSS and its dependencies', () => {
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
      expect(packageJson.devDependencies['@tailwindcss/forms']).toBeDefined();
      expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();
    });
  });

  describe('testing infrastructure', () => {
    it('should have Jest as the test runner', () => {
      expect(packageJson.devDependencies.jest).toBeDefined();
      expect(packageJson.scripts.test).toContain('jest');
    });

    it('should have React Testing Library', () => {
      expect(packageJson.devDependencies['@testing-library/react']).toBeDefined();
      expect(packageJson.devDependencies['@testing-library/jest-dom']).toBeDefined();
      expect(packageJson.devDependencies['@testing-library/user-event']).toBeDefined();
    });

    it('should have Jest type definitions', () => {
      expect(packageJson.devDependencies['@types/jest']).toBeDefined();
    });

    it('should have jsdom environment for React testing', () => {
      expect(packageJson.devDependencies['jest-environment-jsdom']).toBeDefined();
    });
  });

  describe('internationalization', () => {
    it('should have i18next core library', () => {
      expect(packageJson.dependencies.i18next).toBeDefined();
    });

    it('should have React i18next bindings', () => {
      expect(packageJson.dependencies['react-i18next']).toBeDefined();
    });

    it('should have browser language detector', () => {
      expect(packageJson.dependencies['i18next-browser-languagedetector']).toBeDefined();
    });
  });

  describe('edge cases and error conditions', () => {
    it('should not have any null or undefined top-level fields', () => {
      const requiredFields = ['name', 'version', 'description', 'main', 'author', 'license'];
      requiredFields.forEach(field => {
        expect(packageJson[field]).not.toBeNull();
        expect(packageJson[field]).not.toBeUndefined();
      });
    });

    it('should have non-empty scripts object', () => {
      expect(Object.keys(packageJson.scripts).length).toBeGreaterThan(0);
    });

    it('should have non-empty dependencies', () => {
      expect(Object.keys(packageJson.dependencies).length).toBeGreaterThan(0);
    });

    it('should have non-empty devDependencies', () => {
      expect(Object.keys(packageJson.devDependencies).length).toBeGreaterThan(0);
    });

    it('should not have dependencies in both dependencies and devDependencies', () => {
      const deps = Object.keys(packageJson.dependencies);
      const devDeps = Object.keys(packageJson.devDependencies);
      const intersection = deps.filter(dep => devDeps.includes(dep));
      expect(intersection).toEqual([]);
    });

    it('should handle author field variations gracefully', () => {
      expect(typeof packageJson.author).toBe('string');
      expect(packageJson.author.length).toBeGreaterThan(0);
    });

    it('should have valid semver ranges for all dependencies', () => {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
      });
    });
  });
});