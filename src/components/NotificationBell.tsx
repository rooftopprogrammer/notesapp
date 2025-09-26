'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminderTime: any;
  isRead: boolean;
  createdAt: any;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <>
      <style jsx>{`
        @keyframes notification-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .notification-pulse {
          animation: notification-pulse 2s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      <div className={`relative z-[10000] ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className="group relative z-[10001] p-3 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
          title="Notifications"
        >
          <svg className="w-6 h-6 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h-5v11z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
          </svg>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg notification-pulse border-2 border-white/20">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && mounted && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998] backdrop-blur-sm bg-black/20" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Ultra-Modern Dropdown */}
            <div 
              className="fixed w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl z-[9999] animate-fade-in-up overflow-hidden"
              style={{
                top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 12 : '5rem',
                right: buttonRef.current ? 
                  Math.max(8, window.innerWidth - buttonRef.current.getBoundingClientRect().right) : '2rem'
              }}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h-5v11z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white rounded-full border border-blue-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-4 py-2 text-sm font-medium text-blue-300 hover:text-blue-200 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              
              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {reminders.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-500/20 to-gray-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-white/70 text-lg font-medium mb-2">All caught up!</p>
                    <p className="text-white/50 text-sm">No upcoming reminders at the moment.</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {reminders.map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className={`group relative m-2 p-4 rounded-2xl transition-all duration-300 cursor-pointer transform hover:scale-102 ${
                          !reminder.isRead 
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 hover:border-blue-400/50' 
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                        onClick={() => {
                          if (!reminder.isRead) {
                            markAsRead(reminder.id);
                          }
                        }}
                      >
                        {/* Notification Icon */}
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            !reminder.isRead 
                              ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 group-hover:from-blue-500/40 group-hover:to-purple-500/40' 
                              : 'bg-white/10 group-hover:bg-white/20'
                          }`}>
                            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white font-semibold truncate pr-2 group-hover:text-blue-200 transition-colors">
                                {reminder.title}
                              </p>
                              {!reminder.isRead && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 notification-pulse" />
                              )}
                            </div>
                            
                            {reminder.description && (
                              <p className="text-white/80 text-sm mb-3 line-clamp-2 leading-relaxed">
                                {reminder.description}
                              </p>
                            )}
                            
                            {/* Status and Time */}
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                                isOverdue(reminder.reminderTime)
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              }`}>
                                {isOverdue(reminder.reminderTime) ? (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Overdue
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Upcoming
                                  </>
                                )}
                              </span>
                              <span className="text-xs text-white/60 font-medium">
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
              
              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <a
                  href="/reminders"
                  className="block w-full text-center py-3 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 font-medium rounded-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => setShowDropdown(false)}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View all reminders
                  </span>
                </a>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  );
}
