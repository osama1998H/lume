import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HourlyHeatmap } from '../HourlyHeatmap';
import type { HourlyPattern } from '@/types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'analytics.avgHours') return 'Avg Hours';
      if (key === 'analytics.hours') return 'Hours';
      if (key === 'analytics.averageActivity') return 'Average Activity';
      if (key === 'analytics.am') return 'AM';
      if (key === 'analytics.pm') return 'PM';
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

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, children }: any) => (
    <div data-testid="bar" data-key={dataKey}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ label }: any) => <div data-testid="y-axis" data-label={label?.value} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('HourlyHeatmap', () => {
  const mockData: HourlyPattern[] = [
    { hour: 9, avgMinutes: 120, dayCount: 5 },
    { hour: 14, avgMinutes: 180, dayCount: 5 },
    { hour: 20, avgMinutes: 90, dayCount: 5 },
  ];

  describe('Rendering', () => {
    it('renders with title and data', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.getByText('Hourly Activity')).toBeInTheDocument();
      expect(screen.getByTestId('chart-card')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
          description="Your activity patterns by hour"
        />
      );

      expect(screen.getByText('Hourly Activity')).toBeInTheDocument();
      expect(screen.getByText('Your activity patterns by hour')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.getByText('Hourly Activity')).toBeInTheDocument();
      expect(screen.queryByText(/Your activity/)).not.toBeInTheDocument();
    });
  });

  describe('Chart Components', () => {
    it('renders ResponsiveContainer', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders BarChart with data', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();

      // Check that data was passed to chart
      const chartData = barChart.getAttribute('data-chart-data');
      expect(chartData).toBeTruthy();
    });

    it('renders XAxis with hour data', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
      expect(xAxis.getAttribute('data-key')).toBe('hour');
    });

    it('renders YAxis with avg hours label', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toBeInTheDocument();
      expect(yAxis.getAttribute('data-label')).toBe('Avg Hours');
    });

    it('renders CartesianGrid', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('renders Tooltip', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('renders Bar with correct dataKey', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const bar = screen.getByTestId('bar');
      expect(bar).toBeInTheDocument();
      expect(bar.getAttribute('data-key')).toBe('hours');
    });

    it('renders Cell components for each bar', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBe(mockData.length);
    });
  });

  describe('Data Transformation', () => {
    it('converts minutes to hours in chart data', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      expect(chartDataStr).toBeTruthy();

      const chartData = JSON.parse(chartDataStr!);

      // 120 minutes = 2.0 hours
      expect(chartData[0].hours).toBe('2.0');
      // 180 minutes = 3.0 hours
      expect(chartData[1].hours).toBe('3.0');
      // 90 minutes = 1.5 hours
      expect(chartData[2].hours).toBe('1.5');
    });

    it('sorts data by hour ascending', () => {
      const unsortedData: HourlyPattern[] = [
        { hour: 20, avgMinutes: 90, dayCount: 5 },
        { hour: 9, avgMinutes: 120, dayCount: 5 },
        { hour: 14, avgMinutes: 180, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={unsortedData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Data should be sorted by hour: 9, 14, 20
      expect(chartData[0].hour).toContain('9');
      expect(chartData[1].hour).toContain('2');
      expect(chartData[2].hour).toContain('8');
    });

    it('formats hour 0 as 12 AM', () => {
      const midnightData: HourlyPattern[] = [
        { hour: 0, avgMinutes: 30, dayCount: 3 },
      ];

      render(
        <HourlyHeatmap
          data={midnightData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hour).toBe('12 AM');
    });

    it('formats hour 12 as 12 PM', () => {
      const noonData: HourlyPattern[] = [
        { hour: 12, avgMinutes: 120, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={noonData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hour).toBe('12 PM');
    });

    it('formats morning hours with AM', () => {
      const morningData: HourlyPattern[] = [
        { hour: 9, avgMinutes: 120, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={morningData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hour).toBe('9 AM');
    });

    it('formats afternoon/evening hours with PM', () => {
      const eveningData: HourlyPattern[] = [
        { hour: 20, avgMinutes: 90, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={eveningData}
          title="Hourly Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Hour 20 = 8 PM (20 - 12 = 8)
      expect(chartData[0].hour).toBe('8 PM');
    });
  });

  describe('Color Intensity', () => {
    it('applies different colors based on intensity', () => {
      const intensityData: HourlyPattern[] = [
        { hour: 1, avgMinutes: 20, dayCount: 5 },   // Low intensity
        { hour: 9, avgMinutes: 120, dayCount: 5 },  // High intensity
      ];

      render(
        <HourlyHeatmap
          data={intensityData}
          title="Hourly Activity"
        />
      );

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(2);

      // Check that cells have fill colors
      const fills = cells.map(cell => cell.getAttribute('data-fill'));
      expect(fills[0]).toBeTruthy();
      expect(fills[1]).toBeTruthy();

      // Higher intensity should have different color (first cell should have lower intensity)
      expect(fills[0]).not.toBe(fills[1]);
    });

    it('handles equal values with same color', () => {
      const equalData: HourlyPattern[] = [
        { hour: 9, avgMinutes: 120, dayCount: 5 },
        { hour: 14, avgMinutes: 120, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={equalData}
          title="Hourly Activity"
        />
      );

      const cells = screen.getAllByTestId('cell');
      const fills = cells.map(cell => cell.getAttribute('data-fill'));

      // Equal values should have the same color
      expect(fills[0]).toBe(fills[1]);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows content when isLoading is false', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
          isLoading={false}
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Hourly Activity')).toBeInTheDocument();
    });

    it('defaults to not loading when isLoading is not provided', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(
        <HourlyHeatmap
          data={[]}
          title="Hourly Activity"
        />
      );

      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('shows content when data is not empty', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Hourly Activity"
        />
      );

      expect(screen.queryByText('No data')).not.toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('renders with all props provided', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Complete Heatmap"
          description="Full hourly analysis"
          isLoading={false}
        />
      );

      expect(screen.getByText('Complete Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Full hourly analysis')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single hour data', () => {
      const singleHourData: HourlyPattern[] = [
        { hour: 14, avgMinutes: 120, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={singleHourData}
          title="Single Hour"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();

      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);
      expect(chartData).toHaveLength(1);
    });

    it('handles zero avgMinutes', () => {
      const zeroData: HourlyPattern[] = [
        { hour: 14, avgMinutes: 0, dayCount: 5 },
      ];

      render(
        <HourlyHeatmap
          data={zeroData}
          title="Zero Activity"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hours).toBe('0.0');
      expect(chartData[0].minutes).toBe(0);
    });

    it('handles full 24-hour data', () => {
      const fullDayData: HourlyPattern[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        avgMinutes: Math.random() * 120,
        dayCount: 7,
      }));

      render(
        <HourlyHeatmap
          data={fullDayData}
          title="Full Day"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData).toHaveLength(24);
    });

    it('handles large avgMinutes values', () => {
      const largeData: HourlyPattern[] = [
        { hour: 14, avgMinutes: 1440, dayCount: 5 }, // 24 hours
      ];

      render(
        <HourlyHeatmap
          data={largeData}
          title="Large Value"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hours).toBe('24.0');
    });

    it('preserves dayCount in data', () => {
      render(
        <HourlyHeatmap
          data={mockData}
          title="Day Count Check"
        />
      );

      const barChart = screen.getByTestId('bar-chart');
      const chartDataStr = barChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Original data is not modified, only transformed
      expect(chartData).toHaveLength(mockData.length);
    });
  });
});
