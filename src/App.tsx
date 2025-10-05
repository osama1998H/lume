import { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TimeTracker from './components/TimeTracker';
import Reports from './components/Reports';
import Settings from './components/Settings';

type View = 'dashboard' | 'tracker' | 'reports' | 'settings';

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
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;