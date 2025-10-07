import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressListCard, { ProgressListItem } from '../ProgressListCard';

describe('ProgressListCard', () => {
  const mockItems: ProgressListItem[] = [
    { key: '1', label: 'Work', value: 3600, formattedValue: '1h 0m' },
    { key: '2', label: 'Study', value: 1800, formattedValue: '30m 0s' },
    { key: '3', label: 'Exercise', value: 900, formattedValue: '15m 0s' },
  ];

  it('renders with items', () => {
    render(
      <ProgressListCard
        title="Time by Category"
        items={mockItems}
      />
    );

    expect(screen.getByText('Time by Category')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText('30m 0s')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(
      <ProgressListCard
        title="Empty List"
        items={[]}
        emptyStateText="No data available"
      />
    );

    expect(screen.getByText('Empty List')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('uses default empty state text', () => {
    render(
      <ProgressListCard
        title="Empty List"
        items={[]}
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders with custom formatValue function', () => {
    const items = [
      { key: '1', label: 'Task 1', value: 100 },
      { key: '2', label: 'Task 2', value: 50 },
    ];

    render(
      <ProgressListCard
        title="Custom Format"
        items={items}
        formatValue={(value) => `${value} units`}
      />
    );

    expect(screen.getByText('100 units')).toBeInTheDocument();
    expect(screen.getByText('50 units')).toBeInTheDocument();
  });

  it('applies correct color scheme', () => {
    const { container } = render(
      <ProgressListCard
        title="Green Progress"
        items={mockItems}
        colorScheme="green"
      />
    );

    const progressBar = container.querySelector('.bg-green-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProgressListCard
        title="Custom Class"
        items={mockItems}
        className="custom-class"
      />
    );

    const cardElement = container.querySelector('.card.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  it('calculates percentages correctly', () => {
    const { container } = render(
      <ProgressListCard
        title="Progress Test"
        items={mockItems}
      />
    );

    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('prefers formattedValue over formatValue function', () => {
    const items = [
      { key: '1', label: 'Task 1', value: 100, formattedValue: 'Formatted!' },
    ];

    render(
      <ProgressListCard
        title="Priority Test"
        items={items}
        formatValue={(value) => `${value} units`}
      />
    );

    expect(screen.getByText('Formatted!')).toBeInTheDocument();
    expect(screen.queryByText('100 units')).not.toBeInTheDocument();
  });
});
