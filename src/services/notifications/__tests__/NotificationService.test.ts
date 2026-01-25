import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Track mock instances for testing
let mockNotificationInstances: any[] = [];
const mockShow = mock(() => {});

// Mock Electron's Notification
mock.module('electron', () => ({
  Notification: function(this: any, options: any) {
    this.title = options.title;
    this.body = options.body;
    this.silent = options.silent;
    this.show = mockShow;
    mockNotificationInstances.push(this);
    return this;
  },
}));

import { NotificationService } from '../NotificationService';
import { Notification } from 'electron';

describe('NotificationService', () => {
  let service: NotificationService;
  let consoleLog: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockNotificationInstances = [];
    consoleLog = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with sound enabled', () => {
      service = new NotificationService(true, true);
      expect(service).toBeDefined();
    });

    it('should initialize with sound disabled', () => {
      service = new NotificationService(false, true);
      expect(service).toBeDefined();
    });

    it('should initialize with notifications disabled', () => {
      service = new NotificationService(true, false);
      expect(service).toBeDefined();
    });

    it('should initialize with default settings (both enabled)', () => {
      service = new NotificationService();
      expect(service).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update sound and notification settings', () => {
      service = new NotificationService(true, true);
      service.updateSettings(false, false);

      // Test by showing notification - should be silent and not show
      service.notifyFocusComplete('Test Task');

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Notification settings updated')
      );
    });

    it('should log settings update', () => {
      service = new NotificationService(true, true);
      service.updateSettings(false, true);

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Notification settings updated')
      );
    });
  });

  describe('notifyFocusComplete', () => {
    it('should show notification when notifications are enabled', () => {
      service = new NotificationService(true, true);
      service.notifyFocusComplete('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Focus Session Complete'),
          body: expect.stringContaining('Test Task'),
        })
      );
    });

    it('should include task name in notification body', () => {
      service = new NotificationService(true, true);
      service.notifyFocusComplete('Important Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Important Task'),
        })
      );
    });

    it('should not be silent when sound is enabled', () => {
      service = new NotificationService(true, true);
      service.notifyFocusComplete('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: false,
        })
      );
    });

    it('should be silent when sound is disabled', () => {
      service = new NotificationService(false, true);
      service.notifyFocusComplete('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
        })
      );
    });

    it('should not show notification when notifications are disabled', () => {
      service = new NotificationService(true, false);
      service.notifyFocusComplete('Test Task');

      expect(Notification).not.toHaveBeenCalled();
    });

    it('should call show() on notification', () => {
      service = new NotificationService(true, true);
      service.notifyFocusComplete('Test Task');

      const mockNotification = mockNotificationInstances[0]!;
      expect(mockNotification.show).toHaveBeenCalled();
    });
  });

  describe('notifyBreakComplete', () => {
    it('should show notification when notifications are enabled', () => {
      service = new NotificationService(true, true);
      service.notifyBreakComplete();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Break Time Over'),
        })
      );
    });

    it('should not be silent when sound is enabled', () => {
      service = new NotificationService(true, true);
      service.notifyBreakComplete();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: false,
        })
      );
    });

    it('should be silent when sound is disabled', () => {
      service = new NotificationService(false, true);
      service.notifyBreakComplete();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
        })
      );
    });

    it('should not show notification when notifications are disabled', () => {
      service = new NotificationService(true, false);
      service.notifyBreakComplete();

      expect(Notification).not.toHaveBeenCalled();
    });
  });

  describe('notifyTimeToFocus', () => {
    it('should show notification when notifications are enabled', () => {
      service = new NotificationService(true, true);
      service.notifyTimeToFocus('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Time to Focus'),
        })
      );
    });

    it('should not be silent when sound is enabled', () => {
      service = new NotificationService(true, true);
      service.notifyTimeToFocus('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: false,
        })
      );
    });

    it('should be silent when sound is disabled', () => {
      service = new NotificationService(false, true);
      service.notifyTimeToFocus('Test Task');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
        })
      );
    });

    it('should not show notification when notifications are disabled', () => {
      service = new NotificationService(true, false);
      service.notifyTimeToFocus('Test Task');

      expect(Notification).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle notification errors gracefully', () => {
      const consoleError = spyOn(console, 'error').mockImplementation(() => {});
      // Override the mock to throw an error
      const originalNotification = Notification;
      (Notification as any) = function() {
        throw new Error('Notification failed');
      };

      service = new NotificationService(true, true);
      service.notifyFocusComplete('Test Task');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show notification'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Multiple notifications', () => {
    it('should be able to show multiple notifications in sequence', () => {
      service = new NotificationService(true, true);

      service.notifyFocusComplete('Task 1');
      service.notifyBreakComplete();
      service.notifyTimeToFocus('Task 2');

      expect(Notification).toHaveBeenCalledTimes(3);
    });

    it('should respect settings changes between notifications', () => {
      service = new NotificationService(true, true);

      service.notifyFocusComplete('Task 1');
      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({ silent: false })
      );

      service.updateSettings(false, true);

      service.notifyBreakComplete();
      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({ silent: true })
      );
    });
  });
});
