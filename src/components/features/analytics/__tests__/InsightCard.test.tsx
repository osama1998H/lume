import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InsightCard } from '../InsightCard';
import type { BehavioralInsight } from '../../../../types';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Handle translation with params
      if (params) {
        let result = key;
        Object.keys(params).forEach(param => {
          result += ` ${params[param]}`;
        });
        return result;
      }
      return key;
    },
  }),
}));

describe('InsightCard', () => {
  describe('Rendering - Peak Hour Insight', () => {
    it('renders peak_hour insight with all data', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'You are most productive at 10:00 in the morning',
        value: '45 min avg',
      };

      render(<InsightCard insight={insight} />);

      // Check if translated title is shown
      expect(screen.getByText('analytics.insightTypes.peakHour.title')).toBeInTheDocument();
      // Check if value is displayed
      expect(screen.getByText(/45/)).toBeInTheDocument();
    });

    it('renders peak_hour insight with trend indicator', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'You are most productive at 10:00 in the morning',
        value: '45 min avg',
        trend: {
          value: 15,
          isPositive: true,
        },
      };

      const { container } = render(<InsightCard insight={insight} />);

      // Check trend value is displayed
      expect(screen.getByText('15')).toBeInTheDocument();
      // Check for trend icon
      const trendIcon = container.querySelector('svg[style*="rotate(0deg)"]');
      expect(trendIcon).toBeInTheDocument();
    });
  });

  describe('Rendering - Productive Day Insight', () => {
    it('renders productive_day insight', () => {
      const insight: BehavioralInsight = {
        type: 'productive_day',
        title: 'Most Productive Day',
        description: 'Tuesday is your most productive day',
        value: 'Tuesday',
      };

      render(<InsightCard insight={insight} />);

      expect(screen.getByText('analytics.insightTypes.productiveDay.title')).toBeInTheDocument();
    });
  });

  describe('Rendering - Category Trend Insight', () => {
    it('renders category_trend insight', () => {
      const insight: BehavioralInsight = {
        type: 'category_trend',
        title: 'Category Trend',
        description: 'You spend most time on Development',
        value: '8h 30m',
      };

      render(<InsightCard insight={insight} />);

      expect(screen.getByText('analytics.insightTypes.categoryTrend.title')).toBeInTheDocument();
      expect(screen.getByText(/8h 30m/)).toBeInTheDocument();
    });
  });

  describe('Rendering - Distraction Insight', () => {
    it('renders distraction insight', () => {
      const insight: BehavioralInsight = {
        type: 'distraction',
        title: 'Distraction Alert',
        description: 'Slack has 23 short sessions',
        value: '3 min avg',
      };

      render(<InsightCard insight={insight} />);

      expect(screen.getByText('analytics.insightTypes.distraction.title')).toBeInTheDocument();
    });
  });

  describe('Rendering - Streak Insight', () => {
    it('renders streak insight', () => {
      const insight: BehavioralInsight = {
        type: 'streak',
        title: 'Active Streak',
        description: '7 days of consistent activity',
        value: '7 days',
      };

      render(<InsightCard insight={insight} />);

      expect(screen.getByText('analytics.insightTypes.streak.title')).toBeInTheDocument();
    });
  });

  describe('Rendering - Focus Quality Insight', () => {
    it('renders focus_quality insight with good focus', () => {
      const insight: BehavioralInsight = {
        type: 'focus_quality',
        title: 'Focus Quality',
        description: 'Great focus quality with 85% completion',
        value: '85%',
      };

      render(<InsightCard insight={insight} />);

      expect(screen.getByText('analytics.insightTypes.focusQuality.title')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('renders correct icon for peak_hour type', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'You are most productive at 10:00 in the morning',
        value: '45 min',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const svgs = container.querySelectorAll('svg');
      // At least one SVG should exist (the icon)
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('renders correct icon for productive_day type', () => {
      const insight: BehavioralInsight = {
        type: 'productive_day',
        title: 'Most Productive',
        description: 'Tuesday is your most productive day',
        value: 'Tuesday',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('renders correct icon for streak type', () => {
      const insight: BehavioralInsight = {
        type: 'streak',
        title: 'Streak',
        description: '5 days',
        value: '5 days',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Color Scheme', () => {
    it('applies orange color scheme for peak_hour', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'Test',
        value: '45 min',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.querySelector('.from-orange-500\\/20');
      expect(card).toBeInTheDocument();
    });

    it('applies green color scheme for productive_day', () => {
      const insight: BehavioralInsight = {
        type: 'productive_day',
        title: 'Productive Day',
        description: 'Test',
        value: 'Monday',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.querySelector('.from-green-500\\/20');
      expect(card).toBeInTheDocument();
    });

    it('applies red color scheme for distraction', () => {
      const insight: BehavioralInsight = {
        type: 'distraction',
        title: 'Distraction',
        description: 'Test',
        value: '5 min',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.querySelector('.from-red-500\\/20');
      expect(card).toBeInTheDocument();
    });

    it('applies purple color scheme for streak', () => {
      const insight: BehavioralInsight = {
        type: 'streak',
        title: 'Streak',
        description: 'Test',
        value: '3 days',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.querySelector('.from-purple-500\\/20');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Trend Indicator', () => {
    it('shows positive trend indicator with correct style', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'Test',
        value: '45 min',
        trend: {
          value: 20,
          isPositive: true,
        },
      };

      const { container } = render(<InsightCard insight={insight} />);

      // Check trend value
      expect(screen.getByText('20')).toBeInTheDocument();
      // Check positive trend styling (no rotation)
      const trendIcon = container.querySelector('svg[style*="rotate(0deg)"]');
      expect(trendIcon).toBeInTheDocument();
    });

    it('shows negative trend indicator with correct style', () => {
      const insight: BehavioralInsight = {
        type: 'distraction',
        title: 'Distraction',
        description: 'Test',
        value: '10 min',
        trend: {
          value: -15,
          isPositive: false,
        },
      };

      const { container } = render(<InsightCard insight={insight} />);

      // Check trend value (absolute value)
      expect(screen.getByText('15')).toBeInTheDocument();
      // Check negative trend styling (180deg rotation)
      const trendIcon = container.querySelector('svg[style*="rotate(180deg)"]');
      expect(trendIcon).toBeInTheDocument();
    });

    it('does not show trend indicator when trend is not provided', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak Hour',
        description: 'Test',
        value: '45 min',
      };

      const { container } = render(<InsightCard insight={insight} />);

      // Should not have trend-related elements
      const trendIcons = container.querySelectorAll('svg[style*="rotate"]');
      expect(trendIcons.length).toBe(0);
    });
  });

  describe('Value Display', () => {
    it('renders string value', () => {
      const insight: BehavioralInsight = {
        type: 'productive_day',
        title: 'Day',
        description: 'Test',
        value: 'Monday',
      };

      render(<InsightCard insight={insight} />);
      // Value will be translated via i18n mock
      expect(screen.getByText(/Monday/)).toBeInTheDocument();
    });

    it('renders numeric value', () => {
      const insight: BehavioralInsight = {
        type: 'streak',
        title: 'Streak',
        description: 'Test',
        value: 42,
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders value with time units', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Peak',
        description: 'Test',
        value: '26 min',
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText(/26/)).toBeInTheDocument();
    });
  });

  describe('Fallback Rendering', () => {
    it('uses original title and description when translation pattern does not match', () => {
      const insight: BehavioralInsight = {
        type: 'peak_hour',
        title: 'Custom Title',
        description: 'Custom description without pattern',
        value: '30 min',
      };

      render(<InsightCard insight={insight} />);

      // Should still render the translated title key
      expect(screen.getByText('analytics.insightTypes.peakHour.title')).toBeInTheDocument();
    });
  });
});
