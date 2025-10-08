import { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TimeTracker from './components/TimeTracker';
import Reports from './components/Reports';
import { Analytics } from './components/Analytics';
import Goals from './components/Goals';
import FocusMode from './components/FocusMode';
import Settings from './components/Settings';
import Categories from './components/Categories';
import Timeline from './components/Timeline';
import ToastContainer from './components/ui/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { PomodoroProvider } from './contexts/PomodoroContext';

type View = 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings';

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
      case 'timeline':
        return <Timeline />;
      case 'goals':
        return <Goals />;
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
                  {renderView()}
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