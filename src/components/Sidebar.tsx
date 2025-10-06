import React from 'react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'tracker' | 'reports' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: '📊' },
    { id: 'tracker', label: t('navigation.tracker'), icon: '⏱️' },
    { id: 'reports', label: t('navigation.reports'), icon: '📈' },
    { id: 'settings', label: t('navigation.settings'), icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg h-full border-r dark:border-gray-700">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-8">{t('app.name')}</h1>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                currentView === item.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;