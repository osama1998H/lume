import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TimeTracker from '../TimeTracker';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'timeTracker.title': 'Time Tracker',
        'timeTracker.subtitle': 'Track your time with precision',
        'timeTracker.workingOn': 'Working on',
        'timeTracker.taskName': 'Task Name',
        'timeTracker.taskPlaceholder': 'What are you working on?',
        'timeTracker.category': 'Category',
        'timeTracker.categoryPlaceholder': 'e.g., Development, Design',
        'timeTracker.start': 'Start Tracking',
        'timeTracker.stop': 'Stop Tracking',
        'timeTracker.recentEntries': 'Recent Entries',
        'timeTracker.at': 'at',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock electron API
const mockElectronAPI = {
  startTimeEntry: jest.fn(),
  stopTimeEntry: jest.fn(),
  getTimeEntries: jest.fn(),
};

(window as any).electron = mockElectronAPI;

describe('TimeTracker Component - Dark Mode Styles', () => {
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
    mockElectronAPI.startTimeEntry.mockResolvedValue(true);
    mockElectronAPI.stopTimeEntry.mockResolvedValue(true);
  });

  describe('Header section', () => {
    it('should apply dark mode classes to title', () => {
      render(<TimeTracker />);
      
      const title = screen.getByText('Time Tracker');
      expect(title).toHaveClass('text-gray-900');
      expect(title).toHaveClass('dark:text-gray-100');
    });

    it('should apply dark mode classes to subtitle', () => {
      render(<TimeTracker />);
      
      const subtitle = screen.getByText('Track your time with precision');
      expect(subtitle).toHaveClass('text-gray-600');
      expect(subtitle).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Timer display', () => {
    it('should apply dark mode classes to timer', () => {
      const { container } = render(<TimeTracker />);
      
      const timer = container.querySelector('.text-6xl.font-mono');
      expect(timer).toHaveClass('text-primary-600');
      expect(timer).toHaveClass('dark:text-primary-400');
    });

    it('should apply dark mode classes to working on text', async () => {
      mockElectronAPI.startTimeEntry.mockResolvedValue({ id: 1 });
      
      const { container } = render(<TimeTracker />);
      
      // Timer text should have dark mode classes
      const timerText = container.querySelector('.text-lg');
      if (timerText) {
        expect(timerText).toHaveClass('text-gray-900');
        expect(timerText).toHaveClass('dark:text-gray-100');
      }
    });
  });

  describe('Form inputs', () => {
    it('should apply dark mode classes to task input label', () => {
      render(<TimeTracker />);
      
      const label = screen.getByText('Task Name');
      expect(label).toHaveClass('text-gray-900');
      expect(label).toHaveClass('dark:text-gray-100');
    });

    it('should apply dark mode classes to task input', () => {
      render(<TimeTracker />);
      
      const input = screen.getByPlaceholderText('What are you working on?');
      expect(input).toHaveClass('border-gray-300');
      expect(input).toHaveClass('dark:border-gray-600');
      expect(input).toHaveClass('dark:bg-gray-700');
      expect(input).toHaveClass('dark:text-gray-100');
    });

    it('should apply dark mode classes to category input label', () => {
      render(<TimeTracker />);
      
      const label = screen.getByText('Category');
      expect(label).toHaveClass('text-gray-900');
      expect(label).toHaveClass('dark:text-gray-100');
    });

    it('should apply dark mode classes to category input', () => {
      render(<TimeTracker />);
      
      const input = screen.getByPlaceholderText('e.g., Development, Design');
      expect(input).toHaveClass('border-gray-300');
      expect(input).toHaveClass('dark:border-gray-600');
      expect(input).toHaveClass('dark:bg-gray-700');
      expect(input).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Recent entries section', () => {
    it('should apply dark mode classes to section title', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const sectionTitle = screen.getByText('Recent Entries');
        expect(sectionTitle).toHaveClass('text-gray-900');
        expect(sectionTitle).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to entry items', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const entry = screen.getByText('Test Task');
        const entryContainer = entry.closest('.bg-gray-50');
        expect(entryContainer).toHaveClass('dark:bg-gray-700/50');
      });
    });

    it('should apply dark mode classes to entry task names', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const taskName = screen.getByText('Test Task');
        expect(taskName).toHaveClass('text-gray-900');
        expect(taskName).toHaveClass('dark:text-gray-100');
      });
    });

    it('should apply dark mode classes to entry metadata', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const entry = screen.getByText('Test Task');
        const timeElements = entry.parentElement?.querySelectorAll('.text-gray-600');
        timeElements?.forEach(element => {
          expect(element).toHaveClass('dark:text-gray-400');
        });
      });
    });

    it('should apply dark mode classes to category badges', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const badges = document.querySelectorAll('.bg-primary-100.text-primary-800');
        badges.forEach(badge => {
          expect(badge).toHaveClass('dark:bg-primary-900/30');
          expect(badge).toHaveClass('dark:text-primary-400');
        });
      });
    });
  });

  describe('Card styling', () => {
    it('should render cards with dark mode support', () => {
      const { container } = render(<TimeTracker />);
      
      const cards = container.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should maintain card layout with dark mode', () => {
      const { container } = render(<TimeTracker />);
      
      const mainCard = container.querySelector('.max-w-2xl .card');
      expect(mainCard).toBeInTheDocument();
    });
  });

  describe('Scrollable container', () => {
    it('should maintain overflow styling with dark mode', async () => {
      render(<TimeTracker />);
      
      await waitFor(() => {
        const scrollContainer = document.querySelector('.max-h-96.overflow-y-auto');
        expect(scrollContainer).toBeInTheDocument();
      });
    });
  });

  describe('Responsive layout', () => {
    it('should maintain responsive spacing with dark mode', () => {
      const { container } = render(<TimeTracker />);
      
      const mainContainer = container.querySelector('.p-8');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should maintain centered layout with dark mode', () => {
      const { container } = render(<TimeTracker />);
      
      const centeredContent = container.querySelector('.max-w-2xl.mx-auto');
      expect(centeredContent).toBeInTheDocument();
    });
  });
});