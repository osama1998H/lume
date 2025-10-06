import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock all child components to isolate App testing
jest.mock('../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/TitleBar', () => ({
  __esModule: true,
  default: () => <div data-testid="titlebar">TitleBar</div>,
}));

jest.mock('../components/Sidebar', () => ({
  __esModule: true,
  default: ({ currentView, onViewChange }: any) => (
    <div data-testid="sidebar">
      Sidebar - {currentView}
      <button onClick={() => onViewChange('settings')}>Go to Settings</button>
    </div>
  ),
}));

jest.mock('../components/Dashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));

jest.mock('../components/TimeTracker', () => ({
  __esModule: true,
  default: () => <div data-testid="timetracker">TimeTracker</div>,
}));

jest.mock('../components/Reports', () => ({
  __esModule: true,
  default: () => <div data-testid="reports">Reports</div>,
}));

jest.mock('../components/Settings', () => ({
  __esModule: true,
  default: () => <div data-testid="settings">Settings</div>,
}));

// Mock useTheme hook
const mockChangeTheme = jest.fn();
const mockUseTheme = jest.fn(() => ({
  theme: 'light',
  effectiveTheme: 'light',
  changeTheme: mockChangeTheme,
  isDark: false,
}));

jest.mock('../hooks/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('App Component - Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('calls useTheme on mount and renders layout', () => {
    render(<App />);
    expect(mockUseTheme).toHaveBeenCalled();
    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('maintains accessibility landmarks', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('handles theme change without breaking rendering', () => {
    render(<App />);
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      effectiveTheme: 'dark',
      changeTheme: mockChangeTheme,
      isDark: true,
    });
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});