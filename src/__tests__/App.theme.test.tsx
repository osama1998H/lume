import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as ThemeContext from '../contexts/ThemeContext';

// Mock all child components
jest.mock('../components/TitleBar', () => {
  return function TitleBar() {
    return <div data-testid="titlebar">TitleBar</div>;
  };
});

jest.mock('../components/Sidebar', () => {
  return function Sidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock('../components/Dashboard', () => {
  return function Dashboard() {
    return <div data-testid="dashboard">Dashboard</div>;
  };
});

jest.mock('../components/TimeTracker', () => {
  return function TimeTracker() {
    return <div data-testid="timetracker">TimeTracker</div>;
  };
});

jest.mock('../components/Reports', () => {
  return function Reports() {
    return <div data-testid="reports">Reports</div>;
  };
});

jest.mock('../components/Settings', () => {
  return function Settings() {
    return <div data-testid="settings">Settings</div>;
  };
});

jest.mock('../components/ErrorBoundary', () => {
  return function ErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="errorboundary">{children}</div>;
  };
});

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('App Component - Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render with ThemeProvider', () => {
    render(<App />);

    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('should render app with theme initialized', () => {
    render(<App />);
    
    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should apply background classes', () => {
    const { container } = render(<App />);

    // Check for background classes
    const mainContainer = container.querySelector('.bg-gray-50');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should have correct structure for theme styling', () => {
    const { container } = render(<App />);
    
    // Check that main container has flex layout
    const mainDiv = container.querySelector('.flex.flex-col.h-screen');
    expect(mainDiv).toBeInTheDocument();
    
    // Check that main content area exists
    const mainContent = container.querySelector('main.flex-1.overflow-y-auto');
    expect(mainContent).toBeInTheDocument();
  });

  it('should render all main sections', () => {
    render(<App />);
    
    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('errorboundary')).toBeInTheDocument();
  });

  it('should wrap components in ErrorBoundary', () => {
    render(<App />);
    
    const errorBoundaries = screen.getAllByTestId('errorboundary');
    expect(errorBoundaries.length).toBeGreaterThan(0);
  });
});