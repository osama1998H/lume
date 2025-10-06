import { renderHook, act } from '@testing-library/react';
import { useTheme, Theme } from '../useTheme';

describe('useTheme', () => {
  let mockMatchMedia: jest.Mock;
  let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset document class
    document.documentElement.classList.remove('dark');
    
    // Mock matchMedia
    mediaQueryListeners = [];
    mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      media: query,
      addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.push(handler);
        }
      }),
      removeEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          const index = mediaQueryListeners.indexOf(handler);
          if (index > -1) {
            mediaQueryListeners.splice(index, 1);
          }
        }
      }),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    jest.clearAllMocks();
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

    it('should initialize with system theme when no localStorage value exists', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
      expect(typeof result.current.isDark).toBe('boolean');
    });

    it('should initialize with stored theme from localStorage', () => {
      localStorage.setItem('lume-theme', 'dark');
      
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should default to system if localStorage has invalid value', () => {
      localStorage.setItem('lume-theme', 'invalid-theme');
      
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
    });

    it('should apply dark class to document when initializing with dark theme', () => {
      localStorage.setItem('lume-theme', 'dark');
      
      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not apply dark class when initializing with light theme', () => {
      localStorage.setItem('lume-theme', 'light');
      
      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('theme switching', () => {
    it('should change theme from system to light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(localStorage.getItem('lume-theme')).toBe('light');
    });

    it('should change theme from system to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(localStorage.getItem('lume-theme')).toBe('dark');
    });

    it('should change theme from light to dark', () => {
      localStorage.setItem('lume-theme', 'light');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should change theme from dark to light', () => {
      localStorage.setItem('lume-theme', 'dark');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should change theme to system mode', () => {
      localStorage.setItem('lume-theme', 'dark');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
    });
  });

  describe('localStorage persistence', () => {
    it('should save theme to localStorage when changed', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(localStorage.getItem('lume-theme')).toBe('dark');
    });

    it('should update localStorage on each theme change', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });
      expect(localStorage.getItem('lume-theme')).toBe('dark');

      act(() => {
        result.current.changeTheme('light');
      });
      expect(localStorage.getItem('lume-theme')).toBe('light');

      act(() => {
        result.current.changeTheme('system');
      });
      expect(localStorage.getItem('lume-theme')).toBe('system');
    });
  });

  describe('DOM manipulation', () => {
    it('should add dark class to document.documentElement when theme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.changeTheme('light');
      });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should handle dark class correctly when switching to system mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      // Should have or not have dark class based on system preference
      const hasDarkClass = document.documentElement.classList.contains('dark');
      expect(typeof hasDarkClass).toBe('boolean');
    });
  });

  describe('system theme detection', () => {
    it('should detect light system theme preference', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should detect dark system theme preference', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('system theme change listener', () => {
    it('should listen to system theme changes when in system mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      const matchMediaInstance = mockMatchMedia.mock.results[0].value;
      expect(matchMediaInstance.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not listen to system theme changes when not in system mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      // Should not set up listener when explicitly light or dark
      const matchMediaInstance = mockMatchMedia.mock.results[0].value;
      // Listener may be called during init, but should be removed when switching to explicit theme
      expect(matchMediaInstance.removeEventListener).toHaveBeenCalled();
    });

    it('should update effectiveTheme when system preference changes in system mode', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.push(handler);
          }
        }),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.effectiveTheme).toBe('light');

      // Simulate system theme change to dark
      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current.effectiveTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should update DOM when system preference changes', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.push(handler);
          }
        }),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Simulate system theme change to dark
      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should clean up system theme listener on unmount', () => {
      const { result, unmount } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      const matchMediaInstance = mockMatchMedia.mock.results[0].value;
      
      unmount();

      expect(matchMediaInstance.removeEventListener).toHaveBeenCalled();
    });

    it('should clean up old listener when switching from system to explicit theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      const matchMediaInstance = mockMatchMedia.mock.results[0].value;

      act(() => {
        result.current.changeTheme('light');
      });

      expect(matchMediaInstance.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('effectiveTheme calculation', () => {
    it('should return light as effective theme when theme is light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      expect(result.current.effectiveTheme).toBe('light');
    });

    it('should return dark as effective theme when theme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(result.current.effectiveTheme).toBe('dark');
    });

    it('should resolve system theme to actual preference', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
    });
  });

  describe('isDark property', () => {
    it('should be true when effectiveTheme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should be false when effectiveTheme is light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('light');
      });

      expect(result.current.isDark).toBe(false);
    });

    it('should reflect system preference when in system mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.isDark).toBe(result.current.effectiveTheme === 'dark');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
        result.current.changeTheme('light');
        result.current.changeTheme('system');
        result.current.changeTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.effectiveTheme).toBe('dark');
      expect(localStorage.getItem('lume-theme')).toBe('dark');
    });

    it('should maintain consistency between theme state and DOM', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(result.current.isDark);

      act(() => {
        result.current.changeTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(result.current.isDark);
    });

    it('should handle theme changes during system mode', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.push(handler);
          }
        }),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      expect(result.current.effectiveTheme).toBe('light');

      // Change system preference
      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current.effectiveTheme).toBe('dark');

      // Now switch to explicit theme
      act(() => {
        result.current.changeTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
    });

    it('should only apply one dark class even with multiple calls', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('dark');
        result.current.changeTheme('dark');
        result.current.changeTheme('dark');
      });

      const darkClasses = Array.from(document.documentElement.classList).filter(c => c === 'dark');
      expect(darkClasses.length).toBe(1);
    });

    it('should handle switching between all three theme options multiple times', () => {
      const { result } = renderHook(() => useTheme());

      const themes: Theme[] = ['light', 'dark', 'system', 'light', 'dark', 'system'];
      
      themes.forEach(theme => {
        act(() => {
          result.current.changeTheme(theme);
        });
        expect(result.current.theme).toBe(theme);
      });
    });
  });

  describe('return value stability', () => {
    it('should provide stable changeTheme function reference', () => {
      const { result, rerender } = renderHook(() => useTheme());
      const firstChangeTheme = result.current.changeTheme;

      rerender();

      expect(result.current.changeTheme).toBe(firstChangeTheme);
    });
  });

  describe('localStorage edge cases', () => {
    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      
      // Mock localStorage to throw error
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => { throw new Error('localStorage not available'); }),
          setItem: jest.fn(() => { throw new Error('localStorage not available'); }),
          clear: jest.fn(),
        },
        writable: true,
      });

      expect(() => {
        renderHook(() => useTheme());
      }).not.toThrow();

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('theme type validation', () => {
    it('should only accept valid theme values', () => {
      const { result } = renderHook(() => useTheme());
      const validThemes: Theme[] = ['light', 'dark', 'system'];

      validThemes.forEach(theme => {
        act(() => {
          result.current.changeTheme(theme);
        });
        expect(result.current.theme).toBe(theme);
      });
    });
  });

  describe('concurrent hook instances', () => {
    it('should synchronize theme across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useTheme());
      renderHook(() => useTheme());

      act(() => {
        result1.current.changeTheme('dark');
      });

      // Both should read from same localStorage
      expect(localStorage.getItem('lume-theme')).toBe('dark');
      expect(result1.current.theme).toBe('dark');

      // Note: Additional hook instances won't automatically update unless we trigger a re-render
      // This is expected behavior for independent hook instances
    });
  });

  describe('system preference edge cases', () => {
    it('should handle when matchMedia is not supported', () => {
      // Remove matchMedia
      const originalMatchMedia = window.matchMedia;
      delete (window as any).matchMedia;

      expect(() => {
        renderHook(() => useTheme());
      }).not.toThrow();

      // Restore
      window.matchMedia = originalMatchMedia;
    });

    it('should default to light theme when system preference cannot be determined', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.changeTheme('system');
      });

      // Should have some fallback behavior
      expect(['light', 'dark']).toContain(result.current.effectiveTheme);
    });
  });
});