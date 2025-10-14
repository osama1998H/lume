import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Timer, BarChart3, Target, Coffee, FolderOpen, Settings, TrendingUp, ChevronLeft, ChevronRight, List, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'activitylog' | 'goals' | 'focus' | 'categories' | 'settings') => void;
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

  // Keyboard shortcuts for quick navigation (1-9 keys)
  useKeyboardShortcuts([
    { key: '1', ctrl: true, description: t('navigation.shortcuts.dashboard'), action: () => onViewChange('dashboard') },
    { key: '2', ctrl: true, description: t('navigation.shortcuts.tracker'), action: () => onViewChange('tracker') },
    { key: '3', ctrl: true, description: t('navigation.shortcuts.reports'), action: () => onViewChange('reports') },
    { key: '4', ctrl: true, description: t('navigation.shortcuts.analytics'), action: () => onViewChange('analytics') },
    { key: '5', ctrl: true, description: t('navigation.shortcuts.activityLog'), action: () => onViewChange('activitylog') },
    { key: '6', ctrl: true, description: t('navigation.shortcuts.goals'), action: () => onViewChange('goals') },
    { key: '7', ctrl: true, description: t('navigation.shortcuts.focus'), action: () => onViewChange('focus') },
    { key: '8', ctrl: true, description: t('navigation.shortcuts.categories'), action: () => onViewChange('categories') },
    { key: '9', ctrl: true, description: t('navigation.shortcuts.settings'), action: () => onViewChange('settings') },
    { key: '[', ctrl: true, description: t('navigation.shortcuts.toggleSidebar'), action: () => setIsCollapsed(!isCollapsed) },
  ]);

  // Save collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  const menuItems: Array<{ id: 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'activitylog' | 'goals' | 'focus' | 'categories' | 'settings'; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: LayoutDashboard },
    { id: 'tracker', label: t('navigation.tracker'), icon: Timer },
    { id: 'reports', label: t('navigation.reports'), icon: BarChart3 },
    { id: 'analytics', label: t('navigation.analytics'), icon: TrendingUp },
    { id: 'activitylog', label: t('navigation.activityLog'), icon: List },
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
    <aside
      className={`
        ${isCollapsed ? 'w-20' : 'w-64'}
        bg-white dark:bg-gray-800 h-full border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        flex flex-col
      `}
      role="navigation"
      aria-label={t('navigation.mainNavigation', 'Main navigation')}
    >
      <div className={`flex-1 ${isCollapsed ? 'px-3 py-6' : 'p-6'}`}>
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
        <nav className={`space-y-2.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`} aria-label={t('navigation.primaryNavigation', 'Primary navigation')}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const shortcutKey = index + 1;
            const isMac = navigator.platform.includes('Mac');

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={isCollapsed ? `${item.label} (${isMac ? 'Cmd' : 'Ctrl'}+${shortcutKey})` : undefined}
                aria-label={`${item.label} (${isMac ? 'Cmd' : 'Ctrl'}+${shortcutKey})`}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group flex items-center text-left
                  ${isCollapsed ? 'w-12 h-12 justify-center rounded-full' : 'w-full gap-3 px-3.5 py-2.5 rounded-xl'}
                  transition-all duration-300 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    ${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}
                    flex-shrink-0
                    transition-all duration-300 ease-in-out
                    group-hover:scale-110
                    ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}
                  `}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toggle Button */}
      <div className={`${isCollapsed ? 'px-3 py-4' : 'p-4'} border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
          aria-label={isCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
          aria-expanded={!isCollapsed}
          className="
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            hover:bg-gray-100 dark:hover:bg-gray-700/50
            text-gray-600 dark:text-gray-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          "
        >
          <ChevronIcon
            className={`
              ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'}
              flex-shrink-0
              transition-all duration-300 ease-in-out
            `}
            aria-hidden="true"
          />
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">
              {t('navigation.collapseSidebar')}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;