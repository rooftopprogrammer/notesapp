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
import { db, isFirebaseAvailable } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';
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
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    reminderId: string;
    reminderTitle: string;
  }>({
    isOpen: false,
    reminderId: '',
    reminderTitle: ''
  });
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
    if (!isFirebaseAvailable()) {
      setError('Firebase is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

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

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      reminderId: id,
      reminderTitle: title
    });
  };

  const confirmDelete = async () => {
    if (!isFirebaseAvailable()) return;
    
    try {
      await deleteDoc(doc(db, 'reminders', confirmDialog.reminderId));
      setConfirmDialog({ isOpen: false, reminderId: '', reminderTitle: '' });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Error deleting reminder. Please try again.');
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, reminderId: '', reminderTitle: '' });
  };

  const handleComplete = async (id: string, isCompleted: boolean) => {
    if (!isFirebaseAvailable()) return;
    
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
    
    if (!isFirebaseAvailable()) return;
    
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
    <>
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900 animate-gradient-x" />
        
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float animation-delay-200" />
          <div className="absolute bottom-20 left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-float animation-delay-400" />
        </div>
        
        <div className="relative z-10 min-h-screen">
          {/* Glassmorphism Header */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
                <div className="flex items-center gap-6 mb-4 sm:mb-0">
                  <Link
                    href="/"
                    className="group relative overflow-hidden inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 animate-pulse-glow"
                    title="Home"
                  >
                    <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-teal-100 bg-clip-text text-transparent">
                      Smart Reminders
                    </h1>
                    <p className="text-white/60 mt-1">Never miss what matters most</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {permission !== 'granted' && (
                    <button
                      onClick={() => requestPermission()}
                      className="group relative overflow-hidden inline-flex items-center px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-medium rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 gap-3"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h-5v11z" />
                      </svg>
                      Enable Notifications
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  <button
                    onClick={handleAdd}
                    className="group relative overflow-hidden inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 gap-3"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reminder
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-white/20 rounded-full animate-spin border-t-emerald-400"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-teal-400"></div>
                </div>
                <p className="text-white/80 text-lg mt-6 font-medium">Loading your reminders...</p>
              </div>
            ) : error ? (
              <div className="animate-fade-in-up">
                <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-3xl p-12 text-center shadow-2xl">
                  <div className="text-red-400 mb-6">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 19c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Database Connection Error</h3>
                  <p className="text-white/80 mb-8 text-lg">{error}</p>
                </div>
              </div>
            ) : (
              <>
                {reminders.length === 0 ? (
                  <div className="text-center py-20 animate-fade-in-up">
                    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-16 shadow-2xl">
                      <div className="w-24 h-24 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">No Reminders Yet</h3>
                      <p className="text-white/70 text-lg mb-8">Create your first reminder to get started with smart notifications.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reminders.map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className={`group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:border-white/20 animate-fade-in-up animation-delay-${Math.min(index * 100, 400)} ${
                          reminder.isCompleted ? 'opacity-70' : ''
                        }`}
                      >
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                          {isOverdue(reminder.reminderTime) && !reminder.isCompleted && (
                            <span className="px-3 py-1 text-xs font-bold bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                              Overdue
                            </span>
                          )}
                          {isUpcoming(reminder.reminderTime) && !reminder.isCompleted && (
                            <span className="px-3 py-1 text-xs font-bold bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30 animate-pulse">
                              Upcoming
                            </span>
                          )}
                          {reminder.isCompleted && (
                            <span className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                              Completed
                            </span>
                          )}
                        </div>
                        
                        {/* Completion Button */}
                        <button
                          onClick={() => handleComplete(reminder.id, reminder.isCompleted)}
                          disabled={updating === reminder.id}
                          className={`w-12 h-12 rounded-full border-3 flex items-center justify-center mb-6 transition-all duration-300 ${
                            reminder.isCompleted
                              ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/40'
                              : 'border-white/30 hover:border-emerald-400/50 hover:bg-emerald-500/10'
                          } ${updating === reminder.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                        >
                          {updating === reminder.id ? (
                            <div className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                          ) : reminder.isCompleted ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-white/40 group-hover:bg-emerald-400 transition-colors"></div>
                          )}
                        </button>
                        
                        {/* Reminder Content */}
                        <h3 className={`text-xl font-bold mb-3 transition-colors ${
                          reminder.isCompleted 
                            ? 'line-through text-white/50' 
                            : 'text-white group-hover:text-emerald-200'
                        }`}>
                          {reminder.title}
                        </h3>
                        
                        {reminder.description && (
                          <p className={`text-sm leading-relaxed mb-4 ${
                            reminder.isCompleted 
                              ? 'text-white/40 line-through' 
                              : 'text-white/80'
                          }`}>
                            {reminder.description}
                          </p>
                        )}
                        
                        {/* Reminder Time */}
                        <div className="flex items-center gap-2 mb-6 text-white/60">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">
                            {formatDateTime(reminder.reminderTime)}
                          </span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                          <button
                            onClick={() => handleEdit(reminder)}
                            className="group flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl transition-all duration-300 border border-emerald-500/30 hover:border-emerald-400/50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id, reminder.title)}
                            className="group flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
      {/* Ultra-Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="relative backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-2xl transform transition-all duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/10">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="title" className="block text-lg font-semibold text-white/90">
                    Reminder Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 text-white placeholder-white/50 transition-all duration-300"
                    placeholder="What do you want to be reminded about?"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <label htmlFor="description" className="block text-lg font-semibold text-white/90">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 text-white placeholder-white/50 transition-all duration-300 resize-none"
                    placeholder="Add more details (optional)"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3">
                  <label htmlFor="reminderTime" className="block text-lg font-semibold text-white/90">
                    When to remind you *
                  </label>
                  <input
                    type="datetime-local"
                    id="reminderTime"
                    value={formData.reminderTime}
                    onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 text-white placeholder-white/50 transition-all duration-300"
                    required
                  />
                  <p className="text-sm text-white/60 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                    🔔 You'll receive a notification at this time (if enabled)
                  </p>
                </div>
              </div>
              
              {/* Modal Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-400/50 disabled:to-teal-400/50 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-medium shadow-lg hover:shadow-xl"
                >
                  {saving && (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {editingReminder ? 'Update' : 'Create'} Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${confirmDialog.reminderTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </>
  );
}
