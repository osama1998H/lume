import { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TimeTracker from './components/TimeTracker';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { useTheme } from './hooks/useTheme';

type View = 'dashboard' | 'tracker' | 'reports' | 'settings';

function App() {
  useTheme(); // Initialize theme on app mount
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tracker':
        return <TimeTracker />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
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
    </ErrorBoundary>
  );
}

export default App;