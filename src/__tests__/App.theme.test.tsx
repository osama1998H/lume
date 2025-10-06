import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

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
  let mockUseTheme: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useTheme hook
    mockUseTheme = jest.fn().mockReturnValue({
      theme: 'system',
      effectiveTheme: 'light',
      changeTheme: jest.fn(),
      isDark: false,
    });
    
    jest.mock('../hooks/useTheme', () => ({
      useTheme: mockUseTheme,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call useTheme hook on mount', () => {
    const useThemeSpy = jest.spyOn(require('../hooks/useTheme'), 'useTheme');
    
    render(<App />);
    
    expect(useThemeSpy).toHaveBeenCalled();
  });

  it('should render app with theme initialized', () => {
    render(<App />);
    
    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should apply dark mode classes when theme is dark', () => {
    jest.spyOn(require('../hooks/useTheme'), 'useTheme').mockReturnValue({
      theme: 'dark',
      effectiveTheme: 'dark',
      changeTheme: jest.fn(),
      isDark: true,
    });

    const { container } = render(<App />);
    
    // Check for dark mode classes in the container
    const mainContainer = container.querySelector('.dark\\:bg-gray-900');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should apply light mode classes when theme is light', () => {
    jest.spyOn(require('../hooks/useTheme'), 'useTheme').mockReturnValue({
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: jest.fn(),
      isDark: false,
    });

    const { container } = render(<App />);
    
    // Check for light mode classes
    const mainContainer = container.querySelector('.bg-gray-50');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should initialize theme before rendering children', () => {
    const initOrder: string[] = [];
    
    jest.spyOn(require('../hooks/useTheme'), 'useTheme').mockImplementation(() => {
      initOrder.push('useTheme');
      return {
        theme: 'system',
        effectiveTheme: 'light',
        changeTheme: jest.fn(),
        isDark: false,
      };
    });

    render(<App />);
    
    expect(initOrder[0]).toBe('useTheme');
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