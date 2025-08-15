'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Reminder {
  id: string;
  title: string;
  description: string;
  reminderTime: Date;
  isRead: boolean;
  isCompleted: boolean;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const remindersCollection = collection(db, 'reminders');
    
    const unsubscribe = onSnapshot(remindersCollection, (snapshot) => {
      const remindersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reminderTime: doc.data().reminderTime?.toDate(),
      })) as Reminder[];

      // Filter for upcoming and overdue reminders
      const now = new Date();
      const relevantReminders = remindersData.filter(reminder => {
        if (reminder.isCompleted) return false;
        
        const timeDiff = reminder.reminderTime.getTime() - now.getTime();
        const isOverdue = timeDiff < 0;
        const isUpcoming = timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
        
        return isOverdue || isUpcoming;
      }).sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());

      setReminders(relevantReminders);
      setUnreadCount(relevantReminders.filter(r => !r.isRead).length);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (reminderId: string) => {
    try {
      await updateDoc(doc(db, 'reminders', reminderId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadReminders = reminders.filter(r => !r.isRead);
      await Promise.all(
        unreadReminders.map(reminder =>
          updateDoc(doc(db, 'reminders', reminder.id), { isRead: true })
        )
      );
    } catch (error) {
      console.error('Error marking all reminders as read:', error);
    }
  };

  const formatDateTime = (date: Date) => {
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    
    if (timeDiff < 0) {
      const minutesAgo = Math.abs(Math.floor(timeDiff / (1000 * 60)));
      if (minutesAgo < 60) return `${minutesAgo}m ago`;
      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo < 24) return `${hoursAgo}h ago`;
      const daysAgo = Math.floor(hoursAgo / 24);
      return `${daysAgo}d ago`;
    } else {
      const minutesLeft = Math.floor(timeDiff / (1000 * 60));
      if (minutesLeft < 60) return `in ${minutesLeft}m`;
      const hoursLeft = Math.floor(minutesLeft / 60);
      if (hoursLeft < 24) return `in ${hoursLeft}h`;
      const daysLeft = Math.floor(hoursLeft / 24);
      return `in ${daysLeft}d`;
    }
  };

  const isOverdue = (reminderTime: Date) => {
    return new Date() > reminderTime;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h-5v11z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {reminders.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No upcoming reminders
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                        !reminder.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => {
                        if (!reminder.isRead) {
                          markAsRead(reminder.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          !reminder.isRead ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {reminder.title}
                          </p>
                          {reminder.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isOverdue(reminder.reminderTime)
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {isOverdue(reminder.reminderTime) ? 'Overdue' : 'Upcoming'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(reminder.reminderTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <a
                href="/reminders"
                className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                onClick={() => setShowDropdown(false)}
              >
                View all reminders
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
