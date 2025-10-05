import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    autoTrackApps: true,
    showNotifications: true,
    minimizeToTray: false,
    autoStartTracking: false,
    defaultCategory: '',
    trackingInterval: 30,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTrackingStatus();
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

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleActivityTrackingChange = (key: string, value: any) => {
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
      setSaveMessage('');

      if (window.electronAPI) {
        const success = await window.electronAPI.saveSettings(settings);
        if (success) {
          setSaveMessage('Settings saved successfully!');
          setTimeout(() => setSaveMessage(''), 3000);
        } else {
          setSaveMessage('Failed to save settings. Please try again.');
        }
      } else {
        setSaveMessage('Settings functionality not available.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
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
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      console.log('Clearing all data...');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Configure your Lume preferences and data management.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('settings.general')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">{t('settings.language')}</label>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="en">{t('settings.english')}</option>
                <option value="ar">{t('settings.arabic')}</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">{t('settings.selectLanguage')}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Auto-track Applications</label>
                <p className="text-sm text-gray-600">Automatically track time spent in different applications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoTrackApps}
                  onChange={(e) => handleSettingChange('autoTrackApps', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Show Notifications</label>
                <p className="text-sm text-gray-600">Get notified about tracking milestones and reminders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => handleSettingChange('showNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Minimize to Tray</label>
                <p className="text-sm text-gray-600">Keep the app running in the system tray when closed</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray}
                  onChange={(e) => handleSettingChange('minimizeToTray', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">Default Category</label>
              <input
                type="text"
                value={settings.defaultCategory}
                onChange={(e) => handleSettingChange('defaultCategory', e.target.value)}
                placeholder="e.g., Work, Personal, Study"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-sm text-gray-600 mt-1">Default category for new time entries</p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Tracking Interval (seconds): {settings.trackingInterval}
              </label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={settings.trackingInterval}
                onChange={(e) => handleSettingChange('trackingInterval', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-sm text-gray-600 mt-1">How often to update activity tracking</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Activity Tracking</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Enable Activity Tracking</label>
                <p className="text-sm text-gray-600">Automatically track time spent in applications and websites</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activityTracking.enabled}
                  onChange={(e) => handleActivityTrackingChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Track Browser Activity</label>
                <p className="text-sm text-gray-600">Monitor websites and domains visited</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activityTracking.trackBrowsers}
                  onChange={(e) => handleActivityTrackingChange('trackBrowsers', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Track Application Activity</label>
                <p className="text-sm text-gray-600">Monitor desktop applications and software</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activityTracking.trackApplications}
                  onChange={(e) => handleActivityTrackingChange('trackApplications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Activity Tracking Interval (seconds): {settings.activityTracking.trackingInterval}
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={settings.activityTracking.trackingInterval}
                onChange={(e) => handleActivityTrackingChange('trackingInterval', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-sm text-gray-600 mt-1">How often to check for activity changes</p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Idle Threshold (minutes): {Math.floor(settings.activityTracking.idleThreshold / 60)}
              </label>
              <input
                type="range"
                min="60"
                max="1800"
                step="60"
                value={settings.activityTracking.idleThreshold}
                onChange={(e) => handleActivityTrackingChange('idleThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-sm text-gray-600 mt-1">How long before considering user idle</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Activity Tracking Status</h4>
                <p className="text-sm text-gray-600">
                  Current status: <span className={`font-medium ${isTracking ? 'text-green-600' : 'text-red-600'}`}>
                    {isTracking ? 'Active' : 'Stopped'}
                  </span>
                </p>
              </div>
              <button
                onClick={toggleActivityTracking}
                className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isTracking
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
                }`}
              >
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Data Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Export Data</h4>
                <p className="text-sm text-gray-600">Download your time tracking data as CSV</p>
              </div>
              <button
                onClick={exportData}
                className="btn-secondary"
              >
                Export
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Import Data</h4>
                <p className="text-sm text-gray-600">Import time tracking data from CSV file</p>
              </div>
              <button
                onClick={importData}
                className="btn-secondary"
              >
                Import
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Clear All Data</h4>
                <p className="text-sm text-gray-600 text-red-600">Permanently delete all time tracking data</p>
              </div>
              <button
                onClick={clearAllData}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">About</h3>
          <div className="space-y-2">
            <p className="text-gray-900"><strong>Lume</strong> v1.0.0</p>
            <p className="text-gray-600">A desktop application for tracking and visualizing time spent on tasks and applications.</p>
            <p className="text-gray-600">Built with Electron, React, and Tailwind CSS.</p>
          </div>
        </div>

        <div className="flex justify-end items-center space-x-4">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className={`btn-primary ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;