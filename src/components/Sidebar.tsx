import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Timer, BarChart3, Activity, Target, Coffee, FolderOpen, Settings, LucideIcon } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'tracker' | 'reports' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { t } = useTranslation();

  const menuItems: Array<{ id: 'dashboard' | 'tracker' | 'reports' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings'; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: LayoutDashboard },
    { id: 'tracker', label: t('navigation.tracker'), icon: Timer },
    { id: 'reports', label: t('navigation.reports'), icon: BarChart3 },
    { id: 'timeline', label: t('navigation.timeline'), icon: Activity },
    { id: 'goals', label: t('navigation.goals'), icon: Target },
    { id: 'focus', label: t('navigation.focus'), icon: Coffee },
    { id: 'categories', label: t('navigation.categories'), icon: FolderOpen },
    { id: 'settings', label: t('navigation.settings'), icon: Settings },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-full border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Timer className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('app.name')}</h1>
        </div>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;