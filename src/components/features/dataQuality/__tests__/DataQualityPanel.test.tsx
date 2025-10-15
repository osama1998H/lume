import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataQualityPanel from '../DataQualityPanel';
import type { TimeGap } from '../../../../types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dataQuality.title': 'Data Quality & Smart Features',
        'dataQuality.description': 'Analyze and improve your activity data',
        'dataQuality.tabs.gaps': 'Gap Detection',
        'dataQuality.tabs.gapsDescription': 'Find untracked time periods',
        'dataQuality.tabs.duplicates': 'Duplicate Detection',
        'dataQuality.tabs.duplicatesDescription': 'Find and merge similar activities',
        'dataQuality.tabs.cleanup': 'Data Cleanup',
        'dataQuality.tabs.cleanupDescription': 'Validate and fix data issues',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock child components
jest.mock('../GapDetection', () => ({
  __esModule: true,
  default: ({ startDate, endDate, onCreateActivity }: any) => (
    <div data-testid="gap-detection">
      <p>Gap Detection Component</p>
      <p>Start: {startDate}</p>
      <p>End: {endDate}</p>
      <button onClick={() => onCreateActivity?.({ start: '2025-01-15T10:00:00Z', end: '2025-01-15T11:00:00Z', duration: 3600 })}>
        Create Activity
      </button>
    </div>
  ),
}));

jest.mock('../DuplicateDetection', () => ({
  __esModule: true,
  default: ({ startDate, endDate, onMergeActivities }: any) => (
    <div data-testid="duplicate-detection">
      <p>Duplicate Detection Component</p>
      <p>Start: {startDate}</p>
      <p>End: {endDate}</p>
      <button onClick={() => onMergeActivities?.([{ id: 1, sourceType: 'manual' }, { id: 2, sourceType: 'manual' }])}>
        Merge Activities
      </button>
    </div>
  ),
}));

