import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.loading': 'Loading...',
        'dashboard.title': 'Dashboard',
        'dashboard.subtitle': "Welcome back\! Here's your productivity overview.",
        'dashboard.todayTime': "Today's Time",
        'dashboard.tasksDone': 'Tasks Done',
        'dashboard.activeTask': 'Active Task',
        'dashboard.noActiveTask': 'No active task',
        'dashboard.recentEntries': 'Recent Entries',
        'dashboard.noEntries': 'No entries yet',
        'dashboard.active': 'Active',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock electron API
const mockElectronAPI = {
  getTimeEntries: jest.fn(),
  getAppUsage: jest.fn(),
  getStats: jest.fn(),
};

(window as any).electron = mockElectronAPI;

describe('Dashboard Component - Dark Mode Styles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.getTimeEntries.mockResolvedValue([
      {
        id: 1,
        task: 'Test Task',
        startTime: new Date().toISOString(),
        duration: 3600,
        category: 'Work',
      },
    ]);
    mockElectronAPI.getAppUsage.mockResolvedValue([]);
    mockElectronAPI.getStats.mockResolvedValue({
      totalTime: 7200,
      tasksCompleted: 3,
      activeTask: 'Current Task',
    });
  });

  describe('Loading state', () => {
    it('should apply dark mode classes to loading text', () => {
      const { container } = render(<Dashboard />);
      
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toHaveClass('text-gray-600');
      expect(loadingElement).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Header section', () => {
    it('should apply dark mode classes to title', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const title = screen.getByText('Dashboard');
        expect(title).toHaveClass('text-gray-900');
        expect(title).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to subtitle', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const subtitle = screen.getByText("Welcome back\! Here's your productivity overview.");
        expect(subtitle).toHaveClass('text-gray-600');
        expect(subtitle).toHaveClass('dark:text-gray-400');
      });
    });
  });

  describe('Stats cards', () => {
    it('should apply dark mode classes to card icons', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const iconContainers = document.querySelectorAll('.bg-primary-100');
        iconContainers.forEach(container => {
          expect(container).toHaveClass('dark:bg-primary-900/30');
        });
      });
    });

    it('should apply dark mode classes to card titles', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const todayTime = screen.getByText("Today's Time");
        expect(todayTime).toHaveClass('text-gray-900');
        expect(todayTime).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to stat values', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const statValue = screen.getByText('02:00:00');
        expect(statValue).toHaveClass('text-primary-600');
        expect(statValue).toHaveClass('dark:text-primary-400');
      });
    });

    it('should apply dark mode classes to green stat cards', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const tasksDone = screen.getByText('Tasks Done');
        expect(tasksDone.nextElementSibling).toHaveClass('text-green-600');
        expect(tasksDone.nextElementSibling).toHaveClass('dark:text-green-400');
      });
    });

    it('should apply dark mode classes to orange stat cards', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const activeTask = screen.getByText('Active Task');
        expect(activeTask.nextElementSibling).toHaveClass('text-orange-600');
        expect(activeTask.nextElementSibling).toHaveClass('dark:text-orange-400');
      });
    });
  });

  describe('Recent entries section', () => {
    it('should apply dark mode classes to section title', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const sectionTitle = screen.getByText('Recent Entries');
        expect(sectionTitle).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to entry items', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const entry = screen.getByText('Test Task');
        const entryContainer = entry.closest('.bg-gray-50');
        expect(entryContainer).toHaveClass('dark:bg-gray-700/50');
      });
    });

    it('should apply dark mode classes to entry text', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const taskName = screen.getByText('Test Task');
        expect(taskName).toHaveClass('text-gray-900');
        expect(taskName).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to entry metadata', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const entry = screen.getByText('Test Task');
        const timeElement = entry.parentElement?.querySelector('.text-gray-600');
        expect(timeElement).toHaveClass('dark:text-gray-400');
      });
    });

    it('should apply dark mode classes to duration', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const duration = screen.getByText('01:00:00');
        expect(duration).toHaveClass('text-primary-600');
        expect(duration).toHaveClass('dark:text-primary-400');
      });
    });
  });

  describe('Empty state', () => {
    it('should apply dark mode classes to no entries message', async () => {
      mockElectronAPI.getTimeEntries.mockResolvedValue([]);
      
      render(<Dashboard />);
      
      await waitFor(() => {
        const noEntries = screen.getByText('No entries yet');
        expect(noEntries).toHaveClass('text-gray-500');
        expect(noEntries).toHaveClass('dark:text-gray-400');
      });
    });
  });

  describe('Card components', () => {
    it('should apply card class that respects dark mode', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const cards = document.querySelectorAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });
});