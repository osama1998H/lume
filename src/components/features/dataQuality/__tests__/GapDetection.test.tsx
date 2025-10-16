import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GapDetection from '../GapDetection';
import type { TimeGap } from '@/types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'dataQuality.gaps.totalGaps': 'Total Gaps',
        'dataQuality.gaps.untrackedTime': 'Untracked Time',
        'dataQuality.gaps.averageGap': 'Average Gap',
        'dataQuality.gaps.longestGap': 'Longest Gap',
        'dataQuality.gaps.minGapDuration': 'Minimum Gap Duration (minutes)',
        'dataQuality.gaps.detectedGaps': 'Detected Gaps',
        'dataQuality.gaps.noGaps': 'No gaps detected in the selected time range',
        'dataQuality.gaps.fillGap': 'Fill Gap',
        'dataQuality.gaps.after': 'After',
        'dataQuality.gaps.before': 'Before',
        'dataQuality.gaps.loadError': 'Failed to load gap data',
      };
      return translations[key] || fallback || key;
    },
  }),
}));

// Mock format utils
jest.mock('../../../../utils/format', () => ({
  formatDuration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },
  formatTime: (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

// Mock window.electronAPI
const mockElectronAPI = {
  dataQuality: {
    gaps: {
      detect: jest.fn(),
      getStatistics: jest.fn(),
    },
  },
};

(global as any).window ??= global;
(global as any).window.electronAPI = mockElectronAPI;

describe('GapDetection', () => {
  const mockStartDate = '2025-01-01T00:00:00Z';
  const mockEndDate = '2025-01-31T23:59:59Z';
  const mockOnCreateActivity = jest.fn();

  const mockGaps: TimeGap[] = [
    {
      startTime: '2025-01-15T10:00:00Z',
      endTime: '2025-01-15T10:30:00Z',
      duration: 1800, // 30 minutes
      beforeActivity: {
        id: 1,
        title: 'Meeting',
        sourceType: 'manual',
        type: 'time_entry',
        startTime: '2025-01-15T09:00:00Z',
        endTime: '2025-01-15T10:00:00Z',
        duration: 3600,
        categoryId: undefined,
        isEditable: true,
        editableFields: ['title', 'startTime', 'endTime', 'categoryId']
      },
      afterActivity: {
        id: 2,
        title: 'Work Session',
        sourceType: 'manual',
        type: 'time_entry',
        startTime: '2025-01-15T10:30:00Z',
        endTime: '2025-01-15T11:30:00Z',
        duration: 3600,
        categoryId: undefined,
        isEditable: true,
        editableFields: ['title', 'startTime', 'endTime', 'categoryId']
      },
    },
    {
      startTime: '2025-01-15T14:00:00Z',
      endTime: '2025-01-15T15:00:00Z',
      duration: 3600, // 1 hour
    },
  ];

  const mockStatistics = {
    totalGaps: 5,
    totalUntrackedSeconds: 7200,
    averageGapSeconds: 1440,
    longestGapSeconds: 3600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.dataQuality.gaps.detect.mockResolvedValue(mockGaps);
    mockElectronAPI.dataQuality.gaps.getStatistics.mockResolvedValue(mockStatistics);
  });

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      mockElectronAPI.dataQuality.gaps.detect.mockImplementation(() => new Promise(() => {}));

      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loading spinner after data loads', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when loading fails', async () => {
      mockElectronAPI.dataQuality.gaps.detect.mockRejectedValueOnce(new Error('Failed to load'));

      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load gap data')).toBeInTheDocument();
      });
    });

    it('shows alert icon in error state', async () => {
      mockElectronAPI.dataQuality.gaps.detect.mockRejectedValueOnce(new Error('Failed'));

      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Cards', () => {
    it('renders all four statistics cards', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Gaps')).toBeInTheDocument();
        expect(screen.getByText('Untracked Time')).toBeInTheDocument();
        expect(screen.getByText('Average Gap')).toBeInTheDocument();
        expect(screen.getByText('Longest Gap')).toBeInTheDocument();
      });
    });

    it('displays total gaps statistic', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // totalGaps
      });
    });

    it('displays untracked time statistic', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('2h 0m')).toBeInTheDocument(); // 7200 seconds
      });
    });

    it('displays average gap statistic', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('24m')).toBeInTheDocument(); // 1440 seconds
      });
    });

    it('displays longest gap statistic', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600 seconds
      });
    });

    it('renders statistic card icons', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('alert-icon')).toHaveLength(1);
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
        expect(screen.getByTestId('trending-icon')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Controls', () => {
    it('renders minimum gap duration filter', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Minimum Gap Duration (minutes)')).toBeInTheDocument();
      });
    });

    it('renders slider with default value of 5 minutes', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        expect(slider).toHaveValue('5');
      });
    });

    it('displays current slider value', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5 min')).toBeInTheDocument();
      });
    });

    it('updates value when slider changes', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '15' } });
        expect(screen.getByText('15 min')).toBeInTheDocument();
      });
    });

    it('refetches gaps when filter changes', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledTimes(1);
      });

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '10' } });

      await waitFor(() => {
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledTimes(2);
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledWith(
          mockStartDate,
          mockEndDate,
          10
        );
      });
    });
  });

  describe('Gaps List', () => {
    it('renders detected gaps header', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Detected Gaps')).toBeInTheDocument();
      });
    });

    it('displays all gaps', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('30m')).toBeInTheDocument();
        expect(screen.getByText('1h 0m')).toBeInTheDocument();
      });
    });

    it('shows empty state when no gaps', async () => {
      mockElectronAPI.dataQuality.gaps.detect.mockResolvedValueOnce([]);

      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No gaps detected in the selected time range')).toBeInTheDocument();
      });
    });

    it('displays gap time ranges', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        // Check that formatTime was called and times are displayed
        const timeRanges = screen.getAllByText(/AM|PM/);
        expect(timeRanges.length).toBeGreaterThan(0);
      });
    });

    it('displays before activity when available', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/After:/)).toBeInTheDocument();
        expect(screen.getByText(/Meeting/)).toBeInTheDocument();
      });
    });

    it('displays after activity when available', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Before:/)).toBeInTheDocument();
        expect(screen.getByText(/Work Session/)).toBeInTheDocument();
      });
    });

    it('renders Fill Gap button for each gap', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const fillButtons = screen.getAllByText('Fill Gap');
        expect(fillButtons).toHaveLength(2);
      });
    });
  });

  describe('Gap Severity', () => {
    it('applies low severity color for gaps < 15 minutes', async () => {
      const shortGap: TimeGap = {
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T10:10:00Z',
        duration: 600, // 10 minutes
      };

      mockElectronAPI.dataQuality.gaps.detect.mockResolvedValueOnce([shortGap]);

      const { container } = render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const badge = container.querySelector('.text-yellow-600');
        expect(badge).toBeInTheDocument();
      });
    });

    it('applies medium severity color for gaps 15-60 minutes', async () => {
      const mediumGap: TimeGap = {
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T10:30:00Z',
        duration: 1800, // 30 minutes
      };

      mockElectronAPI.dataQuality.gaps.detect.mockResolvedValueOnce([mediumGap]);

      const { container } = render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const badge = container.querySelector('.text-orange-600');
        expect(badge).toBeInTheDocument();
      });
    });

    it('applies high severity color for gaps > 60 minutes', async () => {
      const longGap: TimeGap = {
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        duration: 7200, // 2 hours
      };

      mockElectronAPI.dataQuality.gaps.detect.mockResolvedValueOnce([longGap]);

      const { container } = render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const badge = container.querySelector('.text-red-600');
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Fill Gap Interaction', () => {
    it('calls onCreateActivity when Fill Gap is clicked', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
          onCreateActivity={mockOnCreateActivity}
        />
      );

      await waitFor(() => {
        const fillButtons = screen.getAllByText('Fill Gap');
        fireEvent.click(fillButtons[0]!);
      });

      expect(mockOnCreateActivity).toHaveBeenCalledWith(mockGaps[0]);
    });

    it('does not error when onCreateActivity is not provided', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const fillButtons = screen.getAllByText('Fill Gap');
        fireEvent.click(fillButtons[0]!);
      });

      // Should not throw error
      expect(mockOnCreateActivity).not.toHaveBeenCalled();
    });

    it('Fill Gap button has Plus icon', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const plusIcons = screen.getAllByTestId('plus-icon');
        expect(plusIcons).toHaveLength(2);
      });
    });
  });

  describe('Data Loading', () => {
    it('fetches gaps and statistics on mount', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledWith(
          mockStartDate,
          mockEndDate,
          5
        );
        expect(mockElectronAPI.dataQuality.gaps.getStatistics).toHaveBeenCalledWith(
          mockStartDate,
          mockEndDate,
          5
        );
      });
    });

    it('refetches when date range changes', async () => {
      const { rerender } = render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledTimes(1);
      });

      const newEndDate = '2025-02-28T23:59:59Z';
      rerender(
        <GapDetection
          startDate={mockStartDate}
          endDate={newEndDate}
        />
      );

      await waitFor(() => {
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenCalledTimes(2);
        expect(mockElectronAPI.dataQuality.gaps.detect).toHaveBeenLastCalledWith(
          mockStartDate,
          newEndDate,
          5
        );
      });
    });

    it('handles missing electronAPI gracefully', async () => {
      (global as any).window.electronAPI = undefined;

      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        // Should show loading spinner indefinitely or handle gracefully
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      // Restore
      (global as any).window.electronAPI = mockElectronAPI;
    });
  });

  describe('Visual Styling', () => {
    it('renders gap list when data is available', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Detected Gaps')).toBeInTheDocument();
      });
    });

    it('statistics cards are visible', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Gaps')).toBeInTheDocument();
        expect(screen.getByText('Untracked Time')).toBeInTheDocument();
      });
    });

    it('Fill Gap buttons are visible for each gap', async () => {
      render(
        <GapDetection
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const fillButtons = screen.getAllByText('Fill Gap');
        expect(fillButtons.length).toBe(2);
      });
    });
  });
});
