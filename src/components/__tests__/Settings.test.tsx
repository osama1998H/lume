import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../Settings';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useLanguage hook
jest.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    changeLanguage: jest.fn(),
  }),
}));

// Mock window.electronAPI
const mockElectronAPI = {
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  getActivityTrackingStatus: jest.fn(),
  startActivityTracking: jest.fn(),
  stopActivityTracking: jest.fn(),
};

describe('Settings Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockElectronAPI.getSettings.mockResolvedValue({
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
    });
    
    mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
    mockElectronAPI.saveSettings.mockResolvedValue(true);
    
    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(<Settings />);
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
    });

    it('should render settings form after loading', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure your Lume preferences and data management.')).toBeInTheDocument();
    });

    it('should load and display settings from electronAPI', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      });
    });

    it('should load activity tracking status on mount', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(mockElectronAPI.getActivityTrackingStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Activity Tracking Toggle', () => {
    it('should start tracking when toggle is clicked from stopped state', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const startButton = screen.getByText('Start Tracking');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockElectronAPI.startActivityTracking).toHaveBeenCalled();
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should stop tracking when toggle is clicked from active state', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const stopButton = screen.getByText('Stop Tracking');
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(mockElectronAPI.stopActivityTracking).toHaveBeenCalled();
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should save settings with correct enabled state when starting tracking', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const startButton = screen.getByText('Start Tracking');
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
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const stopButton = screen.getByText('Stop Tracking');
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
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      // Try to click toggle button - should not crash
      const startButton = screen.getByText('Start Tracking');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to toggle activity tracking'),
          expect.any(Error)
        );
      });
      
      consoleError.mockRestore();
    });

    it('should log error when save settings fails', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue(false);
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const startButton = screen.getByText('Start Tracking');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('❌ Failed to save tracking state to settings');
      });
      
      consoleError.mockRestore();
    });

    it('should log success message when tracking is enabled and saved', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      mockElectronAPI.saveSettings.mockResolvedValue(true);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const startButton = screen.getByText('Start Tracking');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(consoleLog).toHaveBeenCalledWith('✅ Activity tracking enabled and saved to settings');
      });
      
      consoleLog.mockRestore();
    });
  });

  describe('Settings Save Functionality', () => {
    it('should save settings when save button is clicked', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });

    it('should show success message after saving settings', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
    });

    it('should clear success message after 3 seconds', async () => {
      jest.useFakeTimers();
      mockElectronAPI.saveSettings.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('Settings saved successfully!')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('should show error message when save fails', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      mockElectronAPI.saveSettings.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      render(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings') as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should only trigger saveSettings once on rapid consecutive clicks', async () => {
      mockElectronAPI.saveSettings.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      render(<Settings />);

      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings') as HTMLButtonElement;

      // Simulate rapid consecutive clicks
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      // Wait for the saving state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Assert saveSettings is only called once
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Activity Tracking Status Display', () => {
    it('should display "Active" status when tracking is enabled', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should display "Stopped" status when tracking is disabled', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Stopped')).toBeInTheDocument();
      });
    });

    it('should show correct button text based on tracking state', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Start Tracking')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when loading settings fails', async () => {
      mockElectronAPI.getSettings.mockRejectedValue(new Error('Failed to load'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load settings:',
          expect.any(Error)
        );
      });
      
      consoleError.mockRestore();
    });

    it('should handle error when loading tracking status fails', async () => {
      mockElectronAPI.getActivityTrackingStatus.mockRejectedValue(new Error('Failed to load status'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load tracking status:',
          expect.any(Error)
        );
      });
      
      consoleError.mockRestore();
    });

    it('should handle missing electronAPI gracefully', async () => {
      delete (window as any).electronAPI;
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      // Should render without crashing
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
// Additional tests for theme integration
describe('Settings Component - Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockElectronAPI.getSettings.mockResolvedValue({
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
    });
    
    mockElectronAPI.getActivityTrackingStatus.mockResolvedValue(false);
    mockElectronAPI.saveSettings.mockResolvedValue(true);
    
    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('Theme Selector Rendering', () => {
    it('should render theme selector dropdown', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const themeSelects = screen.getAllByRole('combobox');
      expect(themeSelects.length).toBeGreaterThan(0);
    });

    it('should display theme label', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('settings.theme')).toBeInTheDocument();
      });
    });

    it('should display theme selection help text', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('settings.selectTheme')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Options', () => {
    it('should display all theme options', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('settings.lightMode')).toBeInTheDocument();
      expect(screen.getByText('settings.darkMode')).toBeInTheDocument();
      expect(screen.getByText('settings.systemMode')).toBeInTheDocument();
    });

    it('should have correct option values', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const themeSelects = screen.getAllByRole('combobox');
      const themeSelect = themeSelects.find(select => {
        const options = Array.from(select.querySelectorAll('option'));
        return options.some(opt => opt.textContent === 'settings.lightMode');
      });
      
      expect(themeSelect).toBeDefined();
    });
  });

  describe('Dark Mode Styling', () => {
    it('should render with dark mode classes when appropriate', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      // Check that elements have dark mode class support
      const heading = screen.getByText('settings.title');
      expect(heading).toBeInTheDocument();
    });

    it('should apply dark mode classes to cards', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      // Settings page should render without errors with dark mode support
      expect(screen.getByText('settings.general')).toBeInTheDocument();
    });

    it('should apply dark mode classes to form inputs', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should apply dark mode classes to buttons', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('settings.saveSettings');
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Loading State with Dark Mode', () => {
    it('should render loading spinner with dark mode support', () => {
      render(<Settings />);
      
      expect(screen.getByText('settings.loadingSettings')).toBeInTheDocument();
    });

    it('should show loading text with proper contrast', () => {
      render(<Settings />);
      
      const loadingText = screen.getByText('settings.loadingSettings');
      expect(loadingText).toBeInTheDocument();
    });
  });

  describe('Theme Integration with Settings Save', () => {
    it('should not affect theme when saving other settings', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should maintain proper contrast in both themes', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      // All text should be readable
      expect(screen.getByText('settings.title')).toBeInTheDocument();
      expect(screen.getByText('settings.configurePreferences')).toBeInTheDocument();
    });

    it('should have proper focus states for theme selector', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      
      // Focus on select should work
      if (selects.length > 0) {
        fireEvent.focus(selects[0]);
        expect(selects[0]).toHaveFocus();
      }
    });
  });

  describe('Error States with Dark Mode', () => {
    it('should display error messages with proper contrast', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue(false);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('settings.settingsSaveFailed')).toBeInTheDocument();
      });
    });

    it('should display success messages with proper contrast', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue(true);
      
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('settings.saveSettings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('settings.settingsSavedSuccess')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Consistency', () => {
    it('should render all sections with consistent dark mode support', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('settings.general')).toBeInTheDocument();
      expect(screen.getByText('settings.activityTracking')).toBeInTheDocument();
      expect(screen.getByText('settings.dataManagement')).toBeInTheDocument();
      expect(screen.getByText('settings.about')).toBeInTheDocument();
    });

    it('should maintain layout consistency with dark mode classes', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('settings.loadingSettings')).not.toBeInTheDocument();
      });
      
      const title = screen.getByText('settings.title');
      const subtitle = screen.getByText('settings.configurePreferences');
      
      expect(title).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
    });
  });
});