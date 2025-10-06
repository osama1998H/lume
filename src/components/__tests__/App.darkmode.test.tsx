import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock all the child components
jest.mock('../Dashboard', () => () => <div>Dashboard Mock</div>);
jest.mock('../TimeTracker', () => () => <div>TimeTracker Mock</div>);
jest.mock('../Reports', () => () => <div>Reports Mock</div>);
jest.mock('../Settings', () => () => <div>Settings Mock</div>);
jest.mock('../TitleBar', () => () => <div>TitleBar Mock</div>);
jest.mock('../Sidebar', () => ({ currentView, onViewChange }: any) => (
  <div data-testid="sidebar">Sidebar Mock</div>
));
jest.mock('../ErrorBoundary', () => ({ children }: any) => <>{children}</>);

// Mock useTheme hook
const mockChangeTheme = jest.fn();
let mockThemeValues = {
  theme: 'light' as const,
  effectiveTheme: 'light' as const,
  changeTheme: mockChangeTheme,
  isDark: false,
};

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => mockThemeValues,
}));

describe('App Component - Dark Mode Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
    mockThemeValues = {
      theme: 'light',
      effectiveTheme: 'light',
      changeTheme: mockChangeTheme,
      isDark: false,
    };
  });

  describe('Dark mode classes', () => {
    it('should apply dark mode classes to main container', () => {
      const { container } = render(<App />);
      
      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('bg-gray-50');
      expect(mainElement).toHaveClass('dark:bg-gray-900');
    });

    it('should apply dark mode classes to root container', () => {
      const { container } = render(<App />);
      
      const rootDiv = container.querySelector('.flex.flex-col.h-screen');
      expect(rootDiv).toHaveClass('bg-gray-50');
      expect(rootDiv).toHaveClass('dark:bg-gray-900');
    });

    it('should initialize useTheme hook on mount', () => {
      render(<App />);
      
      // The hook should have been called during render
      expect(mockChangeTheme).not.toHaveBeenCalled(); // Just initialization, not changing
    });
  });

  describe('Theme initialization', () => {
    it('should call useTheme on component mount', () => {
      const useThemeSpy = jest.spyOn(require('../../hooks/useTheme'), 'useTheme');
      
      render(<App />);
      
      expect(useThemeSpy).toHaveBeenCalled();
    });

    it('should render correctly with dark theme', () => {
      mockThemeValues = {
        theme: 'dark',
        effectiveTheme: 'dark',
        changeTheme: mockChangeTheme,
        isDark: true,
      };

      const { container } = render(<App />);
      
      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('dark:bg-gray-900');
    });

    it('should render correctly with system theme', () => {
      mockThemeValues = {
        theme: 'system',
        effectiveTheme: 'light',
        changeTheme: mockChangeTheme,
        isDark: false,
      };

      render(<App />);
      
      // Should render without errors
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('should render TitleBar, Sidebar, and main content area', () => {
      render(<App />);
      
      expect(screen.getByText('TitleBar Mock')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Mock')).toBeInTheDocument();
    });

    it('should maintain layout structure with dark mode classes', () => {
      const { container } = render(<App />);
      
      const flexContainer = container.querySelector('.flex.flex-1');
      expect(flexContainer).toBeInTheDocument();
      
      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('flex-1', 'overflow-y-auto');
    });
  });

  describe('Error boundary integration', () => {
    it('should wrap components in ErrorBoundary', () => {
      render(<App />);
      
      // Components should render successfully through error boundary
      expect(screen.getByText('Dashboard Mock')).toBeInTheDocument();
    });
  });
});