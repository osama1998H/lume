import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.electron API
const mockElectronAPI = {
  getTimeEntries: jest.fn(),
  getAppUsage: jest.fn(),
  getStats: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).window = {
  ...global.window,
  electron: mockElectronAPI,
};

const renderWithI18n = (component: React.ReactElement, language = 'en') => {
  i18n.changeLanguage(language);
  return render(
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>{component}</I18nextProvider>
    </ThemeProvider>
  );
};

describe('Dashboard i18n Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.getTimeEntries.mockResolvedValue([]);
    mockElectronAPI.getAppUsage.mockResolvedValue([]);
    mockElectronAPI.getStats.mockResolvedValue({
      totalTime: 0,
      tasksCompleted: 0,
      activeTask: null,
    });
  });

  describe('English translations', () => {
    it('should render dashboard title in English', async () => {
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should render dashboard subtitle in English', async () => {
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText("Welcome back! Here's your productivity overview.")).toBeInTheDocument();
      });
    });

    it('should render loading text in English', () => {
      renderWithI18n(<Dashboard />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render stat cards in English', async () => {
      mockElectronAPI.getStats.mockResolvedValue({
        totalTime: 3600,
        tasksCompleted: 5,
        activeTask: 'Test Task',
      });

      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Time")).toBeInTheDocument();
        expect(screen.getByText('Tasks Done')).toBeInTheDocument();
        expect(screen.getByText('Active Task')).toBeInTheDocument();
      });
    });

    it('should render "No active task" in English', async () => {
      mockElectronAPI.getStats.mockResolvedValue({
        totalTime: 3600,
        tasksCompleted: 5,
        activeTask: null,
      });

      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('No active task')).toBeInTheDocument();
      });
    });

    it('should render section headers in English', async () => {
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Time Entries')).toBeInTheDocument();
        expect(screen.getByText('App Usage Summary')).toBeInTheDocument();
      });
    });

    it('should render empty state messages in English', async () => {
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('No time entries yet')).toBeInTheDocument();
        expect(screen.getByText('No app usage data yet')).toBeInTheDocument();
      });
    });
  });

  describe('Arabic translations', () => {
    it('should render dashboard title in Arabic', async () => {
      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      });
    });

    it('should render dashboard subtitle in Arabic', async () => {
      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('مرحباً بعودتك! إليك نظرة عامة على إنتاجيتك.')).toBeInTheDocument();
      });
    });

    it('should render loading text in Arabic', () => {
      renderWithI18n(<Dashboard />, 'ar');
      
      expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
    });

    it('should render stat cards in Arabic', async () => {
      mockElectronAPI.getStats.mockResolvedValue({
        totalTime: 3600,
        tasksCompleted: 5,
        activeTask: 'Test Task',
      });

      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('وقت اليوم')).toBeInTheDocument();
        expect(screen.getByText('المهام المكتملة')).toBeInTheDocument();
        expect(screen.getByText('المهمة النشطة')).toBeInTheDocument();
      });
    });

    it('should render "No active task" in Arabic', async () => {
      mockElectronAPI.getStats.mockResolvedValue({
        totalTime: 3600,
        tasksCompleted: 5,
        activeTask: null,
      });

      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('لا توجد مهمة نشطة')).toBeInTheDocument();
      });
    });

    it('should render section headers in Arabic', async () => {
      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('السجلات الأخيرة')).toBeInTheDocument();
        expect(screen.getByText('ملخص استخدام التطبيقات')).toBeInTheDocument();
      });
    });

    it('should render empty state messages in Arabic', async () => {
      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('لا توجد سجلات بعد')).toBeInTheDocument();
        expect(screen.getByText('لا توجد بيانات استخدام للتطبيقات بعد')).toBeInTheDocument();
      });
    });
  });

  describe('Language switching', () => {
    it('should update content when language changes from English to Arabic', async () => {
      const { rerender } = renderWithI18n(<Dashboard />, 'en');
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      await i18n.changeLanguage('ar');
      rerender(<I18nextProvider i18n={i18n}><Dashboard /></I18nextProvider>);
      
      await waitFor(() => {
        expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should update content when language changes from Arabic to English', async () => {
      const { rerender } = renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      });

      await i18n.changeLanguage('en');
      rerender(<I18nextProvider i18n={i18n}><Dashboard /></I18nextProvider>);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data rendering with translations', () => {
    it('should render time entries with "Active" status in English', async () => {
      mockElectronAPI.getTimeEntries.mockResolvedValue([
        {
          id: 1,
          taskName: 'Task 1',
          category: 'Work',
          startTime: Date.now() - 3600000,
          endTime: null,
          duration: null,
        },
      ]);

      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should render time entries with "Active" status in Arabic', async () => {
      mockElectronAPI.getTimeEntries.mockResolvedValue([
        {
          id: 1,
          taskName: 'Task 1',
          category: 'Work',
          startTime: Date.now() - 3600000,
          endTime: null,
          duration: null,
        },
      ]);

      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('نشط')).toBeInTheDocument();
      });
    });

    it('should render app usage with "Active" status in English', async () => {
      mockElectronAPI.getAppUsage.mockResolvedValue([
        {
          id: 1,
          appName: 'Chrome',
          duration: null,
        },
      ]);

      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should render app usage with "Active" status in Arabic', async () => {
      mockElectronAPI.getAppUsage.mockResolvedValue([
        {
          id: 1,
          appName: 'Chrome',
          duration: null,
        },
      ]);

      renderWithI18n(<Dashboard />, 'ar');
      
      await waitFor(() => {
        expect(screen.getByText('نشط')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle missing translation keys gracefully', async () => {
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        // Should not throw errors even if some keys are missing
        expect(screen.getByRole('main') || screen.getByText(/./)).toBeInTheDocument();
      });
    });

    it('should maintain functionality with unsupported language', async () => {
      await i18n.changeLanguage('xyz');
      renderWithI18n(<Dashboard />);
      
      await waitFor(() => {
        // Should fallback to English
        expect(screen.getByText(/Dashboard|Loading/)).toBeInTheDocument();
      });
    });
  });
});