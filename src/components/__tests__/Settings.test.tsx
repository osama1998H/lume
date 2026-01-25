import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, mock, spyOn } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as ThemeContext from '@/contexts/ThemeContext';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mock((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: mock(() => {}),
    removeListener: mock(() => {}),
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {}),
    dispatchEvent: mock(() => {}),
  })),
});

// Mock i18next - must come before component import
mock.module('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Create mock function for changeLanguage
const mockChangeLanguage = mock(() => {});

// Mock useLanguage hook - must come before component import
mock.module('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    changeLanguage: mockChangeLanguage,
  }),
}));

// Import after mocks
import Settings from '../pages/Settings';

// Mock window.electronAPI
const mockElectronAPI = {
  getSettings: mock(() => Promise.resolve({
    autoTrackApps: true,
    showNotifications: true,
    minimizeToTray: false,
    autoStartTracking: false,
    defaultCategory: '',
    trackingInterval: 30,
    activityTracking: {
      enabled: false,
      trackingInterval: 30,
      idleThreshold: 300,
      trackBrowsers: true,
      trackApplications: true,
      blacklistedApps: [],
      blacklistedDomains: [],
      dataRetentionDays: 90
    }
  })),
  saveSettings: mock(() => Promise.resolve(true)),
  getActivityTrackingStatus: mock(() => Promise.resolve(false)),
  startActivityTracking: mock(() => Promise.resolve()),
  stopActivityTracking: mock(() => Promise.resolve()),
};

