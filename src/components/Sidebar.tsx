import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Timer, BarChart3, Activity, Target, Coffee, FolderOpen, Settings, TrendingUp, ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  // State for sidebar collapse
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Save collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  const menuItems: Array<{ id: 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings'; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: LayoutDashboard },
    { id: 'tracker', label: t('navigation.tracker'), icon: Timer },
    { id: 'reports', label: t('navigation.reports'), icon: BarChart3 },
    { id: 'analytics', label: t('navigation.analytics'), icon: TrendingUp },
    { id: 'timeline', label: t('navigation.timeline'), icon: Activity },
    { id: 'goals', label: t('navigation.goals'), icon: Target },
    { id: 'focus', label: t('navigation.focus'), icon: Coffee },
    { id: 'categories', label: t('navigation.categories'), icon: FolderOpen },
    { id: 'settings', label: t('navigation.settings'), icon: Settings },
  ];

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determine chevron icon based on collapse state and RTL
  const getChevronIcon = () => {
    if (isRTL) {
      return isCollapsed ? ChevronLeft : ChevronRight;
    } else {
      return isCollapsed ? ChevronRight : ChevronLeft;
    }
  };

  const ChevronIcon = getChevronIcon();

  return (
    <div
      className={`
        ${isCollapsed ? 'w-20' : 'w-64'}
        bg-white dark:bg-gray-800 h-full border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        flex flex-col
      `}
    >
      <div className="flex-1 p-6">
        <div className={`mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <div className={`
            ${isCollapsed ? 'w-11 h-11' : 'w-8 h-8'}
            rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0
            transition-all duration-300 ease-in-out
          `}>
            <Timer className={`
              ${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}
              text-white
              flex-shrink-0
              transition-all duration-300 ease-in-out
            `} />
          </div>
          {!isCollapsed && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
              {t('app.name')}
            </h1>
          )}
        </div>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`
                  group flex items-center text-left
                  ${isCollapsed ? 'w-11 h-11 justify-center rounded-full' : 'w-full gap-3 px-3.5 py-2.5 rounded-xl'}
                  transition-all duration-300 ease-in-out
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Icon className={`
                  ${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}
                  flex-shrink-0
                  transition-all duration-300 ease-in-out
                  group-hover:scale-110
                  ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}
                `} />
                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toggle Button */}
      <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
          className="
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            hover:bg-gray-100 dark:hover:bg-gray-700/50
            text-gray-600 dark:text-gray-400
            transition-all duration-200
          "
        >
          <ChevronIcon className={`
            ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'}
            flex-shrink-0
            transition-all duration-300 ease-in-out
          `} />
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">
              {t('navigation.collapseSidebar')}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;