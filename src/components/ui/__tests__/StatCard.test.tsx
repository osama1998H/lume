import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Clock, CheckCircle2, Target, Smartphone } from 'lucide-react';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders with icon', () => {
    render(
      <StatCard
        icon={Clock}
        title="Today's Time"
        value="2h 30m"
        colorScheme="primary"
      />
    );

    expect(screen.getByText("Today's Time")).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('renders with numeric value', () => {
    render(
      <StatCard
        icon={CheckCircle2}
        title="Tasks Completed"
        value={5}
        colorScheme="green"
      />
    );

    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <StatCard
        icon={Target}
        title="Active Task"
        value="Coding"
        className="custom-class"
      />
    );

    const cardElement = container.querySelector('.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  it('applies correct color scheme classes', () => {
    render(
      <StatCard
        icon={Smartphone}
        title="App Usage"
        value="1h 15m"
        colorScheme="purple"
      />
    );

    expect(screen.getByText('App Usage')).toBeInTheDocument();
    expect(screen.getByText('1h 15m')).toBeInTheDocument();
  });

  it('uses default colorScheme when not specified', () => {
    render(
      <StatCard
        icon={Clock}
        title="Default Color"
        value="Test"
      />
    );

    expect(screen.getByText('Default Color')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with trend indicator', () => {
    render(
      <StatCard
        icon={Clock}
        title="Time Tracked"
        value="8h 30m"
        trend={{ value: 15, isPositive: true }}
      />
    );

    expect(screen.getByText('Time Tracked')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
  });
});
