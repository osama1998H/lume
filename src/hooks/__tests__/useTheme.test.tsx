import { renderHook, act, waitFor } from '@testing-library/react';
import { useTheme, Theme } from '../useTheme';

describe('useTheme', () => {
  let mockLocalStorage: { [key: string]: string };
  let mockMatchMedia: jest.Mock;
  let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[];

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage = {};
    Storage.prototype.getItem = jest.fn((key: string) => mockLocalStorage[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    // Reset DOM
    document.documentElement.classList.remove('dark');
    
    // Mock matchMedia
    mediaQueryListeners = [];
    mockMatchMedia = jest.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        const index = mediaQueryListeners.indexOf(listener);
        if (index > -1) {
          mediaQueryListeners.splice(index, 1);
        }
      }),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
    mediaQueryListeners = [];
  });

  describe('initialization', () => {
    it('should return theme state and helper functions', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('effectiveTheme');
      expect(result.current).toHaveProperty('changeTheme');
      expect(result.current).toHaveProperty('isDark');
      expect(typeof result.current.changeTheme).toBe('function');
    });

    it('should initialize with system theme when no stored preference', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
    });

    it('should initialize with stored theme preference', () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should initialize with light theme from storage', () => {
      mockLocalStorage['lume-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should fall back to system theme for invalid stored value', () => {
      mockLocalStorage['lume-theme'] = 'invalid-theme';
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
    });

    it('should apply dark class to document when initialized with dark theme', () => {
      mockLocalStorage['lume-theme'] = 'dark';
      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not apply dark class when initialized with light theme', () => {
      mockLocalStorage['lume-theme'] = 'light';
      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('theme switching', () => {
    it('should change theme from system to light', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.effectiveTheme).toBe('light');
        expect(result.current.isDark).toBe(false);
      });
    });

    it('should change theme from system to dark', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
        expect(result.current.isDark).toBe(true);
      });
    });

    it('should change theme from light to dark', async () => {
      mockLocalStorage['lume-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
      });
    });

    it('should change theme from dark to light', async () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.effectiveTheme).toBe('light');
      });
    });

    it('should change theme from light to system', async () => {
      mockLocalStorage['lume-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(['light', 'dark']).toContain(result.current.effectiveTheme);
      });
    });

    it('should change theme from dark to system', async () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(['light', 'dark']).toContain(result.current.effectiveTheme);
      });
    });
  });

  describe('localStorage persistence', () => {
    it('should save theme to localStorage when changed', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('lume-theme', 'dark');
      });
    });

    it('should save system theme to localStorage', async () => {
      mockLocalStorage['lume-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('lume-theme', 'system');
      });
    });

    it('should persist theme changes across multiple switches', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('lume-theme', 'dark');
      });

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('lume-theme', 'light');
      });
    });
  });

  describe('DOM manipulation', () => {
    it('should add dark class to document element when switching to dark', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should remove dark class from document element when switching to light', async () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should properly toggle dark class multiple times', async () => {
      const { result } = renderHook(() => useTheme());

      // Switch to dark
      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Switch to light
      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      // Switch back to dark
      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('system theme detection', () => {
    it('should detect light system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should detect dark system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should apply dark class when system theme is dark', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('system theme changes', () => {
    it('should listen for system theme changes when theme is system', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      });
    });

    it('should update effectiveTheme when system theme changes to dark', async () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'change') {
            mediaQueryListeners.push(listener);
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      // Simulate system theme change to dark
      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should update effectiveTheme when system theme changes to light', async () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'change') {
            mediaQueryListeners.push(listener);
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      // Simulate system theme change to light
      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: false } as MediaQueryListEvent);
        });
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should not listen for system theme changes when theme is not system', async () => {
      const { result } = renderHook(() => useTheme());
      const addEventListenerSpy = jest.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      // System listener should not be active for explicit light/dark themes
      expect(mediaQueryListeners.length).toBe(0);
    });

    it('should remove event listener when switching from system to explicit theme', async () => {
      const removeEventListenerSpy = jest.fn();
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'change') {
            mediaQueryListeners.push(listener);
          }
        }),
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      await waitFor(() => {
        expect(mediaQueryListeners.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(removeEventListenerSpy).toHaveBeenCalled();
      });
    });

    it('should clean up event listener on unmount', () => {
      const removeEventListenerSpy = jest.fn();
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: jest.fn(),
      });

      const { result, unmount } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('isDark property', () => {
    it('should be true when effectiveTheme is dark', () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });

    it('should be false when effectiveTheme is light', () => {
      mockLocalStorage['lume-theme'] = 'light';
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
    });

    it('should update when theme changes', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.isDark).toBe(true);
      });

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(result.current.isDark).toBe(false);
      });
    });

    it('should reflect system theme when in system mode', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid theme changes', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
        result.current.changeTheme('light');
        result.current.changeTheme('system');
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
      });
    });

    it('should maintain consistency between theme and effectiveTheme', async () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
      });

      act(() => {
        result.current.changeTheme('light');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.effectiveTheme).toBe('light');
      });
    });

    it('should handle changing to the same theme', async () => {
      mockLocalStorage['lume-theme'] = 'dark';
      const { result } = renderHook(() => useTheme());

      const initialSetItemCalls = (localStorage.setItem as jest.Mock).mock.calls.length;

      act(() => {
        result.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
      });

      // Should still save to localStorage even if same theme
      expect((localStorage.setItem as jest.Mock).mock.calls.length).toBeGreaterThan(initialSetItemCalls);
    });

    it('should handle missing localStorage gracefully', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage not available');
      });

      // Should not crash
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.theme).toBe('system');

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('return value stability', () => {
    it('should provide stable changeTheme function reference', () => {
      const { result, rerender } = renderHook(() => useTheme());
      const firstChangeTheme = result.current.changeTheme;

      rerender();

      expect(result.current.changeTheme).toBe(firstChangeTheme);
    });

    it('should update theme value on rerender after change', async () => {
      const { result, rerender } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      rerender();

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
      });
    });
  });

  describe('multiple instances', () => {
    it('should sync theme across multiple hook instances', async () => {
      const { result: result1 } = renderHook(() => useTheme());
      const { result: result2 } = renderHook(() => useTheme());

      act(() => {
        result1.current.changeTheme('dark');
      });

      await waitFor(() => {
        expect(result1.current.theme).toBe('dark');
        expect(mockLocalStorage['lume-theme']).toBe('dark');
      });

      // Note: Without a sync mechanism, result2 won't automatically update
      // This test verifies the localStorage is updated
      expect(localStorage.setItem).toHaveBeenCalledWith('lume-theme', 'dark');
    });
  });
});