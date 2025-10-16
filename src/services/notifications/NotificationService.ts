import { Notification } from 'electron';
import { logger } from '../logging/Logger';

export type NotificationType = 'sessionComplete' | 'breakComplete' | 'timeToFocus';

export interface NotificationConfig {
  title: string;
  body: string;
  silent?: boolean;
}

export class NotificationService {
  private soundEnabled: boolean;
  private notificationsEnabled: boolean = true;

  constructor(soundEnabled = true, notificationsEnabled = true) {
    this.soundEnabled = soundEnabled;
    this.notificationsEnabled = notificationsEnabled;
  }

  /**
   * Show a desktop notification
   */
  showNotification(_type: NotificationType, config: NotificationConfig): void {
    if (!this.notificationsEnabled) {
      return;
    }

    try {
      const notification = new Notification({
        title: config.title,
        body: config.body,
        silent: config.silent !== undefined ? config.silent : !this.soundEnabled,
        urgency: 'normal',
      });

      notification.show();
    } catch (error) {
      logger.error('Failed to show notification', {
        type: _type,
        title: config.title,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Notify when a focus session is complete
   */
  notifyFocusComplete(task: string): void {
    this.showNotification('sessionComplete', {
      title: '🎯 Focus Session Complete!',
      body: `Great work on "${task}"! Time for a break.`,
    });
  }

  /**
   * Notify when a break is complete
   */
  notifyBreakComplete(): void {
    this.showNotification('breakComplete', {
      title: '⏰ Break Time Over',
      body: 'Ready to focus again? Start your next session.',
    });
  }

  /**
   * Notify user to get back to focus
   */
  notifyTimeToFocus(task: string): void {
    this.showNotification('timeToFocus', {
      title: '🎯 Time to Focus',
      body: `Let's get back to work on "${task}"`,
    });
  }

  /**
   * Update notification settings
   */
  updateSettings(soundEnabled: boolean, notificationsEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.notificationsEnabled = notificationsEnabled;
  }

  /**
   * Enable/disable sound
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Enable/disable notifications
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }
}
