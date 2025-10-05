import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import Settings from '../Settings';

// Mock window.electron API
const mockElectronAPI = {
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  exportData: jest.fn(),
  clearData: jest.fn(),
};

(global as any).window = {
  ...global.window,
  electron: mockElectronAPI,
};

const renderWithI18n = (component: React.ReactElement, language = 'en') => {
  i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
};

describe('Settings i18n Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.getSettings.mockResolvedValue({
      autoTrackApps: true,
      showNotifications: true,
      minimizeToTray: false,
      autoStartTracking: false,
      defaultCategory: '',
      trackingInterval: 60,
      crashReporting: true,
      dataLocation: '/path/to/data',
    });
    mockElectronAPI.saveSettings.mockResolvedValue(true);
  });

  describe('Language selector', () => {
    it('should render language selector in English', async () => {
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Select Language')).toBeInTheDocument();
      });
    });

    it('should render language selector in Arabic', async () => {
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('اللغة')).toBeInTheDocument();
        expect(screen.getByText('اختر اللغة')).toBeInTheDocument();
      });
    });

    it('should display language options in English', async () => {
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('English');
      expect(options[1]).toHaveTextContent(/Arabic/);
    });

    it('should display language options in Arabic', async () => {
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent(/English/);
      expect(options[1]).toHaveTextContent('العربية');
    });

    it('should have correct selected value for English', async () => {
      await i18n.changeLanguage('en');
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('en');
      });
    });

    it('should have correct selected value for Arabic', async () => {
      await i18n.changeLanguage('ar');
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('ar');
      });
    });
  });

  describe('Language switching via UI', () => {
    it('should change language when selecting Arabic', async () => {
      renderWithI18n(<Settings />, 'en');
      
      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'ar' } });

      await waitFor(() => {
        expect(i18n.language).toBe('ar');
      });
    });

    it('should change language when selecting English', async () => {
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('الإعدادات العامة')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'en' } });

      await waitFor(() => {
        expect(i18n.language).toBe('en');
      });
    });

    it('should update UI when language changes through selector', async () => {
      const { rerender } = renderWithI18n(<Settings />, 'en');
      
      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'ar' } });

      await waitFor(() => {
        expect(i18n.language).toBe('ar');
      });

      rerender(<I18nextProvider i18n={i18n}><Settings /></I18nextProvider>);

      await waitFor(() => {
        expect(screen.getByText('الإعدادات العامة')).toBeInTheDocument();
        expect(screen.queryByText('General Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Settings sections in different languages', () => {
    it('should render all section headers in English', async () => {
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument();
      });
    });

    it('should render all section headers in Arabic', async () => {
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('الإعدادات العامة')).toBeInTheDocument();
      });
    });
  });

  describe('useLanguage hook integration', () => {
    it('should use useLanguage hook for language management', async () => {
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select).toBeInTheDocument();
      });

      // Hook should provide current language
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe(i18n.language);
    });

    it('should call changeLanguage from useLanguage hook', async () => {
      const languageChangeSpy = jest.spyOn(i18n, 'changeLanguage');
      
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'ar' } });

      await waitFor(() => {
        expect(languageChangeSpy).toHaveBeenCalledWith('ar');
      });

      languageChangeSpy.mockRestore();
    });
  });

  describe('RTL support through settings', () => {
    it('should reflect RTL when Arabic is selected', async () => {
      renderWithI18n(<Settings />, 'en');
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'ar' } });

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('rtl');
      });
    });

    it('should reflect LTR when English is selected', async () => {
      renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'en' } });

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('ltr');
      });
    });
  });

  describe('Persistence across re-renders', () => {
    it('should maintain selected language after re-render', async () => {
      const { rerender } = renderWithI18n(<Settings />, 'ar');
      
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('ar');
      });

      rerender(<I18nextProvider i18n={i18n}><Settings /></I18nextProvider>);

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('ar');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid language changes', async () => {
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      
      fireEvent.change(select, { target: { value: 'ar' } });
      fireEvent.change(select, { target: { value: 'en' } });
      fireEvent.change(select, { target: { value: 'ar' } });

      await waitFor(() => {
        expect(i18n.language).toBe('ar');
      });
    });

    it('should not break when settings fail to load', async () => {
      mockElectronAPI.getSettings.mockRejectedValue(new Error('Failed to load'));
      
      renderWithI18n(<Settings />);
      
      await waitFor(() => {
        // Should still render language selector
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });
  });
});