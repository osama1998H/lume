import { useState, lazy, Suspense } from 'react';
import ErrorBoundary from './components/layout/ErrorBoundary';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/ui/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { PomodoroProvider } from './contexts/PomodoroContext';

// Lazy load view components for better startup performance
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const TimeTracker = lazy(() => import('./components/pages/TimeTracker'));
const Reports = lazy(() => import('./components/pages/Reports'));
const Analytics = lazy(() => import('./components/pages/Analytics'));
const Goals = lazy(() => import('./components/pages/Goals'));
const Todos = lazy(() => import('./components/pages/Todos'));
const FocusMode = lazy(() => import('./components/pages/FocusMode'));
const Settings = lazy(() => import('./components/pages/Settings'));
const Categories = lazy(() => import('./components/pages/Categories'));
const ActivityLog = lazy(() => import('./components/pages/ActivityLog'));

type View = 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'activitylog' | 'goals' | 'todos' | 'focus' | 'categories' | 'settings';

/**
 * Top-level application component that initializes theming, manages the active view, and composes the main layout with a title bar, sidebar, and view content.
 *
 * @returns The app's root JSX element containing the composed layout, navigation, and the currently selected view.
 */
function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tracker':
        return <TimeTracker />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <Analytics />;
      case 'activitylog':
        return <ActivityLog />;
      case 'goals':
        return <Goals />;
      case 'todos':
        return <Todos />;
      case 'focus':
        return <FocusMode />;
      case 'categories':
        return <Categories />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <PomodoroProvider>
        <ErrorBoundary>
          <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            <TitleBar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar currentView={currentView} onViewChange={setCurrentView} />
              <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <ErrorBoundary>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                    </div>
                  }>
                    {renderView()}
                  </Suspense>
                </ErrorBoundary>
              </main>
            </div>
          </div>
          <ToastContainer />
        </ErrorBoundary>
      </PomodoroProvider>
    </ThemeProvider>
  );
}

export default App;