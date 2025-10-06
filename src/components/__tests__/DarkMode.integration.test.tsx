import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import TimeTracker from '../TimeTracker';
import Reports from '../Reports';
import Sidebar from '../Sidebar';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

describe('Dark Mode Integration Tests', () => {
  beforeEach(() => {
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
    delete (window as any).electronAPI;
    jest.clearAllMocks();
  });

  describe('Dashboard Dark Mode Classes', () => {
    it('should have dark mode text classes for headings', async () => {
      const { container } = render(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode background classes for cards', async () => {
      const { container } = render(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const darkBgElements = container.querySelectorAll('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800');
      expect(darkBgElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode classes for stat cards', async () => {
      const { container } = render(<Dashboard />);
      
      await screen.findByText('dashboard.title');
      
      const primaryColorElements = container.querySelectorAll('.dark\\:text-primary-400');
      expect(primaryColorElements.length).toBeGreaterThan(0);
    });
  });

  describe('TimeTracker Dark Mode Classes', () => {
    it('should have dark mode text classes', async () => {
      const { container } = render(<TimeTracker />);
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode input classes', async () => {
      const { container } = render(<TimeTracker />);
      
      const darkInputElements = container.querySelectorAll('.dark\\:bg-gray-700, .dark\\:border-gray-600');
      expect(darkInputElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode timer display', async () => {
      const { container } = render(<TimeTracker />);
      
      const timerElement = container.querySelector('.dark\\:text-primary-400');
      expect(timerElement).toBeInTheDocument();
    });
  });

  describe('Reports Dark Mode Classes', () => {
    it('should have dark mode text classes for stats', async () => {
      const { container } = render(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkTextElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-400');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode select dropdown', async () => {
      const { container } = render(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkSelectElements = container.querySelectorAll('.dark\\:bg-gray-700');
      expect(darkSelectElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode progress bars', async () => {
      const { container } = render(<Reports />);
      
      await screen.findByText('reports.title');
      
      const darkProgressElements = container.querySelectorAll('.dark\\:bg-gray-700, .dark\\:bg-primary-500');
      expect(darkProgressElements.length).toBeGreaterThan(0);
    });
  });

  describe('Sidebar Dark Mode Classes', () => {
    it('should have dark mode background', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkBgElement = container.querySelector('.dark\\:bg-gray-800');
      expect(darkBgElement).toBeInTheDocument();
    });

    it('should have dark mode border', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkBorderElement = container.querySelector('.dark\\:border-gray-700');
      expect(darkBorderElement).toBeInTheDocument();
    });

    it('should have dark mode text for app name', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkTextElement = container.querySelector('.dark\\:text-primary-400');
      expect(darkTextElement).toBeInTheDocument();
    });

    it('should have dark mode hover states for menu items', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkHoverElements = container.querySelectorAll('.dark\\:hover\\:bg-gray-700');
      expect(darkHoverElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode active menu item styling', () => {
      const { container } = render(<Sidebar currentView="dashboard" onViewChange={jest.fn()} />);
      
      const darkActiveElements = container.querySelectorAll('.dark\\:bg-primary-900\\/30');
      expect(darkActiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency Across Components', () => {
    it('should use consistent dark mode primary colors', async () => {
      const { container: dashboardContainer } = render(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = render(<TimeTracker />);
      const { container: reportsContainer } = render(<Reports />);
      
      // Check all use dark:text-primary-400 for emphasis
      expect(dashboardContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:text-primary-400')).toBeInTheDocument();
    });

    it('should use consistent dark mode background colors', async () => {
      const { container: dashboardContainer } = render(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = render(<TimeTracker />);
      const { container: reportsContainer } = render(<Reports />);
      
      // Check all use dark gray backgrounds
      expect(dashboardContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:bg-gray-700\\/50, .dark\\:bg-gray-800')).toBeInTheDocument();
    });

    it('should use consistent dark mode text colors for secondary text', async () => {
      const { container: dashboardContainer } = render(<Dashboard />);
      await screen.findByText('dashboard.title');
      
      const { container: trackerContainer } = render(<TimeTracker />);
      const { container: reportsContainer } = render(<Reports />);
      
      // Check all use dark:text-gray-400 for secondary text
      expect(dashboardContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
      expect(trackerContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
      expect(reportsContainer.querySelector('.dark\\:text-gray-400')).toBeInTheDocument();
    });
  });

  describe('Loading States Dark Mode', () => {
    it('should have dark mode loading text in Dashboard', async () => {
      mockElectronAPI.getTodayStats.mockImplementation(() => new Promise(() => {}));
      
      const { container } = render(<Dashboard />);
      
      const loadingElement = container.querySelector('.dark\\:text-gray-400');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should have dark mode loading spinner in Reports', async () => {
      mockElectronAPI.getStats.mockImplementation(() => new Promise(() => {}));
      
      const { container } = render(<Reports />);
      
      const loadingElement = container.querySelector('.dark\\:text-gray-400');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Interactive Elements Dark Mode', () => {
    it('should have dark mode classes for form inputs in TimeTracker', () => {
      const { container } = render(<TimeTracker />);
      
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        const classes = input.className;
        expect(classes).toMatch(/dark:(bg-gray-700|border-gray-600)/);
      });
    });

    it('should have dark mode classes for select elements in Reports', async () => {
      const { container } = render(<Reports />);
      
      await screen.findByText('reports.title');
      
      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        const classes = select.className;
        expect(classes).toMatch(/dark:(bg-gray-700|text-gray-100)/);
      });
    });
  });
});