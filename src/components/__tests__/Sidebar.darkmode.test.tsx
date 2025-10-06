import React from 'react';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'Lume',
        'sidebar.dashboard': 'Dashboard',
        'sidebar.tracker': 'Time Tracker',
        'sidebar.reports': 'Reports',
        'sidebar.settings': 'Settings',
      };
      return translations[key] || key;
    },
  }),
}));

describe('Sidebar Component - Dark Mode Styles', () => {
  const mockOnViewChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Container styling', () => {
    it('should apply dark mode background to sidebar container', () => {
      const { container } = render(
        <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />
      );
      
      const sidebar = container.querySelector('.w-64');
      expect(sidebar).toHaveClass('bg-white');
      expect(sidebar).toHaveClass('dark:bg-gray-800');
    });

    it('should apply dark mode border to sidebar', () => {
      const { container } = render(
        <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />
      );
      
      const sidebar = container.querySelector('.w-64');
      expect(sidebar).toHaveClass('border-r');
      expect(sidebar).toHaveClass('dark:border-gray-700');
    });
  });

  describe('App name styling', () => {
    it('should apply dark mode classes to app name', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const appName = screen.getByText('Lume');
      expect(appName).toHaveClass('text-primary-600');
      expect(appName).toHaveClass('dark:text-primary-400');
    });
  });

  describe('Navigation items', () => {
    it('should apply dark mode classes to active menu item', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const dashboardButton = screen.getByText('sidebar.dashboard').closest('button');
      expect(dashboardButton).toHaveClass('bg-primary-100');
      expect(dashboardButton).toHaveClass('dark:bg-primary-900/30');
      expect(dashboardButton).toHaveClass('text-primary-700');
      expect(dashboardButton).toHaveClass('dark:text-primary-400');
    });

    it('should apply dark mode hover classes to inactive items', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const trackerButton = screen.getByText('sidebar.tracker').closest('button');
      expect(trackerButton).toHaveClass('hover:bg-gray-100');
      expect(trackerButton).toHaveClass('dark:hover:bg-gray-700');
      expect(trackerButton).toHaveClass('text-gray-700');
      expect(trackerButton).toHaveClass('dark:text-gray-300');
    });

    it('should apply consistent dark mode styling to all menu items', () => {
      render(<Sidebar currentView="reports" onViewChange={mockOnViewChange} />);
      
      const menuItems = ['sidebar.dashboard', 'sidebar.tracker', 'sidebar.reports', 'sidebar.settings'];
      
      menuItems.forEach(item => {
        const button = screen.getByText(item).closest('button');
        expect(button).toHaveClass('dark:hover:bg-gray-700');
      });
    });

    it('should style active Reports item with dark mode', () => {
      render(<Sidebar currentView="reports" onViewChange={mockOnViewChange} />);
      
      const reportsButton = screen.getByText('sidebar.reports').closest('button');
      expect(reportsButton).toHaveClass('bg-primary-100');
      expect(reportsButton).toHaveClass('dark:bg-primary-900/30');
    });

    it('should style active Settings item with dark mode', () => {
      render(<Sidebar currentView="settings" onViewChange={mockOnViewChange} />);
      
      const settingsButton = screen.getByText('sidebar.settings').closest('button');
      expect(settingsButton).toHaveClass('bg-primary-100');
      expect(settingsButton).toHaveClass('dark:bg-primary-900/30');
    });
  });

  describe('Border styling', () => {
    it('should apply dark mode border to active item', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const dashboardButton = screen.getByText('sidebar.dashboard').closest('button');
      expect(dashboardButton).toHaveClass('border-primary-200');
      expect(dashboardButton).toHaveClass('dark:border-primary-800');
    });
  });
});