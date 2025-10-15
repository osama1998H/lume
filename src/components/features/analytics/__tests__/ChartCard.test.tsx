import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChartCard } from '../ChartCard';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ChartCard', () => {
  describe('Rendering', () => {
    it('renders with title and children', () => {
      render(
        <ChartCard title="Test Chart">
          <div>Chart Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('Chart Content')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <ChartCard title="Test Chart" description="Chart description">
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('Chart description')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(
        <ChartCard title="Test Chart">
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      // Description should not exist
      const descriptions = screen.queryAllByText(/Chart description/);
      expect(descriptions).toHaveLength(0);
    });

    it('renders with custom className', () => {
      const { container } = render(
        <ChartCard title="Test Chart" className="custom-class">
          <div>Content</div>
        </ChartCard>
      );

      const cardElement = container.querySelector('.custom-class');
      expect(cardElement).toBeInTheDocument();
    });

    it('renders with actions', () => {
      render(
        <ChartCard
          title="Test Chart"
          actions={<button>Action Button</button>}
        >
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('renders without actions when not provided', () => {
      render(
        <ChartCard title="Test Chart">
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.queryByText('Action Button')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(
        <ChartCard title="Test Chart" isLoading={true}>
          <div>Content</div>
        </ChartCard>
      );

      // Loading spinner should be visible (has specific class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      // Content should not be visible during loading
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('shows content when isLoading is false', () => {
      render(
        <ChartCard title="Test Chart" isLoading={false}>
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      // Spinner should not be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('defaults to not loading when isLoading is not provided', () => {
      render(
        <ChartCard title="Test Chart">
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when isEmpty is true', () => {
      render(
        <ChartCard title="Test Chart" isEmpty={true}>
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('reports.noData')).toBeInTheDocument();
      // Content should not be visible in empty state
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('shows custom empty message when provided', () => {
      render(
        <ChartCard
          title="Test Chart"
          isEmpty={true}
          emptyMessage="No data available"
        >
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.queryByText('reports.noData')).not.toBeInTheDocument();
    });

    it('shows content when isEmpty is false', () => {
      render(
        <ChartCard title="Test Chart" isEmpty={false}>
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByText('reports.noData')).not.toBeInTheDocument();
    });

    it('defaults to not empty when isEmpty is not provided', () => {
      render(
        <ChartCard title="Test Chart">
          <div>Content</div>
        </ChartCard>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByText('reports.noData')).not.toBeInTheDocument();
    });

    it('shows empty state SVG icon', () => {
      render(
        <ChartCard title="Test Chart" isEmpty={true}>
          <div>Content</div>
        </ChartCard>
      );

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('fill', 'none');
    });
  });

  describe('Priority: Loading over Empty', () => {
    it('shows loading spinner when both isLoading and isEmpty are true', () => {
      render(
        <ChartCard title="Test Chart" isLoading={true} isEmpty={true}>
          <div>Content</div>
        </ChartCard>
      );

      // Loading takes priority
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      // Empty state should not be visible
      expect(screen.queryByText('reports.noData')).not.toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('renders with all optional props', () => {
      render(
        <ChartCard
          title="Complete Chart"
          description="Full description"
          className="custom-styling"
          actions={<button>Export</button>}
          isLoading={false}
          isEmpty={false}
        >
          <div>Chart Data</div>
        </ChartCard>
      );

      expect(screen.getByText('Complete Chart')).toBeInTheDocument();
      expect(screen.getByText('Full description')).toBeInTheDocument();
      expect(screen.getByText('Chart Data')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });
});
