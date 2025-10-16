import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductivityLineChart } from '../ProductivityLineChart';
import type { ProductivityTrend } from '@/types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'analytics.hours') return 'Hours';
      if (key === 'analytics.productivity') return 'Productivity';
      if (key === 'analytics.hoursTracked') return 'Hours Tracked';
      return key;
    },
    i18n: {
      language: 'en',
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
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ name, dataKey }: any) => (
    <div data-testid="line" data-name={name} data-key={dataKey} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ label }: any) => <div data-testid="y-axis" data-label={label?.value} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('ProductivityLineChart', () => {
  const mockData: ProductivityTrend[] = [
    { date: '2025-01-15', value: 120 },
    { date: '2025-01-16', value: 180 },
    { date: '2025-01-17', value: 90 },
  ];

  describe('Rendering', () => {
    it('renders with title and data', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
      expect(screen.getByTestId('chart-card')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
          description="Your productivity over time"
        />
      );

      expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
      expect(screen.getByText('Your productivity over time')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
      expect(screen.queryByText(/Your productivity/)).not.toBeInTheDocument();
    });
  });

  describe('Chart Components', () => {
    it('renders ResponsiveContainer', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders LineChart with data', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();

      // Check that data was passed to chart
      const chartData = lineChart.getAttribute('data-chart-data');
      expect(chartData).toBeTruthy();
    });

    it('renders XAxis with formattedDate', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
      expect(xAxis.getAttribute('data-key')).toBe('formattedDate');
    });

    it('renders YAxis with hours label', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toBeInTheDocument();
      expect(yAxis.getAttribute('data-label')).toBe('Hours');
    });

    it('renders CartesianGrid', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('renders Tooltip', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('renders Legend', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders Line with correct dataKey', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      const line = screen.getByTestId('line');
      expect(line).toBeInTheDocument();
      expect(line.getAttribute('data-key')).toBe('hours');
      expect(line.getAttribute('data-name')).toBe('Hours Tracked');
    });
  });

  describe('Data Transformation', () => {
    it('converts minutes to hours in chart data', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      expect(chartDataStr).toBeTruthy();

      const chartData = JSON.parse(chartDataStr!);

      // 120 minutes = 2.0 hours
      expect(chartData[0].hours).toBe('2.0');
      // 180 minutes = 3.0 hours
      expect(chartData[1].hours).toBe('3.0');
      // 90 minutes = 1.5 hours
      expect(chartData[2].hours).toBe('1.5');
    });

    it('formats day dates correctly', () => {
      const dayData: ProductivityTrend[] = [
        { date: '2025-01-15', value: 120 },
      ];

      render(
        <ProductivityLineChart
          data={dayData}
          title="Daily Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Day format should be "Jan 15"
      expect(chartData[0].formattedDate).toMatch(/Jan 15/);
    });

    it('formats week dates correctly', () => {
      const weekData: ProductivityTrend[] = [
        { date: '2025-W03', value: 600 },
      ];

      render(
        <ProductivityLineChart
          data={weekData}
          title="Weekly Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Week format should be "Week 03"
      expect(chartData[0].formattedDate).toBe('Week 03');
    });

    it('formats month dates correctly', () => {
      const monthData: ProductivityTrend[] = [
        { date: '2025-01', value: 2400 },
      ];

      render(
        <ProductivityLineChart
          data={monthData}
          title="Monthly Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      // Month format should include month and year
      expect(chartData[0].formattedDate).toMatch(/Jan 2025/);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows content when isLoading is false', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
          isLoading={false}
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
    });

    it('defaults to not loading when isLoading is not provided', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(
        <ProductivityLineChart
          data={[]}
          title="Productivity Trend"
        />
      );

      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('shows content when data is not empty', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Productivity Trend"
        />
      );

      expect(screen.queryByText('No data')).not.toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Category Support', () => {
    it('handles data with category field', () => {
      const categoryData: ProductivityTrend[] = [
        { date: '2025-01-15', value: 120, category: 'Development' },
        { date: '2025-01-16', value: 180, category: 'Development' },
      ];

      render(
        <ProductivityLineChart
          data={categoryData}
          title="Category Trend"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].category).toBe('Development');
      expect(chartData[1].category).toBe('Development');
    });
  });

  describe('Combined Props', () => {
    it('renders with all props provided', () => {
      render(
        <ProductivityLineChart
          data={mockData}
          title="Complete Chart"
          description="Full productivity analysis"
          isLoading={false}
        />
      );

      expect(screen.getByText('Complete Chart')).toBeInTheDocument();
      expect(screen.getByText('Full productivity analysis')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      const singleData: ProductivityTrend[] = [
        { date: '2025-01-15', value: 120 },
      ];

      render(
        <ProductivityLineChart
          data={singleData}
          title="Single Day"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();

      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);
      expect(chartData).toHaveLength(1);
    });

    it('handles zero value data', () => {
      const zeroData: ProductivityTrend[] = [
        { date: '2025-01-15', value: 0 },
      ];

      render(
        <ProductivityLineChart
          data={zeroData}
          title="Zero Activity"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hours).toBe('0.0');
    });

    it('handles large value data', () => {
      const largeData: ProductivityTrend[] = [
        { date: '2025-01-15', value: 1440 }, // 24 hours
      ];

      render(
        <ProductivityLineChart
          data={largeData}
          title="Full Day"
        />
      );

      const lineChart = screen.getByTestId('line-chart');
      const chartDataStr = lineChart.getAttribute('data-chart-data');
      const chartData = JSON.parse(chartDataStr!);

      expect(chartData[0].hours).toBe('24.0');
    });
  });
});
