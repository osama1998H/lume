import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../pages/Dashboard';
import TimeTracker from '../pages/TimeTracker';
import Reports from '../pages/Reports';
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

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useLanguage hook
jest.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    changeLanguage: jest.fn(),
  }),
}));

// Mock electronAPI
const mockElectronAPI = {
  getTodayStats: jest.fn(),
  getRecentTimeEntries: jest.fn(),
  getRecentAppUsage: jest.fn(),
  getStats: jest.fn(),
  getAllTimeEntries: jest.fn(),
  getAllAppUsage: jest.fn(),
};

// Helper function to render with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('Dark Mode Integration Tests', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = mockElectronAPI;

    // Setup default mocks
    mockElectronAPI.getTodayStats.mockResolvedValue({
      totalTime: 3600000,
      tasksCompleted: 5,
      activeTask: 'Test Task'
    });

    mockElectronAPI.getRecentTimeEntries.mockResolvedValue([]);
    mockElectronAPI.getRecentAppUsage.mockResolvedValue([]);
    mockElectronAPI.getStats.mockResolvedValue({
      totalTrackedTime: 7200000,
      completedTasks: 10,
      averageTaskTime: 1800000,
      totalAppTime: 5400000
    });
    mockElectronAPI.getAllTimeEntries.mockResolvedValue([]);
    mockElectronAPI.getAllAppUsage.mockResolvedValue([]);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
    jest.clearAllMocks();
  });

  describe('Dashboard Dark Mode Classes', () => {
    it('should have dark mode text classes for headings', async () => {
      const { container } = renderWithTheme(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode background classes for cards', async () => {
      const { container } = renderWithTheme(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const darkBgElements = container.querySelectorAll('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800');
      expect(darkBgElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode classes for stat cards', async () => {
      const { container } = renderWithTheme(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const primaryColorElements = container.querySelectorAll('.dark\\:text-primary-400');
      expect(primaryColorElements.length).toBeGreaterThan(0);
    });
  });

  describe('TimeTracker Dark Mode Classes', () => {
    it('should have dark mode text classes', async () => {
      const { container } = renderWithTheme(<TimeTracker />);
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode input classes', async () => {
      const { container } = renderWithTheme(<TimeTracker />);
      
      const darkInputElements = container.querySelectorAll('.dark\\:bg-gray-700, .dark\\:border-gray-600');
      expect(darkInputElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode timer display', async () => {
      const { container } = renderWithTheme(<TimeTracker />);
      
      const timerElement = container.querySelector('.dark\\:text-primary-400');
      expect(timerElement).toBeInTheDocument();
    });
  });

  describe('Reports Dark Mode Classes', () => {
    it('should have dark mode text classes for stats', async () => {
      const { container } = renderWithTheme(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode select dropdown', async () => {
      const { container } = renderWithTheme(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkSelectElements = container.querySelectorAll('.dark\\:bg-gray-700');
      expect(darkSelectElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode progress bars', async () => {
      const { container } = renderWithTheme(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkProgressElements = container.querySelectorAll('.dark\\:bg-gray-700, .dark\\:bg-primary-500');
      expect(darkProgressElements.length).toBeGreaterThan(0);
    });
  });

  describe('Sidebar Dark Mode Classes', () => {
    it('should have dark mode background', () => {
      const { container } = renderWithTheme(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkBgElement = container.querySelector('.dark\\:bg-gray-800');
      expect(darkBgElement).toBeInTheDocument();
    });

    it('should have dark mode border', () => {
      const { container } = renderWithTheme(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkBorderElement = container.querySelector('.dark\\:border-gray-700');
      expect(darkBorderElement).toBeInTheDocument();
    });

    it('should have dark mode text for app name', () => {
      const { container } = renderWithTheme(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkTextElement = container.querySelector('.dark\\:text-primary-400');
      expect(darkTextElement).toBeInTheDocument();
    });

    it('should have dark mode hover states for menu items', () => {
      const { container } = renderWithTheme(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkHoverElements = container.querySelectorAll('.dark\\:hover\\:bg-gray-700');
      expect(darkHoverElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode active menu item styling', () => {
      const { container } = renderWithTheme(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkActiveElements = container.querySelectorAll('.dark\\:bg-primary-900\\/30');
      expect(darkActiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency Across Components', () => {
    it('should use consistent dark mode primary colors', async () => {
      const { container: dashboardContainer } = renderWithTheme(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = renderWithTheme(<TimeTracker />);
      const { container: reportsContainer } = renderWithTheme(<Reports />);
      
      // Check all use dark:text-primary-400 for emphasis
      expect(dashboardContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
    });

    it('should use consistent dark mode background colors', async () => {
      const { container: dashboardContainer } = renderWithTheme(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = renderWithTheme(<TimeTracker />);
      const { container: reportsContainer } = renderWithTheme(<Reports />);
      
      // Check all use dark gray backgrounds
      expect(dashboardContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
    });

    it('should use consistent dark mode text colors for secondary text', async () => {
      const { container: dashboardContainer } = renderWithTheme(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = renderWithTheme(<TimeTracker />);
      const { container: reportsContainer } = renderWithTheme(<Reports />);
      
      // Check all use dark:text-gray-400 for secondary text
      expect(dashboardContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
    });
  });

  describe('Loading States Dark Mode', () => {
    it('should have dark mode loading text in Dashboard', async () => {
      mockElectronAPI.getTodayStats.mockImplementation(() => new Promise(() => {}));
      
      const { container } = renderWithTheme(<Dashboard />);
      
      const loadingElement = container.querySelector('.dark\\:text-gray-400');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should have dark mode loading spinner in Reports', async () => {
      mockElectronAPI.getStats.mockImplementation(() => new Promise(() => {}));
      
      const { container } = renderWithTheme(<Reports />);
      
      const loadingElement = container.querySelector('.dark\\:text-gray-400');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Interactive Elements Dark Mode', () => {
    it('should have dark mode classes for form inputs in TimeTracker', () => {
      const { container } = renderWithTheme(<TimeTracker />);
      
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        const classes = input.className;
        expect(classes).toMatch(/dark:(bg-gray-700|border-gray-600)/);
      });
    });

    it('should have dark mode classes for select elements in Reports', async () => {
      const { container } = renderWithTheme(<Reports />);
      
      await screen.findByText('reports.title');
      
      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        const classes = select.className;
        expect(classes).toMatch(/dark:(bg-gray-700|text-gray-100)/);
      });
    });
  });
});