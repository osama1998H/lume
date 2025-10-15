import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalendarHeatmap } from '../CalendarHeatmap';
import type { HeatmapDay } from '../../../../types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Handle month translations
      if (key.startsWith('common.months.')) {
        return key.split('.').pop() || key;
      }
      // Handle day translations
      if (key.startsWith('common.daysOfWeekShort.')) {
        return key.split('.').pop() || key;
      }
      // Handle other translations
      if (key === 'common.less') return 'Less';
      if (key === 'common.more') return 'More';
      return key;
    },
  }),
}));

// Mock ChartCard
jest.mock('../ChartCard', () => ({
  ChartCard: ({ title, description, isLoading, isEmpty, children }: any) => (
    <div data-testid="chart-card">
      {isLoading && <div>Loading...</div>}
      {isEmpty && <div>No data</div>}
      {!isLoading && !isEmpty && (
        <>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
          {children}
        </>
      )}
    </div>
  ),
}));

describe('CalendarHeatmap', () => {
  const mockData: HeatmapDay[] = [
    {
      date: '2025-01-15',
      intensity: 2,
      totalMinutes: 120,
      breakdown: {
        focus: 60,
        apps: 40,
        browser: 20,
      },
    },
    {
      date: '2025-01-16',
      intensity: 4,
      totalMinutes: 240,
      breakdown: {
        focus: 120,
        apps: 80,
        browser: 40,
      },
    },
    {
      date: '2025-01-17',
      intensity: 1,
      totalMinutes: 60,
      breakdown: {
        focus: 30,
        apps: 20,
        browser: 10,
      },
    },
  ];

  describe('Rendering', () => {
    it('renders with title and data', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('chart-card')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          description="Your activity throughout the year"
          year={2025}
        />
      );

      expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Your activity throughout the year')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
      expect(screen.queryByText(/Your activity/)).not.toBeInTheDocument();
    });
  });

  describe('Month Labels', () => {
    it('renders all 12 month labels', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(month => {
        expect(screen.getByText(month)).toBeInTheDocument();
      });
    });
  });

  describe('Day Labels', () => {
    it('renders all 7 day labels', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });
  });

  describe('Legend', () => {
    it('renders legend with intensity levels', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('renders 5 intensity level indicators in legend', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Find the legend container by looking for the container with "Less" and "More"
      const legendContainer = container.querySelector('.flex.items-center.justify-end');
      expect(legendContainer).toBeInTheDocument();

      // Count the colored boxes in the legend (should be 5)
      const legendBoxes = legendContainer?.querySelectorAll('.w-3.h-3.rounded-sm');
      expect(legendBoxes?.length).toBe(5);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows content when isLoading is false', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
          isLoading={false}
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    });

    it('defaults to not loading when isLoading is not provided', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(
        <CalendarHeatmap
          data={[]}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('shows content when data is not empty', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      expect(screen.queryByText('No data')).not.toBeInTheDocument();
      expect(screen.getByText('Jan')).toBeInTheDocument();
    });
  });

  describe('Heatmap Grid', () => {
    it('renders heatmap cells', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Check for heatmap cells (looking for the specific styling)
      const cells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('applies correct colors for different intensity levels', () => {
      const intensityData: HeatmapDay[] = [
        { date: '2025-01-01', intensity: 0, totalMinutes: 0, breakdown: { focus: 0, apps: 0, browser: 0 } },
        { date: '2025-01-02', intensity: 1, totalMinutes: 30, breakdown: { focus: 10, apps: 10, browser: 10 } },
        { date: '2025-01-03', intensity: 2, totalMinutes: 60, breakdown: { focus: 20, apps: 20, browser: 20 } },
        { date: '2025-01-04', intensity: 3, totalMinutes: 120, breakdown: { focus: 40, apps: 40, browser: 40 } },
        { date: '2025-01-05', intensity: 4, totalMinutes: 240, breakdown: { focus: 80, apps: 80, browser: 80 } },
      ];

      const { container } = render(
        <CalendarHeatmap
          data={intensityData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Verify that cells have background colors applied
      const cells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      expect(cells.length).toBeGreaterThan(0);

      // Check that at least some cells have backgroundColor style
      const cellsWithColor = Array.from(cells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== '';
      });
      expect(cellsWithColor.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltip Interaction', () => {
    it('does not show tooltip initially', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Tooltip should not exist before hover
      expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    });

    it('shows tooltip on mouse enter', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Find cells with data (non-transparent background)
      const allCells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      const cellsWithData = Array.from(allCells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== 'transparent' && style.backgroundColor !== '';
      });

      expect(cellsWithData.length).toBeGreaterThan(0);

      fireEvent.mouseEnter(cellsWithData[0]!);

      // Tooltip should now be visible
      expect(screen.getByText('Total:')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const allCells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      const cellsWithData = Array.from(allCells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== 'transparent' && style.backgroundColor !== '';
      });

      expect(cellsWithData.length).toBeGreaterThan(0);

      // Hover to show tooltip
      fireEvent.mouseEnter(cellsWithData[0]!);
      expect(screen.getByText('Total:')).toBeInTheDocument();

      // Leave to hide tooltip
      fireEvent.mouseLeave(cellsWithData[0]!);
      expect(screen.queryByText('Total:')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip Content', () => {
    it('displays correct breakdown in tooltip', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const allCells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      const cellsWithData = Array.from(allCells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== 'transparent' && style.backgroundColor !== '';
      });

      fireEvent.mouseEnter(cellsWithData[0]!);

      // Check for breakdown labels
      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('Focus:')).toBeInTheDocument();
      expect(screen.getByText('Apps:')).toBeInTheDocument();
      expect(screen.getByText('Browser:')).toBeInTheDocument();
    });

    it('formats time duration correctly in tooltip', () => {
      const specificData: HeatmapDay[] = [
        {
          date: '2025-01-15',
          intensity: 3,
          totalMinutes: 125,
          breakdown: {
            focus: 65,
            apps: 40,
            browser: 20,
          },
        },
      ];

      const { container } = render(
        <CalendarHeatmap
          data={specificData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const allCells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      const cellsWithData = Array.from(allCells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== 'transparent' && style.backgroundColor !== '';
      });

      fireEvent.mouseEnter(cellsWithData[0]!);

      // 125 minutes = 2h 5m
      expect(screen.getByText(/2h 5m/)).toBeInTheDocument();
      // 65 minutes = 1h 5m
      expect(screen.getByText(/1h 5m/)).toBeInTheDocument();
    });

    it('formats minutes-only duration correctly', () => {
      const specificData: HeatmapDay[] = [
        {
          date: '2025-01-15',
          intensity: 1,
          totalMinutes: 45,
          breakdown: {
            focus: 25,
            apps: 15,
            browser: 5,
          },
        },
      ];

      const { container } = render(
        <CalendarHeatmap
          data={specificData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      const allCells = container.querySelectorAll('.w-3.h-3.rounded-sm.cursor-pointer');
      const cellsWithData = Array.from(allCells).filter(cell => {
        const style = (cell as HTMLElement).style;
        return style.backgroundColor !== 'transparent' && style.backgroundColor !== '';
      });

      fireEvent.mouseEnter(cellsWithData[0]!);

      // Should show minutes only (no hours)
      expect(screen.getByText(/45m/)).toBeInTheDocument();
      expect(screen.getByText(/25m/)).toBeInTheDocument();
    });
  });

  describe('Year Display', () => {
    it('renders heatmap for specific year', () => {
      const { container } = render(
        <CalendarHeatmap
          data={mockData}
          title="Activity Heatmap"
          year={2025}
        />
      );

      // Verify the component renders (year is used internally for grouping)
      expect(container.querySelector('.inline-flex.gap-1')).toBeInTheDocument();
    });

    it('handles different years correctly', () => {
      const data2024: HeatmapDay[] = [
        {
          date: '2024-06-15',
          intensity: 3,
          totalMinutes: 180,
          breakdown: { focus: 90, apps: 60, browser: 30 },
        },
      ];

      render(
        <CalendarHeatmap
          data={data2024}
          title="2024 Activity"
          year={2024}
        />
      );

      expect(screen.getByText('2024 Activity')).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('renders with all props provided', () => {
      render(
        <CalendarHeatmap
          data={mockData}
          title="Complete Heatmap"
          description="Full year activity visualization"
          year={2025}
          isLoading={false}
        />
      );

      expect(screen.getByText('Complete Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Full year activity visualization')).toBeInTheDocument();
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Less')).toBeInTheDocument();
    });
  });
});
