import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import Sidebar from '../layout/Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const renderWithI18n = (component: React.ReactElement, language = 'en') => {
  i18n.changeLanguage(language);
  return render(
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>{component}</I18nextProvider>
    </ThemeProvider>
  );
};

describe('Sidebar i18n Integration', () => {
  const mockOnViewChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('English translations', () => {
    it('should render app name in English', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      expect(screen.getByText('Lume')).toBeInTheDocument();
    });

    it('should render all navigation items in English', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Time Tracker')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render navigation with emojis', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('⏱️')).toBeInTheDocument();
      expect(screen.getByText('📈')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('Arabic translations', () => {
    it('should render app name in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      expect(screen.getByText('لومي')).toBeInTheDocument();
    });

    it('should render all navigation items in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      expect(screen.getByText('متتبع الوقت')).toBeInTheDocument();
      expect(screen.getByText('التقارير')).toBeInTheDocument();
      expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    });

    it('should maintain emojis in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      // Emojis should remain the same
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('⏱️')).toBeInTheDocument();
      expect(screen.getByText('📈')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('Navigation functionality', () => {
    it('should call onViewChange with correct view when clicking navigation items', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      fireEvent.click(screen.getByText('Time Tracker'));
      expect(mockOnViewChange).toHaveBeenCalledWith('tracker');
      
      fireEvent.click(screen.getByText('Reports'));
      expect(mockOnViewChange).toHaveBeenCalledWith('reports');
      
      fireEvent.click(screen.getByText('Settings'));
      expect(mockOnViewChange).toHaveBeenCalledWith('settings');
    });

    it('should maintain functionality in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      fireEvent.click(screen.getByText('متتبع الوقت'));
      expect(mockOnViewChange).toHaveBeenCalledWith('tracker');
      
      fireEvent.click(screen.getByText('التقارير'));
      expect(mockOnViewChange).toHaveBeenCalledWith('reports');
      
      fireEvent.click(screen.getByText('الإعدادات'));
      expect(mockOnViewChange).toHaveBeenCalledWith('settings');
    });
  });

  describe('Active view highlighting', () => {
    it('should highlight active view in English', () => {
      renderWithI18n(<Sidebar currentView="tracker" onViewChange={mockOnViewChange} />);
      
      const trackerButton = screen.getByText('Time Tracker').closest('button');
      expect(trackerButton).toHaveClass('bg-primary-50');
    });

    it('should highlight active view in Arabic', () => {
      renderWithI18n(<Sidebar currentView="tracker" onViewChange={mockOnViewChange} />, 'ar');
      
      const trackerButton = screen.getByText('متتبع الوقت').closest('button');
      expect(trackerButton).toHaveClass('bg-primary-50');
    });

    it('should not highlight inactive views', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const reportsButton = screen.getByText('Reports').closest('button');
      expect(reportsButton).not.toHaveClass('bg-primary-50');
    });
  });

  describe('Language switching', () => {
    it('should update navigation items when language changes', () => {
      const { rerender } = renderWithI18n(
        <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />,
        'en'
      );
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument();

      i18n.changeLanguage('ar');
      rerender(
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />
          </I18nextProvider>
        </ThemeProvider>
      );

      expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should update app name when language changes', () => {
      const { rerender } = renderWithI18n(
        <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />,
        'en'
      );
      
      expect(screen.getByText('Lume')).toBeInTheDocument();

      i18n.changeLanguage('ar');
      rerender(
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />
          </I18nextProvider>
        </ThemeProvider>
      );

      expect(screen.getByText('لومي')).toBeInTheDocument();
      expect(screen.queryByText('Lume')).not.toBeInTheDocument();
    });

    it('should maintain active state after language change', () => {
      const { rerender } = renderWithI18n(
        <Sidebar currentView="reports" onViewChange={mockOnViewChange} />,
        'en'
      );
      
      let reportsButton = screen.getByText('Reports').closest('button');
      expect(reportsButton).toHaveClass('bg-primary-50');

      i18n.changeLanguage('ar');
      rerender(
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <Sidebar currentView="reports" onViewChange={mockOnViewChange} />
          </I18nextProvider>
        </ThemeProvider>
      );

      reportsButton = screen.getByText('التقارير').closest('button');
      expect(reportsButton).toHaveClass('bg-primary-50');
    });
  });

  describe('Menu item ordering', () => {
    it('should render menu items in correct order in English', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('Dashboard');
      expect(buttons[1]).toHaveTextContent('Time Tracker');
      expect(buttons[2]).toHaveTextContent('Reports');
      expect(buttons[3]).toHaveTextContent('Settings');
    });

    it('should render menu items in correct order in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('لوحة التحكم');
      expect(buttons[1]).toHaveTextContent('متتبع الوقت');
      expect(buttons[2]).toHaveTextContent('التقارير');
      expect(buttons[3]).toHaveTextContent('الإعدادات');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button roles', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });

    it('should maintain button accessibility in Arabic', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />, 'ar');
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
      buttons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle all view types correctly', () => {
      const views = ['dashboard', 'tracker', 'reports', 'settings'] as const;
      
      views.forEach(view => {
        const { unmount } = renderWithI18n(
          <Sidebar currentView={view} onViewChange={mockOnViewChange} />
        );
        
        // Should render without errors
        expect(screen.getAllByRole('button')).toHaveLength(4);
        
        unmount();
      });
    });

    it('should handle missing translations gracefully', () => {
      renderWithI18n(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      
      // Should render something even if translations are incomplete
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});