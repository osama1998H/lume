import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Timer, BarChart3, Activity, Target, Coffee, FolderOpen, Settings, TrendingUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '../hooks/useLanguage';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from './ui/sidebar';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'tracker' | 'reports' | 'analytics' | 'timeline' | 'goals' | 'focus' | 'categories' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

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

  return (
    <SidebarPrimitive collapsible="icon" side={isRTL ? "right" : "left"}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:!p-0">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <Timer className="size-4" />
              </div>
              <div className={cn(
                "grid flex-1 text-sm leading-tight",
                isRTL ? "text-right" : "text-left"
              )}>
                <span className="truncate font-semibold">{t('app.name')}</span>
                <span className="truncate text-xs text-muted-foreground">{t('app.tagline')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => onViewChange(item.id)}
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    isActive && 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarTrigger className="w-full" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarPrimitive>
  );
};

export default Sidebar;