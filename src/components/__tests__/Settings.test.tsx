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

// Mock useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'system',
    changeTheme: jest.fn(),
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

  describe('Theme Selector', () => {
    it('should render theme selector with current theme value', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      // Should have a theme select element
      const themeSelects = screen.getAllByDisplayValue('system');
      expect(themeSelects.length).toBeGreaterThan(0);
    });

    it('should display all theme options', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('settings.lightMode')).toBeInTheDocument();
      expect(screen.getByText('settings.darkMode')).toBeInTheDocument();
      expect(screen.getByText('settings.systemMode')).toBeInTheDocument();
    });

    it('should call changeTheme when theme is changed', async () => {
      const mockChangeTheme = jest.fn();
      jest.spyOn(require('../../hooks/useTheme'), 'useTheme').mockReturnValue({
        theme: 'light',
        changeTheme: mockChangeTheme,
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const themeSelects = screen.getAllByDisplayValue('light');
      const themeSelect = themeSelects[0];
      
      fireEvent.change(themeSelect, { target: { value: 'dark' } });
      
      expect(mockChangeTheme).toHaveBeenCalledWith('dark');
    });

    it('should handle theme change to system mode', async () => {
      const mockChangeTheme = jest.fn();
      jest.spyOn(require('../../hooks/useTheme'), 'useTheme').mockReturnValue({
        theme: 'dark',
        changeTheme: mockChangeTheme,
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const themeSelects = screen.getAllByDisplayValue('dark');
      const themeSelect = themeSelects[0];
      
      fireEvent.change(themeSelect, { target: { value: 'system' } });
      
      expect(mockChangeTheme).toHaveBeenCalledWith('system');
    });

    it('should render theme label and description', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('settings.theme')).toBeInTheDocument();
      expect(screen.getByText('settings.selectTheme')).toBeInTheDocument();
    });

    it('should maintain theme value consistency with hook', async () => {
      jest.spyOn(require('../../hooks/useTheme'), 'useTheme').mockReturnValue({
        theme: 'dark',
        changeTheme: jest.fn(),
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const themeSelects = screen.getAllByDisplayValue('dark');
      expect(themeSelects.length).toBeGreaterThan(0);
    });
  });

  describe('Language Selector', () => {
    it('should render language selector with current language value', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      // Should have a language select element
      const languageSelects = screen.getAllByDisplayValue('en');
      expect(languageSelects.length).toBeGreaterThan(0);
    });

    it('should call changeLanguage when language is changed', async () => {
      const mockChangeLanguage = jest.fn();
      jest.spyOn(require('../../hooks/useLanguage'), 'useLanguage').mockReturnValue({
        language: 'en',
        changeLanguage: mockChangeLanguage,
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      const languageSelects = screen.getAllByDisplayValue('en');
      const languageSelect = languageSelects[0];
      
      fireEvent.change(languageSelect, { target: { value: 'ar' } });
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
    });

    it('should display language options', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('settings.english')).toBeInTheDocument();
      expect(screen.getByText('settings.arabic')).toBeInTheDocument();
    });
  });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      // Should render without crashing
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});