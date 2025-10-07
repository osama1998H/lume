import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders with string icon', () => {
    render(
      <StatCard
        icon="⏰"
        title="Today's Time"
        value="2h 30m"
        colorScheme="primary"
      />
    );

    expect(screen.getByText('⏰')).toBeInTheDocument();
    expect(screen.getByText("Today's Time")).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('renders with numeric value', () => {
    render(
      <StatCard
        icon="✅"
        title="Tasks Completed"
        value={5}
        colorScheme="green"
      />
    );

    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <StatCard
        icon="🎯"
        title="Active Task"
        value="Coding"
        className="custom-class"
      />
    );

    const cardElement = container.querySelector('.card.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  it('applies correct color scheme classes', () => {
    const { container } = render(
      <StatCard
        icon="📱"
        title="App Usage"
        value="1h 15m"
        colorScheme="purple"
      />
    );

    const iconContainer = container.querySelector('.bg-purple-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders with React element as icon', () => {
    const customIcon = <svg data-testid="custom-icon" />;
    render(
      <StatCard
        icon={customIcon}
        title="Custom Icon"
        value="Test"
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('uses default colorScheme when not specified', () => {
    const { container } = render(
      <StatCard
        icon="⏱️"
        title="Default Color"
        value="Test"
      />
    );

    const iconContainer = container.querySelector('.bg-primary-100');
    expect(iconContainer).toBeInTheDocument();
  });
});