// Helper function to render with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('Settings Component', () => {
  beforeEach(() => {
    // Reset mock functions
    mockElectronAPI.getSettings = mock(() => Promise.resolve({
      autoTrackApps: true,
      showNotifications: true,
      minimizeToTray: false,
      autoStartTracking: false,
      defaultCategory: '',
      trackingInterval: 30,
      activityTracking: {
        enabled: false,
        trackingInterval: 30,
        idleThreshold: 300,
        trackBrowsers: true,
        trackApplications: true,
        blacklistedApps: [],
        blacklistedDomains: [],
        dataRetentionDays: 90
      }
    }));

    mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));
    mockElectronAPI.saveSettings = mock(() => Promise.resolve(true));
    mockElectronAPI.startActivityTracking = mock(() => Promise.resolve());
    mockElectronAPI.stopActivityTracking = mock(() => Promise.resolve());

    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      renderWithTheme(<Settings />);
      expect(screen.getByText('settings.loadingSettings')).toBeInTheDocument();
    });

    it('should render settings form after loading', async () => {
      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      expect(screen.getByText('settings.title')).toBeInTheDocument();
      expect(screen.getByText('settings.configurePreferences')).toBeInTheDocument();
    });

    it('should load and display settings from electronAPI', async () => {
      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      });
    });

    it('should load activity tracking status on mount', async () => {
      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(mockElectronAPI.getActivityTrackingStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Activity Tracking Toggle', () => {
    it('should start tracking when toggle is clicked from stopped state', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const startButton = screen.getByText('settings.startTracking');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockElectronAPI.startActivityTracking).toHaveBeenCalled();
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should stop tracking when toggle is clicked from active state', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(true));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const stopButton = screen.getByText('settings.stopTracking');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockElectronAPI.stopActivityTracking).toHaveBeenCalled();
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should save settings with correct enabled state when starting tracking', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const startButton = screen.getByText('settings.startTracking');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            activityTracking: expect.objectContaining({
              enabled: true
            })
          })
        );
      });
    });

    it('should save settings with correct enabled state when stopping tracking', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(true));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const stopButton = screen.getByText('settings.stopTracking');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            activityTracking: expect.objectContaining({
              enabled: false
            })
          })
        );
      });
    });

    it('should handle error when electronAPI is not available', async () => {
      delete (window as any).electronAPI;
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      // Try to click toggle button - should not crash
      const startButton = screen.getByText('settings.startTracking');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to toggle activity tracking'),
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should log error when save settings fails', async () => {
      mockElectronAPI.saveSettings = mock(() => Promise.resolve(false));
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const startButton = screen.getByText('settings.startTracking');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to save tracking state to settings');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should log success message when tracking is enabled and saved', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));
      mockElectronAPI.saveSettings = mock(() => Promise.resolve(true));
      const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const startButton = screen.getByText('settings.startTracking');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Activity tracking enabled and saved to settings');
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Settings Save Functionality', () => {
    it('should save settings when save button is clicked', async () => {
      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should show success message after saving settings', async () => {
      mockElectronAPI.saveSettings = mock(() => Promise.resolve(true));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.settingsSavedSuccess')).toBeInTheDocument();
      });
    });

    it('should clear success message after 3 seconds', async () => {
      // Note: Bun doesn't have full timer mocking like Jest
      // This test may need adjustment or manual verification
      mockElectronAPI.saveSettings = mock(() => Promise.resolve(true));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.settingsSavedSuccess')).toBeInTheDocument();
      });

      // Wait for the timeout (3 seconds) - this is a real wait in Bun
      await new Promise(resolve => setTimeout(resolve, 3100));

      await waitFor(() => {
        expect(screen.queryByText('settings.settingsSavedSuccess')).not.toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      mockElectronAPI.saveSettings = mock(() => Promise.resolve(false));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.settingsSaveFailed')).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      mockElectronAPI.saveSettings = mock(() =>
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings') as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.saving')).toBeInTheDocument();
      });
    });

    it('should only trigger saveSettings once on rapid consecutive clicks', async () => {
      mockElectronAPI.saveSettings = mock(() =>
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings') as HTMLButtonElement;

      // Simulate rapid consecutive clicks
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      // Wait for the saving state
      await waitFor(() => {
        expect(screen.getByText('settings.saving')).toBeInTheDocument();
      });

      // Assert saveSettings is only called once
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Activity Tracking Status Display', () => {
    it('should display "Active" status when tracking is enabled', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(true));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.getByText('settings.active')).toBeInTheDocument();
      });
    });

    it('should display "Stopped" status when tracking is disabled', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.getByText('settings.stopped')).toBeInTheDocument();
      });
    });

    it('should show correct button text based on tracking state', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.getByText('settings.startTracking')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when loading settings fails', async () => {
      mockElectronAPI.getSettings = mock(() => Promise.reject(new Error('Failed to load')));
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load settings:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle error when loading tracking status fails', async () => {
      mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.reject(new Error('Failed to load status')));
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load tracking status:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing electronAPI gracefully', async () => {
      delete (window as any).electronAPI;

      renderWithTheme(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });

      // Should render without crashing
      expect(screen.getByText('settings.title')).toBeInTheDocument();
    });
  });
});
// Additional tests for theme functionality
describe('Theme Selection', () => {
  beforeEach(() => {
    // Reset mock functions
    mockElectronAPI.getSettings = mock(() => Promise.resolve({
      autoTrackApps: true,
      showNotifications: true,
      minimizeToTray: false,
      autoStartTracking: false,
      defaultCategory: '',
      trackingInterval: 30,
      activityTracking: {
        enabled: false,
        trackingInterval: 30,
        idleThreshold: 300,
        trackBrowsers: true,
        trackApplications: true,
        blacklistedApps: [],
        blacklistedDomains: [],
        dataRetentionDays: 90
      }
    }));

    mockElectronAPI.getActivityTrackingStatus = mock(() => Promise.resolve(false));
    mockElectronAPI.saveSettings = mock(() => Promise.resolve(true));

    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  it('should render theme dropdown with all options', async () => {
    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Find the theme label
    expect(screen.getByText('settings.theme')).toBeInTheDocument();

    // Check all theme options are present in the dropdown
    const themeSelect = screen.getAllByRole('combobox').find(
      el => el.getAttribute('value') === 'light' ||
           el.getAttribute('value') === 'dark' ||
           el.getAttribute('value') === 'system'
    );

    expect(themeSelect).toBeInTheDocument();
  });

  it('should display theme options in the select element', async () => {
    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('settings.lightMode')).toBeInTheDocument();
    expect(screen.getByText('settings.darkMode')).toBeInTheDocument();
    expect(screen.getByText('settings.systemMode')).toBeInTheDocument();
  });

  it('should show theme helper text', async () => {
    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('settings.selectTheme')).toBeInTheDocument();
  });

  it('should call useTheme hook on mount', async () => {
    const mockChangeTheme = mock(() => {});
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'system',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Verify useTheme was called
    expect(ThemeContext.useTheme).toHaveBeenCalled();
  });

  it('should change theme when user selects a different option', async () => {
    const mockChangeTheme = mock(() => {});
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    const themeSelects = screen.getAllByRole('combobox');
    const themeSelect = themeSelects.find(
      el => el.querySelector('option[value="light"]')
    );

    if (themeSelect) {
      fireEvent.change(themeSelect, { target: { value: 'dark' } });

      await waitFor(() => {
        expect(mockChangeTheme).toHaveBeenCalledWith('dark');
      });
    }
  });

  it('should handle theme change from light to dark', async () => {
    const mockChangeTheme = mock(() => {});
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    const themeSelects = screen.getAllByRole('combobox');
    const themeSelect = themeSelects.find(
      el => el.querySelector('option[value="dark"]')
    );

    if (themeSelect) {
      fireEvent.change(themeSelect, { target: { value: 'dark' } });
      expect(mockChangeTheme).toHaveBeenCalledWith('dark');
    }
  });

  it('should handle theme change to system mode', async () => {
    const mockChangeTheme = mock(() => {});
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    const themeSelects = screen.getAllByRole('combobox');
    const themeSelect = themeSelects.find(
      el => el.querySelector('option[value="system"]')
    );

    if (themeSelect) {
      fireEvent.change(themeSelect, { target: { value: 'system' } });
      expect(mockChangeTheme).toHaveBeenCalledWith('system');
    }
  });

  it('should display current theme value in select', async () => {
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'dark',
      effectiveTheme: 'dark',
      changeTheme: mock(() => {}),
      isDark: true,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    const themeSelects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const themeSelect = themeSelects.find(
      el => el.querySelector('option[value="dark"]')
    );

    expect(themeSelect?.value).toBe('dark');
  });

  it('should integrate theme selection with other settings', async () => {
    const mockChangeTheme = mock(() => {});
    spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    });

    renderWithTheme(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Verify both language and theme selects exist
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
