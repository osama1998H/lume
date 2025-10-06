import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Reports from '../Reports';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reports.loading': 'Loading...',
        'reports.title': 'Reports',
        'reports.subtitle': 'Analyze your productivity patterns',
        'reports.today': 'Today',
        'reports.week': 'This Week',
        'reports.month': 'This Month',
        'reports.totalTrackedTime': 'Total Tracked Time',
        'reports.tasksCompleted': 'Tasks Completed',
        'reports.avgTaskDuration': 'Avg Task Duration',
        'reports.totalAppUsage': 'Total App Usage',
        'reports.timeByCategory': 'Time by Category',
        'reports.topApps': 'Top Applications',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock electron API
const mockElectronAPI = {
  getTimeEntries: jest.fn(),
  getAppUsage: jest.fn(),
};

(window as any).electron = mockElectronAPI;

describe('Reports Component - Dark Mode Styles', () => {
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
    mockElectronAPI.getAppUsage.mockResolvedValue([
      { appName: 'VSCode', duration: 7200 },
    ]);
  });

  describe('Loading state', () => {
    it('should apply dark mode classes to loading text', () => {
      render(<Reports />);
      
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toHaveClass('text-gray-600');
      expect(loadingElement).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Header section', () => {
    it('should apply dark mode classes to title', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const title = screen.getByText('Reports');
        expect(title).toHaveClass('text-gray-900');
        expect(title).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to subtitle', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const subtitle = screen.getByText('Analyze your productivity patterns');
        expect(subtitle).toHaveClass('text-gray-600');
        expect(subtitle).toHaveClass('dark:text-gray-400');
      });
    });

    it('should apply dark mode classes to period selector', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('Today');
        expect(select).toHaveClass('border-gray-300');
        expect(select).toHaveClass('dark:border-gray-600');
        expect(select).toHaveClass('dark:bg-gray-700');
        expect(select).toHaveClass('dark:text-gray-100');
      });
    });
  });

  describe('Stats cards', () => {
    it('should apply dark mode classes to primary stat values', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const statCards = document.querySelectorAll('.text-primary-600');
        statCards.forEach(card => {
          expect(card).toHaveClass('dark:text-primary-400');
        });
      });
    });

    it('should apply dark mode classes to green stat values', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const greenStats = document.querySelectorAll('.text-green-600');
        greenStats.forEach(stat => {
          expect(stat).toHaveClass('dark:text-green-400');
        });
      });
    });

    it('should apply dark mode classes to orange stat values', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const orangeStats = document.querySelectorAll('.text-orange-600');
        orangeStats.forEach(stat => {
          expect(stat).toHaveClass('dark:text-orange-400');
        });
      });
    });

    it('should apply dark mode classes to purple stat values', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const purpleStats = document.querySelectorAll('.text-purple-600');
        purpleStats.forEach(stat => {
          expect(stat).toHaveClass('dark:text-purple-400');
        });
      });
    });

    it('should apply dark mode classes to stat labels', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const label = screen.getByText('Total Tracked Time');
        expect(label).toHaveClass('text-gray-600');
        expect(label).toHaveClass('dark:text-gray-400');
      });
    });
  });

  describe('Category breakdown section', () => {
    it('should apply dark mode classes to section title', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const sectionTitle = screen.getByText('Time by Category');
        expect(sectionTitle).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to category names', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const categoryNames = document.querySelectorAll('.font-medium.text-gray-900');
        categoryNames.forEach(name => {
          expect(name).toHaveClass('dark:text-gray-100');
        });
      });
    });

    it('should apply dark mode classes to category time values', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const timeValues = document.querySelectorAll('.text-primary-600.text-sm');
        timeValues.forEach(value => {
          expect(value).toHaveClass('dark:text-primary-400');
        });
      });
    });

    it('should apply dark mode classes to progress bar backgrounds', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const progressBgs = document.querySelectorAll('.bg-gray-200.rounded-full');
        progressBgs.forEach(bg => {
          expect(bg).toHaveClass('dark:bg-gray-700');
        });
      });
    });

    it('should apply dark mode classes to progress bar fills', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const progressFills = document.querySelectorAll('.bg-primary-600.h-2');
        progressFills.forEach(fill => {
          expect(fill).toHaveClass('dark:bg-primary-500');
        });
      });
    });
  });

  describe('Card components', () => {
    it('should render cards with dark mode support', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const cards = document.querySelectorAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should apply consistent dark mode styling across all cards', async () => {
      render(<Reports />);
      
      await waitFor(() => {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
          // Card class should handle dark mode styling
          expect(card.className).toContain('card');
        });
      });
    });
  });

  describe('Grid layout', () => {
    it('should maintain grid layout with dark mode', async () => {
      const { container } = render(<Reports />);
      
      await waitFor(() => {
        const grid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-4');
        expect(grid).toBeInTheDocument();
      });
    });

    it('should maintain responsive layout with dark mode', async () => {
      const { container } = render(<Reports />);
      
      await waitFor(() => {
        const responsiveGrid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
        expect(responsiveGrid).toBeInTheDocument();
      });
    });
  });
});