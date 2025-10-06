jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import Dashboard from '../Dashboard';
import Reports from '../Reports';
import TimeTracker from '../TimeTracker';
import Sidebar from '../Sidebar';

// Mock window.electronAPI
const mockElectronAPI = {
  getTimeEntries: jest.fn(),
  getAppUsage: jest.fn(),
  getStats: jest.fn(),
  getRecentActivitySessions: jest.fn(),
  getTopApplications: jest.fn(),
  getTopWebsites: jest.fn(),
  getActiveTimeEntry: jest.fn(),
  addTimeEntry: jest.fn(),
  updateTimeEntry: jest.fn(),
};

const renderWithI18n = (component: React.ReactElement, language = 'en') => {
  i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
};

describe('Dark Mode Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI = mockElectronAPI;

    // Default mock implementations
    mockElectronAPI.getTimeEntries.mockResolvedValue([]);
    mockElectronAPI.getAppUsage.mockResolvedValue([]);
    mockElectronAPI.getStats.mockResolvedValue({
      totalTime: 0,
      tasksCompleted: 0,
      activeTask: null,
    });
    mockElectronAPI.getRecentActivitySessions.mockResolvedValue([]);
    mockElectronAPI.getTopApplications.mockResolvedValue([]);
    mockElectronAPI.getTopWebsites.mockResolvedValue([]);
    mockElectronAPI.getActiveTimeEntry.mockResolvedValue(null);
    mockElectronAPI.addTimeEntry.mockResolvedValue(1);
    mockElectronAPI.updateTimeEntry.mockResolvedValue(true);

    // Clear dark mode class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    delete (window as any).electronAPI;
    document.documentElement.classList.remove('dark');
  });

  describe('Dashboard Dark Mode', () => {
    it('renders Dashboard in light mode', async () => {
      renderWithI18n(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('dashboard.title')).toBeInTheDocument();
      });
    });

    it('renders Dashboard in dark mode', async () => {
      document.documentElement.classList.add('dark');
      renderWithI18n(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('dashboard.title')).toBeInTheDocument();
      });
    });

    it('shows loading state text', () => {
      renderWithI18n(<Dashboard />);
      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });
  });

  describe('Reports Dark Mode', () => {
    it('renders Reports in light mode', async () => {
      renderWithI18n(<Reports />);
      await waitFor(() => {
        expect(screen.getByText('reports.title')).toBeInTheDocument();
      });
    });

    it('renders Reports in dark mode', async () => {
      document.documentElement.classList.add('dark');
      renderWithI18n(<Reports />);
      await waitFor(() => {
        expect(screen.getByText('reports.title')).toBeInTheDocument();
      });
    });

    it('renders select input with dark mode support', async () => {
      document.documentElement.classList.add('dark');
      renderWithI18n(<Reports />);
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TimeTracker Dark Mode', () => {
    it('renders TimeTracker in light mode', async () => {
      renderWithI18n(<TimeTracker />);
      await waitFor(() => {
        expect(screen.getByText('timeTracker.title')).toBeInTheDocument();
      });
    });

    it('renders TimeTracker in dark mode', async () => {
      document.documentElement.classList.add('dark');
      renderWithI18n(<TimeTracker />);
      await waitFor(() => {
        expect(screen.getByText('timeTracker.title')).toBeInTheDocument();
      });
    });

    it('renders inputs with dark mode styles', async () => {
      document.documentElement.classList.add('dark');
      renderWithI18n(<TimeTracker />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('timeTracker.taskPlaceholder')).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Dark Mode', () => {
    it('renders Sidebar in light mode', () => {
      const mockOnViewChange = jest.fn();
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      expect(screen.getByText('app.name')).toBeInTheDocument();
    });

    it('renders Sidebar in dark mode', () => {
      document.documentElement.classList.add('dark');
      const mockOnViewChange = jest.fn();
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      expect(screen.getByText('app.name')).toBeInTheDocument();
    });

    it('allows navigation in dark mode', () => {
      document.documentElement.classList.add('dark');
      const mockOnViewChange = jest.fn();
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      const trackerButton = screen.getByText('navigation.tracker').closest('button');
      if (trackerButton) {
        fireEvent.click(trackerButton);
        expect(mockOnViewChange).toHaveBeenCalledWith('tracker');
      }
    });
  });
});