jest.mock('../DataCleanup', () => ({
  __esModule: true,
  default: ({ startDate, endDate, onRefresh }: any) => (
    <div data-testid="data-cleanup">
      <p>Data Cleanup Component</p>
      <p>Start: {startDate}</p>
      <p>End: {endDate}</p>
      <button onClick={() => onRefresh?.()}>Refresh</button>
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  Database: () => <div data-testid="database-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock window.electronAPI
const mockElectronAPI = {
  activities: {
    bulk: {
      update: jest.fn(),
    },
  },
};

(global as any).window = {
  ...global.window,
  electronAPI: mockElectronAPI,
};

describe('DataQualityPanel', () => {
  const mockStartDate = '2025-01-01T00:00:00Z';
  const mockEndDate = '2025-01-31T23:59:59Z';
  const mockOnClose = jest.fn();
  const mockOnCreateActivity = jest.fn();
  const mockOnRefreshActivities = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.activities.bulk.update.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByText('Data Quality & Smart Features')).toBeInTheDocument();
    });

    it('renders header with title and description', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByText('Data Quality & Smart Features')).toBeInTheDocument();
      expect(screen.getByText('Analyze and improve your activity data')).toBeInTheDocument();
    });

    it('renders close button when onClose is provided', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render close button when onClose is not provided', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('renders all three tabs', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByText('Gap Detection')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Detection')).toBeInTheDocument();
      expect(screen.getByText('Data Cleanup')).toBeInTheDocument();
    });

    it('renders tab descriptions', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByText('Find untracked time periods')).toBeInTheDocument();
      expect(screen.getByText('Find and merge similar activities')).toBeInTheDocument();
      expect(screen.getByText('Validate and fix data issues')).toBeInTheDocument();
    });

    it('renders tab icons', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
      expect(screen.getByTestId('database-icon')).toBeInTheDocument();
    });

    it('shows gaps tab as active by default', () => {
      const { container } = render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      // Find the gaps tab button and check it has active styling
      const gapsTab = screen.getByText('Gap Detection').closest('button');
      expect(gapsTab).toHaveClass('border-primary-600');
    });
  });

  describe('Tab Navigation', () => {
    it('switches to duplicates tab when clicked', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const duplicatesTab = screen.getByText('Duplicate Detection');
      fireEvent.click(duplicatesTab);

      expect(screen.getByTestId('duplicate-detection')).toBeInTheDocument();
      expect(screen.queryByTestId('gap-detection')).not.toBeInTheDocument();
    });

    it('switches to cleanup tab when clicked', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const cleanupTab = screen.getByText('Data Cleanup');
      fireEvent.click(cleanupTab);

      expect(screen.getByTestId('data-cleanup')).toBeInTheDocument();
      expect(screen.queryByTestId('gap-detection')).not.toBeInTheDocument();
    });

    it('can switch back to gaps tab', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      // Switch to duplicates
      fireEvent.click(screen.getByText('Duplicate Detection'));
      expect(screen.getByTestId('duplicate-detection')).toBeInTheDocument();

      // Switch back to gaps
      fireEvent.click(screen.getByText('Gap Detection'));
      expect(screen.getByTestId('gap-detection')).toBeInTheDocument();
      expect(screen.queryByTestId('duplicate-detection')).not.toBeInTheDocument();
    });

    it('maintains active tab styling after switching', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const duplicatesTab = screen.getByText('Duplicate Detection').closest('button');
      fireEvent.click(duplicatesTab!);

      expect(duplicatesTab).toHaveClass('border-primary-600');
    });
  });

  describe('Gap Detection Tab', () => {
    it('renders GapDetection component by default', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      expect(screen.getByTestId('gap-detection')).toBeInTheDocument();
      expect(screen.getByText('Gap Detection Component')).toBeInTheDocument();
    });

    it('passes correct props to GapDetection', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onCreateActivity={mockOnCreateActivity}
        />
      );

      expect(screen.getByText(`Start: ${mockStartDate}`)).toBeInTheDocument();
      expect(screen.getByText(`End: ${mockEndDate}`)).toBeInTheDocument();
    });

    it('forwards onCreateActivity callback', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onCreateActivity={mockOnCreateActivity}
        />
      );

      fireEvent.click(screen.getByText('Create Activity'));
      expect(mockOnCreateActivity).toHaveBeenCalledWith({
        start: '2025-01-15T10:00:00Z',
        end: '2025-01-15T11:00:00Z',
        duration: 3600,
      });
    });
  });

  describe('Duplicate Detection Tab', () => {
    it('renders DuplicateDetection component when tab is active', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      expect(screen.getByTestId('duplicate-detection')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Detection Component')).toBeInTheDocument();
    });

    it('passes correct props to DuplicateDetection', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      expect(screen.getByText(`Start: ${mockStartDate}`)).toBeInTheDocument();
      expect(screen.getByText(`End: ${mockEndDate}`)).toBeInTheDocument();
    });

    it('handles merge activities callback', async () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onRefreshActivities={mockOnRefreshActivities}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      fireEvent.click(screen.getByText('Merge Activities'));

      await waitFor(() => {
        expect(mockElectronAPI.activities.bulk.update).toHaveBeenCalledWith({
          activityIds: [
            { id: 1, sourceType: 'manual' },
            { id: 2, sourceType: 'manual' },
          ],
          operation: 'merge',
          mergeStrategy: 'longest',
        });
      });
    });

    it('calls onRefreshActivities after successful merge', async () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onRefreshActivities={mockOnRefreshActivities}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      fireEvent.click(screen.getByText('Merge Activities'));

      await waitFor(() => {
        expect(mockOnRefreshActivities).toHaveBeenCalled();
      });
    });

    it('handles merge failure gracefully', async () => {
      mockElectronAPI.activities.bulk.update.mockResolvedValueOnce({ success: false });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onRefreshActivities={mockOnRefreshActivities}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      fireEvent.click(screen.getByText('Merge Activities'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Cleanup Tab', () => {
    it('renders DataCleanup component when tab is active', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      fireEvent.click(screen.getByText('Data Cleanup'));
      expect(screen.getByTestId('data-cleanup')).toBeInTheDocument();
      expect(screen.getByText('Data Cleanup Component')).toBeInTheDocument();
    });

    it('passes correct props to DataCleanup', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      fireEvent.click(screen.getByText('Data Cleanup'));
      expect(screen.getByText(`Start: ${mockStartDate}`)).toBeInTheDocument();
      expect(screen.getByText(`End: ${mockEndDate}`)).toBeInTheDocument();
    });

    it('forwards onRefresh callback', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onRefreshActivities={mockOnRefreshActivities}
        />
      );

      fireEvent.click(screen.getByText('Data Cleanup'));
      fireEvent.click(screen.getByText('Refresh'));

      expect(mockOnRefreshActivities).toHaveBeenCalled();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('close button has correct styling', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toHaveClass('text-white', 'hover:bg-white/20', 'rounded-lg', 'p-2', 'transition-colors');
    });
  });

  describe('Styling', () => {
    it('header has gradient background', () => {
      const { container } = render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const header = container.querySelector('.bg-gradient-to-r');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('from-primary-600', 'to-primary-700');
    });

    it('panel has correct border and shadow styles', () => {
      const { container } = render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const panel = container.firstChild;
      expect(panel).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'overflow-hidden');
    });

    it('tab content area has correct background', () => {
      const { container } = render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      const tabContent = container.querySelector('.p-6.bg-gray-50');
      expect(tabContent).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing electronAPI gracefully', async () => {
      (global as any).window.electronAPI = undefined;

      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      fireEvent.click(screen.getByText('Duplicate Detection'));
      fireEvent.click(screen.getByText('Merge Activities'));

      // Should not throw error
      await waitFor(() => {
        expect(screen.getByTestId('duplicate-detection')).toBeInTheDocument();
      });

      // Restore
      (global as any).window.electronAPI = mockElectronAPI;
    });

    it('handles empty date range', () => {
      render(
        <DataQualityPanel
          startDate=""
          endDate=""
        />
      );

      expect(screen.getByText('Data Quality & Smart Features')).toBeInTheDocument();
    });

    it('handles undefined optional callbacks', () => {
      render(
        <DataQualityPanel
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      // Should render without errors
      expect(screen.getByTestId('gap-detection')).toBeInTheDocument();
    });
  });
});
