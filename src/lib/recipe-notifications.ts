// lib/recipe-notifications.ts
// Recipe-specific notification utilities

'use client';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  badge?: string;
}

let permissionRequested = false;

/**
 * Request notification permission once per session
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  if (!permissionRequested) {
    permissionRequested = true;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }

  return false;
}

/**
 * Show a browser notification for recipe timers
 */
export async function showNotification(options: NotificationOptions): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    console.log('Notification (no permission):', options.title, options.body);
    return;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192x192.png',
      tag: options.tag || 'recipe-timer',
      badge: options.badge || '/icon-192x192.png',
      requireInteraction: false,
      silent: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click events
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

  } catch (error) {
    console.warn('Failed to show notification:', error);
    console.log('Notification fallback:', options.title, options.body);
  }
}

/**
 * Play a short beep sound for timer completion
 */
export function playTimerBeep(): void {
  if (typeof window === 'undefined') return;

  try {
    // Create audio context with fallback
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Failed to play timer beep:', error);
  }
}
