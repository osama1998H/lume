import { renderHook, act } from '@testing-library/react';
import { useTheme, Theme } from '../useTheme';

const STORAGE_KEY = 'lume-theme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Default system preference to light
    (window as any).matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('initialization', () => {
    it('defaults to system theme when no stored value', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('initializes with stored dark theme', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('initializes with stored light theme', () => {
      localStorage.setItem(STORAGE_KEY, 'light');
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('falls back to system on invalid stored value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid' as any);
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('system');
      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
    });
  });

  describe('theme switching', () => {
    it('changeTheme("dark") applies dark class and persists', () => {
      const { result } = renderHook(() => useTheme());
      act(() => {
        result.current.changeTheme('dark');
      });
      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('changeTheme("light") removes dark class and persists', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      document.documentElement.classList.add('dark');
      const { result } = renderHook(() => useTheme());
      act(() => {
        result.current.changeTheme('light');
      });
      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });

    it('changeTheme("system") uses system preference', () => {
      (window as any).matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: q === '(prefers-color-scheme: dark)',
        media: q,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      const { result } = renderHook(() => useTheme());
      act(() => {
        result.current.changeTheme('system');
      });
      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
    });

    it('persists chosen theme across rerenders', () => {
      const { result, rerender } = renderHook(() => useTheme());
      act(() => {
        result.current.changeTheme('dark');
      });
      rerender();
      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('system theme reaction', () => {
    it('reacts to system theme changes when theme is system', () => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = [];
      const mockMQ = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
      (window as any).matchMedia = jest.fn().mockReturnValue(mockMQ as any);

      localStorage.setItem(STORAGE_KEY, 'system');
      const { result } = renderHook(() => useTheme());
      // Initially light (matches=false)
      expect(result.current.effectiveTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      act(() => {
        (mockMQ as any).matches = true;
        listeners.forEach(fn => fn({ matches: true } as MediaQueryListEvent));
      });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(result.current.effectiveTheme).toBe('dark');
    });

    it('cleans up system listener on unmount', () => {
      const removeEventListener = jest.fn();
      (window as any).matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener,
        dispatchEvent: jest.fn(),
      }));
      localStorage.setItem(STORAGE_KEY, 'system');
      const { unmount } = renderHook(() => useTheme());
      unmount();
      expect(removeEventListener).toHaveBeenCalled();
    });
  });

  describe('API shape', () => {
    it('exposes theme, effectiveTheme, changeTheme, isDark', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('effectiveTheme');
      expect(result.current).toHaveProperty('changeTheme');
      expect(result.current).toHaveProperty('isDark');
      expect(typeof result.current.changeTheme).toBe('function');
    });
  });
});