import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SourceTypeIcon from '../SourceTypeIcon';
import type { ActivitySourceType } from '@/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Timer: ({ className }: any) => <div data-testid="timer-icon" className={className} />,
  Monitor: ({ className }: any) => <div data-testid="monitor-icon" className={className} />,
  Coffee: ({ className }: any) => <div data-testid="coffee-icon" className={className} />,
}));

describe('SourceTypeIcon', () => {
  describe('Manual Source Type', () => {
    it('renders Timer icon for manual type', () => {
      render(<SourceTypeIcon sourceType="manual" />);
      expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    });

    it('displays "Manual" label in badge mode', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('applies blue color scheme for manual type', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" />);
      const iconContainer = container.querySelector('.bg-blue-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies correct text color for manual type icon', () => {
      render(<SourceTypeIcon sourceType="manual" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('text-blue-600');
    });
  });

  describe('Automatic Source Type', () => {
    it('renders Monitor icon for automatic type', () => {
      render(<SourceTypeIcon sourceType="automatic" />);
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
    });

    it('displays "Auto" label in badge mode', () => {
      render(<SourceTypeIcon sourceType="automatic" showBadge={true} />);
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('applies purple color scheme for automatic type', () => {
      const { container } = render(<SourceTypeIcon sourceType="automatic" />);
      const iconContainer = container.querySelector('.bg-purple-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies correct text color for automatic type icon', () => {
      render(<SourceTypeIcon sourceType="automatic" />);
      const icon = screen.getByTestId('monitor-icon');
      expect(icon).toHaveClass('text-purple-600');
    });
  });

  describe('Pomodoro Source Type', () => {
    it('renders Coffee icon for pomodoro type', () => {
      render(<SourceTypeIcon sourceType="pomodoro" />);
      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
    });

    it('displays "Pomodoro" label in badge mode', () => {
      render(<SourceTypeIcon sourceType="pomodoro" showBadge={true} />);
      expect(screen.getByText('Pomodoro')).toBeInTheDocument();
    });

    it('applies red color scheme for pomodoro type', () => {
      const { container } = render(<SourceTypeIcon sourceType="pomodoro" />);
      const iconContainer = container.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies correct text color for pomodoro type icon', () => {
      render(<SourceTypeIcon sourceType="pomodoro" />);
      const icon = screen.getByTestId('coffee-icon');
      expect(icon).toHaveClass('text-red-600');
    });
  });

  describe('Unknown/Default Source Type', () => {
    it('renders Timer icon for unknown type', () => {
      render(<SourceTypeIcon sourceType={'unknown' as ActivitySourceType} />);
      expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    });

    it('displays "Unknown" label in badge mode for unknown type', () => {
      render(<SourceTypeIcon sourceType={'unknown' as ActivitySourceType} showBadge={true} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('applies gray color scheme for unknown type', () => {
      const { container } = render(<SourceTypeIcon sourceType={'unknown' as ActivitySourceType} />);
      const iconContainer = container.querySelector('.bg-gray-100');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(<SourceTypeIcon sourceType="manual" size="sm" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('applies medium size classes by default', () => {
      render(<SourceTypeIcon sourceType="manual" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    it('applies medium size classes explicitly', () => {
      render(<SourceTypeIcon sourceType="manual" size="md" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    it('applies large size classes', () => {
      render(<SourceTypeIcon sourceType="manual" size="lg" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('w-6', 'h-6');
    });

    it('applies correct container size for small', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" size="sm" />);
      const iconContainer = container.querySelector('.w-8.h-8');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies correct container size for medium', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" size="md" />);
      const iconContainer = container.querySelector('.w-10.h-10');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies correct container size for large', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" size="lg" />);
      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Badge Mode', () => {
    it('shows badge with label by default', () => {
      render(<SourceTypeIcon sourceType="manual" />);
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('shows badge when showBadge is true', () => {
      render(<SourceTypeIcon sourceType="automatic" showBadge={true} />);
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('hides badge when showBadge is false', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={false} />);
      expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    });

    it('badge label has uppercase styling', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      const label = screen.getByText('Manual');
      expect(label).toHaveClass('uppercase');
    });

    it('badge label has correct text size', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      const label = screen.getByText('Manual');
      expect(label).toHaveClass('text-xs');
    });

    it('badge label has correct font weight', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      const label = screen.getByText('Manual');
      expect(label).toHaveClass('font-medium');
    });

    it('renders in flex layout when badge is shown', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });

  describe('Icon-Only Mode', () => {
    it('renders only icon container without badge', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={false} />);
      expect(screen.queryByText('Manual')).not.toBeInTheDocument();
      expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    });

    it('has title attribute for accessibility in icon-only mode', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" showBadge={false} />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveAttribute('title', 'Manual');
    });

    it('shows correct title for automatic type', () => {
      const { container } = render(<SourceTypeIcon sourceType="automatic" showBadge={false} />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveAttribute('title', 'Auto');
    });

    it('shows correct title for pomodoro type', () => {
      const { container } = render(<SourceTypeIcon sourceType="pomodoro" showBadge={false} />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveAttribute('title', 'Pomodoro');
    });
  });

  describe('Custom className', () => {
    it('applies custom className in badge mode', () => {
      const { container } = render(
        <SourceTypeIcon sourceType="manual" showBadge={true} className="custom-class" />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('applies custom className in icon-only mode', () => {
      const { container } = render(
        <SourceTypeIcon sourceType="manual" showBadge={false} className="custom-class" />
      );
      const iconContainer = container.firstChild;
      expect(iconContainer).toHaveClass('custom-class');
    });

    it('preserves default classes when custom className is added', () => {
      const { container } = render(
        <SourceTypeIcon sourceType="manual" showBadge={true} className="custom-class" />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'custom-class');
    });
  });

  describe('Visual Styling', () => {
    it('icon container has rounded-full class', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });

    it('icon container is flexbox centered', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" />);
      const iconContainer = container.querySelector('.flex.items-center.justify-center');
      expect(iconContainer).toBeInTheDocument();
    });

    it('icon container has flex-shrink-0', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" />);
      const iconContainer = container.querySelector('.flex-shrink-0');
      expect(iconContainer).toBeInTheDocument();
    });

    it('badge label has tracking-wide class', () => {
      render(<SourceTypeIcon sourceType="manual" showBadge={true} />);
      const label = screen.getByText('Manual');
      expect(label).toHaveClass('tracking-wide');
    });
  });

  describe('Dark Mode Support', () => {
    it('has dark mode classes for manual type', () => {
      const { container } = render(<SourceTypeIcon sourceType="manual" />);
      const iconContainer = container.querySelector('.dark\\:bg-blue-900\\/30');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has dark mode text color for manual type', () => {
      render(<SourceTypeIcon sourceType="manual" />);
      const icon = screen.getByTestId('timer-icon');
      expect(icon).toHaveClass('dark:text-blue-400');
    });

    it('has dark mode classes for automatic type', () => {
      const { container } = render(<SourceTypeIcon sourceType="automatic" />);
      const iconContainer = container.querySelector('.dark\\:bg-purple-900\\/30');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has dark mode classes for pomodoro type', () => {
      const { container } = render(<SourceTypeIcon sourceType="pomodoro" />);
      const iconContainer = container.querySelector('.dark\\:bg-red-900\\/30');
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
