import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'Lume',
        'navigation.dashboard': 'Dashboard',
        'navigation.tracker': 'Time Tracker',
        'navigation.reports': 'Reports',
        'navigation.analytics': 'Analytics',
        'navigation.activityLog': 'Activity Log',
        'navigation.goals': 'Goals',
        'navigation.focus': 'Focus Mode',
        'navigation.categories': 'Categories',
        'navigation.settings': 'Settings',
        'navigation.collapseSidebar': 'Collapse Sidebar',
        'navigation.expandSidebar': 'Expand Sidebar',
        'navigation.mainNavigation': 'Main navigation',
        'navigation.primaryNavigation': 'Primary navigation',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useLanguage hook
jest.mock('../../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    isRTL: false,
  }),
}));

// Mock useKeyboardShortcuts hook
const mockUseKeyboardShortcuts = jest.fn();
jest.mock('../../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: (shortcuts: any) => {
    mockUseKeyboardShortcuts(shortcuts);
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="dashboard-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  BarChart3: () => <div data-testid="barchart-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Coffee: () => <div data-testid="coffee-icon" />,
  FolderOpen: () => <div data-testid="folder-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  List: () => <div data-testid="list-icon" />,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.platform
Object.defineProperty(navigator, 'platform', {
  value: 'Win32',
  writable: true,
});

describe('Sidebar', () => {
  const mockOnViewChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockUseKeyboardShortcuts.mockClear();
  });

  describe('Rendering', () => {
    it('renders the sidebar component', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('renders app name when expanded', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);
      expect(screen.getByText('Lume')).toBeInTheDocument();
    });

    it('renders all menu items', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Time Tracker')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Focus Mode')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders menu item icons', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('timer-icon').length).toBeGreaterThan(0); // One in logo, one in menu
      expect(screen.getByTestId('barchart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trending-icon')).toBeInTheDocument();
      expect(screen.getByTestId('list-icon')).toBeInTheDocument();
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
      expect(screen.getByTestId('folder-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('View Selection', () => {
    it('calls onViewChange when dashboard is clicked', () => {
      render(<Sidebar currentView="reports" onViewChange={mockOnViewChange} />);

      fireEvent.click(screen.getByText('Dashboard'));
      expect(mockOnViewChange).toHaveBeenCalledWith('dashboard');
    });

    it('calls onViewChange for each menu item', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      fireEvent.click(screen.getByText('Time Tracker'));
      expect(mockOnViewChange).toHaveBeenCalledWith('tracker');

      fireEvent.click(screen.getByText('Reports'));
      expect(mockOnViewChange).toHaveBeenCalledWith('reports');

      fireEvent.click(screen.getByText('Analytics'));
      expect(mockOnViewChange).toHaveBeenCalledWith('analytics');

      fireEvent.click(screen.getByText('Activity Log'));
      expect(mockOnViewChange).toHaveBeenCalledWith('activitylog');

      fireEvent.click(screen.getByText('Goals'));
      expect(mockOnViewChange).toHaveBeenCalledWith('goals');

      fireEvent.click(screen.getByText('Focus Mode'));
      expect(mockOnViewChange).toHaveBeenCalledWith('focus');

      fireEvent.click(screen.getByText('Categories'));
      expect(mockOnViewChange).toHaveBeenCalledWith('categories');

      fireEvent.click(screen.getByText('Settings'));
      expect(mockOnViewChange).toHaveBeenCalledWith('settings');
    });

    it('highlights current view', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton).toHaveClass('bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'text-white');
    });

    it('does not highlight non-current views', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const reportsButton = screen.getByText('Reports').closest('button');
      expect(reportsButton).not.toHaveClass('bg-gradient-to-r');
    });
  });

  describe('Collapse/Expand', () => {
    it('sidebar is expanded by default', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('collapses sidebar when toggle button clicked', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-20');
    });

    it('expands sidebar when toggle button clicked while collapsed', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');

      // Collapse
      fireEvent.click(toggleButton!);
      expect(container.querySelector('aside')).toHaveClass('w-20');

      // Expand
      fireEvent.click(toggleButton!);
      expect(container.querySelector('aside')).toHaveClass('w-64');
    });

    it('hides app name when collapsed', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      expect(screen.queryByText('Lume')).not.toBeInTheDocument();
    });

    it('hides menu item labels when collapsed', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Dashboard')).toBeVisible();

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      expect(screen.queryByText('Dashboard')).not.toBeVisible();
    });

    it('changes toggle button text when collapsed', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      // Text is hidden but title attribute should change
      expect(screen.getByTitle('Expand Sidebar')).toBeInTheDocument();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('saves collapsed state to localStorage', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      expect(mockLocalStorage.getItem('sidebarCollapsed')).toBe('true');
    });

    it('saves expanded state to localStorage', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');

      // Collapse then expand
      fireEvent.click(toggleButton!);
      fireEvent.click(toggleButton!);

      expect(mockLocalStorage.getItem('sidebarCollapsed')).toBe('false');
    });

    it('loads collapsed state from localStorage on mount', () => {
      mockLocalStorage.setItem('sidebarCollapsed', 'true');

      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-20');
    });

    it('handles invalid localStorage data gracefully', () => {
      mockLocalStorage.setItem('sidebarCollapsed', 'invalid-json');

      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      // Should default to expanded
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock localStorage to throw error
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('registers keyboard shortcuts for navigation', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(mockUseKeyboardShortcuts).toHaveBeenCalled();
      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];

      expect(shortcuts).toHaveLength(10); // 9 views + toggle
    });

    it('registers Ctrl+1 for dashboard', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];
      const dashboardShortcut = shortcuts.find((s: any) => s.key === '1');

      expect(dashboardShortcut).toBeDefined();
      expect(dashboardShortcut.ctrl).toBe(true);

      // Trigger the shortcut
      dashboardShortcut.action();
      expect(mockOnViewChange).toHaveBeenCalledWith('dashboard');
    });

    it('registers Ctrl+2-9 for other views', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];

      // Test a few shortcuts
      const trackerShortcut = shortcuts.find((s: any) => s.key === '2');
      trackerShortcut.action();
      expect(mockOnViewChange).toHaveBeenCalledWith('tracker');

      const reportsShortcut = shortcuts.find((s: any) => s.key === '3');
      reportsShortcut.action();
      expect(mockOnViewChange).toHaveBeenCalledWith('reports');

      const settingsShortcut = shortcuts.find((s: any) => s.key === '9');
      settingsShortcut.action();
      expect(mockOnViewChange).toHaveBeenCalledWith('settings');
    });

    it('registers Ctrl+[ for toggle sidebar', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];
      const toggleShortcut = shortcuts.find((s: any) => s.key === '[');

      expect(toggleShortcut).toBeDefined();
      expect(toggleShortcut.ctrl).toBe(true);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');

      // Trigger toggle
      toggleShortcut.action();

      // Re-render to see the effect
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      // Trigger toggle again through the stored action
      const newShortcuts = mockUseKeyboardShortcuts.mock.calls[mockUseKeyboardShortcuts.mock.calls.length - 1][0];
      const newToggleShortcut = newShortcuts.find((s: any) => s.key === '[');
      newToggleShortcut.action();
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for main navigation', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('has aria-label for primary navigation', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    });

    it('menu items have aria-current when active', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton).toHaveAttribute('aria-current', 'page');
    });

    it('menu items do not have aria-current when inactive', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const reportsButton = screen.getByText('Reports').closest('button');
      expect(reportsButton).not.toHaveAttribute('aria-current');
    });

    it('toggle button has aria-expanded attribute', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggleButton!);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('menu items show keyboard shortcuts in aria-label', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const dashboardButton = screen.getByLabelText(/Dashboard.*Ctrl\+1/);
      expect(dashboardButton).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('uses ChevronRight for LTR when expanded', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
    });

    it('uses ChevronLeft for LTR when collapsed', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const toggleButton = screen.getByText('Collapse Sidebar').closest('button');
      fireEvent.click(toggleButton!);

      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('has transition classes on sidebar', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
    });

    it('active menu item has gradient background', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton).toHaveClass('bg-gradient-to-r', 'from-primary-500', 'to-primary-600');
    });

    it('inactive menu items have hover effect', () => {
      render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const reportsButton = screen.getByText('Reports').closest('button');
      expect(reportsButton).toHaveClass('hover:bg-gray-100');
    });

    it('sidebar has correct border styling', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={mockOnViewChange} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('border-r', 'border-gray-200');
    });
  });
});
