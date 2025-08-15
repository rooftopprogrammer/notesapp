'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotifications, scheduleReminderNotifications } from '@/lib/notifications';

interface Reminder {
  id: string;
  title: string;
  description: string;
  reminderTime: Date;
  isRead: boolean;
  isCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminderTime: ''
  });

  const { permission, requestPermission } = useNotifications();

  // Request notification permission on component mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission().catch(console.error);
    }
  }, [permission, requestPermission]);

  // Load reminders from Firestore on component mount
  useEffect(() => {
    const remindersCollection = collection(db, 'reminders');
    
    const unsubscribe = onSnapshot(remindersCollection, (snapshot) => {
      const remindersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reminderTime: doc.data().reminderTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Reminder[];
      
      setReminders(remindersData.sort((a, b) => {
        if (a.reminderTime && b.reminderTime) {
          return a.reminderTime.getTime() - b.reminderTime.getTime();
        }
        return 0;
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching reminders:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setEditingReminder(null);
    setFormData({ title: '', description: '', reminderTime: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({ 
      title: reminder.title, 
      description: reminder.description,
      reminderTime: reminder.reminderTime.toISOString().slice(0, 16)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      try {
        setDeleting(id);
        await deleteDoc(doc(db, 'reminders', id));
      } catch (error) {
        console.error('Error deleting reminder:', error);
        alert('Error deleting reminder. Please try again.');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleComplete = async (id: string, isCompleted: boolean) => {
    try {
      setUpdating(id);
      await updateDoc(doc(db, 'reminders', id), {
        isCompleted: !isCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('Error updating reminder. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.reminderTime) {
      alert('Please fill in title and reminder time');
      return;
    }

    try {
      setSaving(true);
      const reminderTimeDate = new Date(formData.reminderTime);
      
      if (editingReminder) {
        // Edit existing reminder
        await updateDoc(doc(db, 'reminders', editingReminder.id), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          reminderTime: Timestamp.fromDate(reminderTimeDate),
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new reminder
        const remindersCollection = collection(db, 'reminders');
        await addDoc(remindersCollection, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          reminderTime: Timestamp.fromDate(reminderTimeDate),
          isRead: false,
          isCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Schedule notifications for the reminder
      if (permission === 'granted') {
        scheduleReminderNotifications(
          formData.title.trim(),
          formData.description.trim(),
          reminderTimeDate
        );
      }

      setIsModalOpen(false);
      setFormData({ title: '', description: '', reminderTime: '' });
      setEditingReminder(null);
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Error saving reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ title: '', description: '', reminderTime: '' });
    setEditingReminder(null);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isOverdue = (reminderTime: Date) => {
    return new Date() > reminderTime;
  };

  const isUpcoming = (reminderTime: Date) => {
    const now = new Date();
    const timeDiff = reminderTime.getTime() - now.getTime();
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Reminders
            </h1>
          </div>
          
          <div className="flex gap-2">
            {permission !== 'granted' && (
              <button
                onClick={() => requestPermission()}
                className="inline-flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors gap-2"
                title="Enable notifications"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h-5v11z" />
                </svg>
                Enable Notifications
              </button>
            )}
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Reminder
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading reminders...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Database Connection Error</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            </div>
          ) : (
            <>
              {/* Reminders List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {reminders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No reminders found. Click &quot;Add Reminder&quot; to get started.
                  </div>
                ) : (
                  reminders.map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        reminder.isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => handleComplete(reminder.id, reminder.isCompleted)}
                              disabled={updating === reminder.id}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                reminder.isCompleted
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-green-400'
                              } ${updating === reminder.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {updating === reminder.id ? (
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : reminder.isCompleted ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : null}
                            </button>
                            <h3 className={`text-lg font-medium ${
                              reminder.isCompleted 
                                ? 'line-through text-gray-500 dark:text-gray-400' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {reminder.title}
                            </h3>
                            {isOverdue(reminder.reminderTime) && !reminder.isCompleted && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                Overdue
                              </span>
                            )}
                            {isUpcoming(reminder.reminderTime) && !reminder.isCompleted && (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                Upcoming
                              </span>
                            )}
                          </div>
                          {reminder.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-2">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDateTime(reminder.reminderTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(reminder)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {editingReminder ? 'Edit Reminder' : 'Add New Reminder'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter reminder title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter reminder description (optional)"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="reminderTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reminder Time *
                </label>
                <input
                  type="datetime-local"
                  id="reminderTime"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {saving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {editingReminder ? 'Update' : 'Add'} Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
