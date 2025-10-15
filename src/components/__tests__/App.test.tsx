import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../App';

// Mock lazy-loaded components
jest.mock('../pages/Dashboard', () => ({
  __esModule: true,
  default: () => <div>Dashboard View</div>,
}));

jest.mock('../pages/TimeTracker', () => ({
  __esModule: true,
  default: () => <div>TimeTracker View</div>,
}));

jest.mock('../pages/Reports', () => ({
  __esModule: true,
  default: () => <div>Reports View</div>,
}));

jest.mock('../pages/Analytics', () => ({
  __esModule: true,
  default: () => <div>Analytics View</div>,
}));

jest.mock('../pages/Goals', () => ({
  __esModule: true,
  default: () => <div>Goals View</div>,
}));

jest.mock('../pages/FocusMode', () => ({
  __esModule: true,
  default: () => <div>FocusMode View</div>,
}));

jest.mock('../pages/Settings', () => ({
  __esModule: true,
  default: () => <div>Settings View</div>,
}));

jest.mock('../pages/Categories', () => ({
  __esModule: true,
  default: () => <div>Categories View</div>,
}));

jest.mock('../pages/ActivityLog', () => ({
  __esModule: true,
  default: () => <div>ActivityLog View</div>,
}));

// Mock layout components
jest.mock('../layout/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../layout/TitleBar', () => ({
  __esModule: true,
  default: () => <div data-testid="title-bar">Title Bar</div>,
}));

jest.mock('../layout/Sidebar', () => ({
  __esModule: true,
  default: ({ onViewChange }: { currentView: string; onViewChange: (view: string) => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => onViewChange('dashboard')}>Dashboard</button>
      <button onClick={() => onViewChange('tracker')}>Tracker</button>
      <button onClick={() => onViewChange('reports')}>Reports</button>
      <button onClick={() => onViewChange('analytics')}>Analytics</button>
      <button onClick={() => onViewChange('activitylog')}>Activity Log</button>
      <button onClick={() => onViewChange('goals')}>Goals</button>
      <button onClick={() => onViewChange('focus')}>Focus</button>
      <button onClick={() => onViewChange('categories')}>Categories</button>
      <button onClick={() => onViewChange('settings')}>Settings</button>
    </div>
  ),
}));

jest.mock('../ui/Toast', () => ({
  __esModule: true,
  default: () => <div data-testid="toast-container">Toast Container</div>,
}));

// Mock contexts
jest.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    theme: 'light',
    effectiveTheme: 'light',
    changeTheme: jest.fn(),
    isDark: false,
  }),
}));

jest.mock('../../contexts/PomodoroContext', () => ({
  PomodoroProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  usePomodoro: () => ({
    isRunning: false,
    isPaused: false,
    isBreak: false,
    timeLeft: 1500,
    currentInterval: 1,
    totalIntervals: 4,
    start: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    skip: jest.fn(),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the app with all layout components', async () => {
      render(<App />);

      // Check if main layout components are rendered
      expect(screen.getByTestId('title-bar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();

      // Wait for Suspense to resolve and check default view
      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });
    });

    it('renders with ThemeProvider', async () => {
      const { container } = render(<App />);

      // App should render successfully with theme provider
      await waitFor(() => {
        expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
      });
    });

    it('renders with PomodoroProvider', async () => {
      render(<App />);

      // App should render successfully with pomodoro provider
      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      });
    });

    it('loads and displays dashboard view by default', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });
    });
  });

  describe('View Navigation', () => {
    it('switches to tracker view when tracker button is clicked', async () => {
      render(<App />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      // Click tracker button
      const trackerButton = screen.getByText('Tracker');
      fireEvent.click(trackerButton);

      // Check if tracker view is rendered
      await waitFor(() => {
        expect(screen.getByText('TimeTracker View')).toBeInTheDocument();
      });
    });

    it('switches to reports view when reports button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const reportsButton = screen.getByText('Reports');
      fireEvent.click(reportsButton);

      await waitFor(() => {
        expect(screen.getByText('Reports View')).toBeInTheDocument();
      });
    });

    it('switches to analytics view when analytics button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const analyticsButton = screen.getByText('Analytics');
      fireEvent.click(analyticsButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics View')).toBeInTheDocument();
      });
    });

    it('switches to activity log view when activity log button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const activityLogButton = screen.getByText('Activity Log');
      fireEvent.click(activityLogButton);

      await waitFor(() => {
        expect(screen.getByText('ActivityLog View')).toBeInTheDocument();
      });
    });

    it('switches to goals view when goals button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const goalsButton = screen.getByText('Goals');
      fireEvent.click(goalsButton);

      await waitFor(() => {
        expect(screen.getByText('Goals View')).toBeInTheDocument();
      });
    });

    it('switches to focus mode view when focus button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const focusButton = screen.getByText('Focus');
      fireEvent.click(focusButton);

      await waitFor(() => {
        expect(screen.getByText('FocusMode View')).toBeInTheDocument();
      });
    });

    it('switches to categories view when categories button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const categoriesButton = screen.getByText('Categories');
      fireEvent.click(categoriesButton);

      await waitFor(() => {
        expect(screen.getByText('Categories View')).toBeInTheDocument();
      });
    });

    it('switches to settings view when settings button is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Settings View')).toBeInTheDocument();
      });
    });
  });

  describe('View Persistence', () => {
    it('can switch back to dashboard after navigating away', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      // Navigate to settings
      fireEvent.click(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Settings View')).toBeInTheDocument();
      });

      // Navigate back to dashboard
      fireEvent.click(screen.getByText('Dashboard'));

      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });
    });

    it('can navigate between multiple views', async () => {
      render(<App />);

      // Start at dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard View')).toBeInTheDocument();
      });

      // Go to reports
      fireEvent.click(screen.getByText('Reports'));
      await waitFor(() => {
        expect(screen.getByText('Reports View')).toBeInTheDocument();
      });

      // Go to analytics
      fireEvent.click(screen.getByText('Analytics'));
      await waitFor(() => {
        expect(screen.getByText('Analytics View')).toBeInTheDocument();
      });

      // Go to goals
      fireEvent.click(screen.getByText('Goals'));
      await waitFor(() => {
        expect(screen.getByText('Goals View')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Structure', () => {
    it('renders main container with correct layout classes', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        const mainLayout = container.querySelector('.flex.flex-col.h-screen');
        expect(mainLayout).toBeInTheDocument();
      });
    });

    it('renders sidebar and main content in flex layout', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        const flexContainer = container.querySelector('.flex.flex-1.overflow-hidden');
        expect(flexContainer).toBeInTheDocument();
      });
    });

    it('renders main content area with overflow', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        const mainContent = container.querySelector('.flex-1.overflow-y-auto');
        expect(mainContent).toBeInTheDocument();
      });
    });
  });
});
