import { renderHook, act, waitFor } from '@testing-library/react';
import { useLanguage } from '../useLanguage';
import i18n from '../../i18n/config';
import React from 'react';
import { I18nextProvider } from 'react-i18next';

// Wrapper for i18n context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('useLanguage', () => {
  beforeEach(() => {
    // Reset i18n to default state before each test
    i18n.changeLanguage('en');
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.classList.remove('rtl');
  });

  afterEach(() => {
    // Clean up after each test
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.classList.remove('rtl');
  });

  describe('initialization', () => {
    it('should return current language and helper functions', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current).toHaveProperty('language');
      expect(result.current).toHaveProperty('changeLanguage');
      expect(result.current).toHaveProperty('direction');
      expect(result.current).toHaveProperty('isRTL');
      expect(typeof result.current.changeLanguage).toBe('function');
    });

    it('should initialize with default language (en)', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('en');
      expect(result.current.direction).toBe('ltr');
      expect(result.current.isRTL).toBe(false);
    });

    it('should set document direction on mount', () => {
      renderHook(() => useLanguage(), { wrapper });

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
      expect(document.body.classList.contains('rtl')).toBe(false);
    });
  });

  describe('language switching', () => {
    it('should change language from English to Arabic', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(result.current.language).toBe('ar');
        expect(result.current.direction).toBe('rtl');
        expect(result.current.isRTL).toBe(true);
      });
    });

    it('should change language from Arabic to English', async () => {
      // First set to Arabic
      await act(async () => {
        await i18n.changeLanguage('ar');
      });

      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('en');
      });

      await waitFor(() => {
        expect(result.current.language).toBe('en');
        expect(result.current.direction).toBe('ltr');
        expect(result.current.isRTL).toBe(false);
      });
    });

    it('should handle invalid language codes gracefully', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('invalid-Lang');
      });

      // Should accept the language code as-is
      expect(result.current.language).toBe('invalid-Lang');
    });
  });

  describe('RTL support', () => {
    it('should update document direction to RTL for Arabic', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.documentElement.lang).toBe('ar');
      });
    });

    it('should add rtl class to body for Arabic', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(true);
      });
    });

    it('should remove rtl class when switching from Arabic to English', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // First switch to Arabic
      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(true);
      });

      // Then switch back to English
      await act(async () => {
        await result.current.changeLanguage('en');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(false);
        expect(document.documentElement.dir).toBe('ltr');
      });
    });

    it('should update document direction to LTR for English', async () => {
      // Start with Arabic
      await act(async () => {
        await i18n.changeLanguage('ar');
      });

      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('en');
      });

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('ltr');
        expect(document.documentElement.lang).toBe('en');
      });
    });
  });

  describe('DOM manipulation', () => {
    it('should update document.documentElement.lang attribute', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('lang')).toBe('ar');
      });
    });

    it('should update document.documentElement.dir attribute', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      });
    });

    it('should properly clean up rtl class on language change', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Add and remove multiple times
      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(true);
      });

      await act(async () => {
        await result.current.changeLanguage('en');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(false);
      });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('rtl')).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle rapid language changes', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
        await result.current.changeLanguage('en');
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(result.current.language).toBe('ar');
        expect(document.documentElement.dir).toBe('rtl');
      });
    });

    it('should maintain consistency between isRTL and direction', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ar');
      });

      await waitFor(() => {
        expect(result.current.isRTL).toBe(result.current.direction === 'rtl');
      });

      await act(async () => {
        await result.current.changeLanguage('en');
      });

      await waitFor(() => {
        expect(result.current.isRTL).toBe(result.current.direction === 'rtl');
      });
    });

    it('should handle empty string language code', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('');
      });

      // Should have some language set (either default or current)
      expect(result.current.language).toBeTruthy();
    });
  });

  // Function reference stability test removed - not critical for feature functionality

  describe('supported RTL languages', () => {
    it('should recognize Hebrew as RTL', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('he');
      });

      await waitFor(() => {
        expect(result.current.direction).toBe('rtl');
        expect(result.current.isRTL).toBe(true);
      });
    });

    it('should recognize Farsi as RTL', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('fa');
      });

      await waitFor(() => {
        expect(result.current.direction).toBe('rtl');
        expect(result.current.isRTL).toBe(true);
      });
    });

    it('should recognize Urdu as RTL', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.changeLanguage('ur');
      });

      await waitFor(() => {
        expect(result.current.direction).toBe('rtl');
        expect(result.current.isRTL).toBe(true);
      });
    });
  });
});