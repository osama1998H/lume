import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityListCard, { ActivityItem } from '../ActivityListCard';

describe('ActivityListCard', () => {
  const mockItems: ActivityItem[] = [
    {
      key: '1',
      mainLabel: 'Coding Task',
      subLabel: '10:30 AM',
      category: 'Work',
      value: '2h 30m',
    },
    {
      key: '2',
      mainLabel: 'Meeting',
      subLabel: '2:00 PM',
      category: 'Communication',
      value: '1h 0m',
    },
    {
      key: '3',
      mainLabel: 'Code Review',
      subLabel: '4:15 PM',
      value: 'Active',
    },
  ];

  it('renders with items', () => {
    render(
      <ActivityListCard
        title="Recent Entries"
        items={mockItems}
      />
    );

    expect(screen.getByText('Recent Entries')).toBeInTheDocument();
    expect(screen.getByText('Coding Task')).toBeInTheDocument();
    expect(screen.getByText('10:30 AM • Work')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(
      <ActivityListCard
        title="Empty List"
        items={[]}
        emptyStateText="No entries available"
      />
    );

    expect(screen.getByText('Empty List')).toBeInTheDocument();
    expect(screen.getByText('No entries available')).toBeInTheDocument();
  });

  it('uses default empty state text', () => {
    render(
      <ActivityListCard
        title="Empty List"
        items={[]}
      />
    );

    expect(screen.getByText('No entries available')).toBeInTheDocument();
  });

  it('hides category when showCategory is false', () => {
    render(
      <ActivityListCard
        title="No Category"
        items={mockItems}
        showCategory={false}
      />
    );

    expect(screen.queryByText('10:30 AM • Work')).not.toBeInTheDocument();
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
  });

  it('renders item without subLabel', () => {
    const itemsWithoutSub: ActivityItem[] = [
      {
        key: '1',
        mainLabel: 'Simple Task',
        category: 'Work',
        value: '1h 0m',
      },
    ];

    render(
      <ActivityListCard
        title="Simple Items"
        items={itemsWithoutSub}
      />
    );

    expect(screen.getByText('Simple Task')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ActivityListCard
        title="Custom Class"
        items={mockItems}
        className="custom-class"
      />
    );

    const cardElement = container.querySelector('.card.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  it('renders without category when not provided', () => {
    const itemsWithoutCategory: ActivityItem[] = [
      {
        key: '1',
        mainLabel: 'Task',
        subLabel: '10:00 AM',
        value: '30m',
      },
    ];

    render(
      <ActivityListCard
        title="No Category Items"
        items={itemsWithoutCategory}
      />
    );

    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.queryByText('10:00 AM •')).not.toBeInTheDocument();
  });

  it('shows category as badge when no subLabel', () => {
    const items: ActivityItem[] = [
      {
        key: '1',
        mainLabel: 'Task with badge',
        category: 'Development',
        value: '1h',
      },
    ];

    render(
      <ActivityListCard
        title="Badge Test"
        items={items}
      />
    );

    expect(screen.getByText('Development')).toBeInTheDocument();
    const badge = screen.getByText('Development');
    expect(badge.className).toContain('bg-primary-100');
  });
});
