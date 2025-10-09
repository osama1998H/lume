import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme, Theme } from '../contexts/ThemeContext';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';
import { ConfirmModal } from './ui/Modal';
import { showToast } from '../utils/toast';
import type { Category } from '../types';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { theme, changeTheme } = useTheme();
  const [settings, setSettings] = useState({
    showNotifications: true,
    minimizeToTray: false,
    autoStartOnLogin: false,
    autoStartTracking: false,
    defaultCategory: null as number | null,
    activityTracking: {
      enabled: false,
      trackingInterval: 30,
      idleThreshold: 300,
      trackBrowsers: true,
      trackApplications: true,
      blacklistedApps: [],
      blacklistedDomains: [],
      dataRetentionDays: 90
    }
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTrackingStatus();
    loadCategories();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI) {
        const savedSettings = await window.electronAPI.getSettings();
        if (savedSettings) {
          setSettings(prev => ({
            ...prev,
            ...savedSettings,
            activityTracking: savedSettings.activityTracking || prev.activityTracking
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrackingStatus = async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.getActivityTrackingStatus();
        setIsTracking(status);
      }
    } catch (error) {
      console.error('Failed to load tracking status:', error);
    }
  };

  const loadCategories = async () => {
    try {
      if (window.electronAPI) {
        const fetchedCategories = await window.electronAPI.getCategories();
        setCategories(fetchedCategories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSettingChange = (key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleActivityTrackingChange = (key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      activityTracking: {
        ...prev.activityTracking,
        [key]: value,
      }
    }));
  };

  const toggleActivityTracking = async () => {
    try {
      if (window.electronAPI) {
        const newTrackingState = !isTracking;
        let apiSuccess = false;

        // First, try to start/stop tracking via API
        if (newTrackingState) {
          apiSuccess = await window.electronAPI.startActivityTracking();
        } else {
          apiSuccess = await window.electronAPI.stopActivityTracking();
        }

        // Only update state if API call succeeded
        if (!apiSuccess) {
          console.error('❌ Failed to toggle tracking state');
          return;
        }

        // Update and save the enabled state in settings
        const updatedSettings = {
          ...settings,
          activityTracking: {
            ...settings.activityTracking,
            enabled: newTrackingState
          }
        };

        const saveSuccess = await window.electronAPI.saveSettings(updatedSettings);

        if (saveSuccess) {
          // Only update UI state after both API and save succeed
          setIsTracking(newTrackingState);
          setSettings(updatedSettings);
          console.log(`✅ Activity tracking ${newTrackingState ? 'enabled' : 'disabled'} and saved to settings`);
        } else {
          console.error('❌ Failed to save tracking state to settings');
          // Rollback the tracking state since save failed
          if (newTrackingState) {
            await window.electronAPI.stopActivityTracking();
          } else {
            await window.electronAPI.startActivityTracking();
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to toggle activity tracking:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      if (window.electronAPI) {
        const success = await window.electronAPI.saveSettings(settings);
        if (success) {
          showToast.success(t('settings.settingsSavedSuccess'));
        } else {
          showToast.error(t('settings.settingsSaveFailed'));
        }
      } else {
        showToast.error(t('settings.settingsFunctionalityUnavailable'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast.error(t('settings.settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = () => {
    console.log('Exporting data...');
  };

  const importData = () => {
    console.log('Importing data...');
  };

  const clearAllData = () => {
    setShowClearDataConfirm(true);
  };

  const confirmClearData = async () => {
    try {
      if (!window.electronAPI) {
        showToast.error(t('settings.functionalityUnavailable'));
        return;
      }

      // Prevent clearing while activity tracking is active
      const isTracking = await window.electronAPI.getActivityTrackingStatus();
      if (isTracking) {
        showToast.error(t('settings.stopTrackingBeforeClear'));
        return;
      }

      // Prevent clearing while a Pomodoro session is running
      const pomodoroStatus = await window.electronAPI.getPomodoroStatus();
      if (pomodoroStatus && pomodoroStatus.state !== 'idle') {
        showToast.error(t('settings.stopPomodoroBeforeClear'));
        return;
      }

      const success = await window.electronAPI.clearAllData();

      if (success) {
        showToast.success(t('settings.clearDataSuccess'));
        setShowClearDataConfirm(false);

        // Reload the app after 1.5 seconds to refresh all UI components with empty data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast.error(t('settings.clearDataFailed'));
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      showToast.error(t('settings.clearDataFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 lg:mb-8">
            <Skeleton width="200px" height="32px" />
            <Skeleton width="300px" height="20px" className="mt-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <Skeleton variant="rectangular" height="400px" />
            <Skeleton variant="rectangular" height="500px" />
            <Skeleton variant="rectangular" height="300px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 lg:mb-8 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('settings.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('settings.configurePreferences')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-20">
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.general')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.language')}</label>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="en" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('settings.english')}</option>
                <option value="ar" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('settings.arabic')}</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.selectLanguage')}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.theme')}</label>
              <select
                value={theme}
                onChange={(e) => changeTheme(e.target.value as Theme)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="light" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('settings.lightMode')}</option>
                <option value="dark" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('settings.darkMode')}</option>
                <option value="system" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('settings.systemMode')}</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.selectTheme')}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">{t('settings.showNotifications')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.showNotificationsDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => handleSettingChange('showNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">{t('settings.minimizeToTray')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.minimizeToTrayDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray}
                  onChange={(e) => handleSettingChange('minimizeToTray', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">{t('settings.autoStartOnLogin')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.autoStartOnLoginDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStartOnLogin}
                  onChange={(e) => handleSettingChange('autoStartOnLogin', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.defaultCategory')}</label>
              <select
                value={settings.defaultCategory || ''}
                onChange={(e) => handleSettingChange('defaultCategory', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {t('settings.defaultCategoryPlaceholder')}
                </option>
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.defaultCategoryDesc')}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.activityTracking')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">{t('settings.trackBrowserActivity')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.trackBrowserActivityDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activityTracking.trackBrowsers}
                  onChange={(e) => handleActivityTrackingChange('trackBrowsers', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">{t('settings.trackApplicationActivity')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.trackApplicationActivityDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activityTracking.trackApplications}
                  onChange={(e) => handleActivityTrackingChange('trackApplications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('settings.activityTrackingInterval')}: {settings.activityTracking.trackingInterval}
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={settings.activityTracking.trackingInterval}
                onChange={(e) => handleActivityTrackingChange('trackingInterval', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.activityTrackingIntervalDesc')}</p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('settings.idleThreshold')}: {Math.floor(settings.activityTracking.idleThreshold / 60)}
              </label>
              <input
                type="range"
                min="60"
                max="1800"
                step="60"
                value={settings.activityTracking.idleThreshold}
                onChange={(e) => handleActivityTrackingChange('idleThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.idleThresholdDesc')}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.activityTrackingStatus')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.currentStatus')} <span className={`font-medium ${isTracking ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isTracking ? t('settings.active') : t('settings.stopped')}
                  </span>
                </p>
              </div>
              <Button
                onClick={toggleActivityTracking}
                variant={isTracking ? 'danger' : 'primary'}
              >
                {isTracking ? t('settings.stopTracking') : t('settings.startTracking')}
              </Button>
            </div>
          </div>
        </div>

          {/* Column 3: Data Management + About */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.dataManagement')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.exportData')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.exportDataDesc')}</p>
                  </div>
                  <Button
                    onClick={exportData}
                    variant="secondary"
                    icon={Download}
                  >
                    {t('settings.export')}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.importData')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.importDataDesc')}</p>
                  </div>
                  <Button
                    onClick={importData}
                    variant="secondary"
                    icon={Upload}
                  >
                    {t('settings.import')}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.clearAllData')}</h4>
                    <p className="text-sm text-red-600 dark:text-red-400">{t('settings.clearAllDataDesc')}</p>
                  </div>
                  <Button
                    onClick={clearAllData}
                    variant="danger"
                    icon={Trash2}
                  >
                    {t('settings.clearDataButton')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.about')}</h3>
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-gray-100"><strong>{t('settings.appVersion')}</strong></p>
                <p className="text-gray-600 dark:text-gray-400">{t('settings.appDescription')}</p>
                <p className="text-gray-600 dark:text-gray-400">{t('settings.builtWith')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Save Button */}
        <div className="fixed-save-button p-4 sm:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:bg-transparent md:border-0">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            variant="primary"
            loading={isSaving}
            size="lg"
            className="w-full md:w-auto"
          >
            {t('settings.saveSettings')}
          </Button>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearDataConfirm}
        onClose={() => setShowClearDataConfirm(false)}
        onConfirm={confirmClearData}
        title={t('settings.clearAllData')}
        message={t('settings.confirmClearData')}
        confirmText={t('settings.clearDataButton')}
        variant="danger"
      />
    </div>
  );
};

export default Settings;