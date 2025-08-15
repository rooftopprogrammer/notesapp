'use client';

import { useState, useEffect } from 'react';

interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: false
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission({
        permission: Notification.permission,
        supported: true
      });
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const result = await Notification.requestPermission();
    setPermission({
      permission: result,
      supported: true
    });
    return result;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        ...options
      });
    }
    return null;
  };

  return {
    permission: permission.permission,
    supported: permission.supported,
    requestPermission,
    showNotification
  };
};

export const scheduleNotification = (
  title: string, 
  time: Date, 
  options?: NotificationOptions
) => {
  const now = new Date().getTime();
  const scheduledTime = time.getTime();
  const delay = scheduledTime - now;

  if (delay > 0) {
    return setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: `reminder-${Date.now()}`,
          ...options
        });
      }
    }, delay);
  }

  return null;
};

export const scheduleReminderNotifications = (
  title: string,
  description: string,
  reminderTime: Date
) => {
  const notifications = [];
  
  // 15 minutes before notification
  const fifteenMinutesBefore = new Date(reminderTime.getTime() - 15 * 60 * 1000);
  if (fifteenMinutesBefore > new Date()) {
    const timeoutId1 = scheduleNotification(
      `Reminder in 15 minutes: ${title}`,
      fifteenMinutesBefore,
      {
        body: description,
        tag: `reminder-15-${reminderTime.getTime()}`,
      }
    );
    if (timeoutId1) notifications.push(timeoutId1);
  }

  // At reminder time notification
  if (reminderTime > new Date()) {
    const timeoutId2 = scheduleNotification(
      `⏰ ${title}`,
      reminderTime,
      {
        body: description,
        tag: `reminder-now-${reminderTime.getTime()}`,
        requireInteraction: true
      }
    );
    if (timeoutId2) notifications.push(timeoutId2);
  }

  return notifications;
};
