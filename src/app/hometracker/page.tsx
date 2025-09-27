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

interface TrackerEntry {
  id: string;
  category: string;
  title: string;
  description: string;
  value?: string;
  unit?: string;
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const TRACKER_CATEGORIES = [
  { 
    id: 'fitness', 
    name: 'Fitness', 
    icon: '💪', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    examples: ['Workout', 'Steps', 'Weight', 'Running', 'Gym Session'],
    status: 'functional'
  },
  { 
    id: 'health', 
    name: 'Health', 
    icon: '🩺', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    examples: ['Blood Pressure', 'Heart Rate', 'Doctor Visit', 'Checkup', 'Symptoms'],
    status: 'functional'
  },
  { 
    id: 'medications', 
    name: 'Medications', 
    icon: '💊', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    examples: ['Morning Pills', 'Vitamin D', 'Prescription', 'Supplements', 'Dosage'],
    status: 'functional'
  },
  { 
    id: 'vaccines', 
    name: 'Vaccines', 
    icon: '💉', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    examples: ['COVID Booster', 'Flu Shot', 'Travel Vaccines', 'Annual Shots', 'Immunization'],
    status: 'functional'
  },
  { 
    id: 'food', 
    name: 'Food', 
    icon: '🍎', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    examples: ['Calories', 'Water Intake', 'Meals', 'Diet Plan', 'Nutrition'],
    status: 'functional'
  },
  { 
    id: 'diet', 
    name: 'Family Diet', 
    icon: '🥗', 
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    examples: ['Family Meals', 'Weekly Menu', 'Dietary Restrictions', 'Meal Planning', 'Grocery List'],
    status: 'partial' // Has Instructions (functional) but other features are not functional
  },
  { 
    id: 'weight', 
    name: 'Weight Tracker', 
    icon: '⚖️', 
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    examples: ['Weekly Weight', 'Family Progress', 'Weight Goals', 'BMI Tracking', 'Health Progress'],
    status: 'functional'
  },
  { 
    id: 'inventory', 
    name: 'Home Inventory', 
    icon: '🏠', 
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400',
    examples: ['Monitor', 'Mobile', 'Kitchen Items', 'Electronics', 'Furniture'],
    status: 'functional'
  }
];

export default function HomeTracker() {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'fitness',
    title: '',
    description: '',
    value: '',
    unit: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load entries from Firestore
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setError('Firebase is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    const entriesCollection = collection(db, 'homeTracker');
    
    const unsubscribe = onSnapshot(entriesCollection, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as TrackerEntry[];
      
      setEntries(entriesData.sort((a, b) => {
        if (a.date && b.date) {
          return b.date.getTime() - a.date.getTime();
        }
        return 0;
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching home tracker entries:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
      category: 'fitness',
      title: '',
      description: '',
      value: '',
      unit: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: TrackerEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      title: entry.title,
      description: entry.description,
      value: entry.value || '',
      unit: entry.unit || '',
      date: entry.date.toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isFirebaseAvailable()) return;
    
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        setDeleting(id);
        await deleteDoc(doc(db, 'homeTracker', id));
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry. Please try again.');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseAvailable()) return;
    
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setSaving(true);
      const entryData = {
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        value: formData.value.trim() || undefined,
        unit: formData.unit.trim() || undefined,
        date: Timestamp.fromDate(new Date(formData.date)),
        updatedAt: serverTimestamp()
      };

      if (editingEntry) {
        // Edit existing entry
        await updateDoc(doc(db, 'homeTracker', editingEntry.id), entryData);
      } else {
        // Add new entry
        const entriesCollection = collection(db, 'homeTracker');
        await addDoc(entriesCollection, {
          ...entryData,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({
        category: 'fitness',
        title: '',
        description: '',
        value: '',
        unit: '',
        date: new Date().toISOString().split('T')[0]
      });
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormData({
      category: 'fitness',
      title: '',
      description: '',
      value: '',
      unit: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredEntries = entries;

  const getCategoryInfo = (categoryId: string) => {
    return TRACKER_CATEGORIES.find(cat => cat.id === categoryId) || TRACKER_CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your family tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Database Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium transition-colors group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">👨‍👩‍👧‍👦</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Family Tracker
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your health & wellness dashboard
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Entry
            </button>
          </div>
        </div>
      </header>

      {/* Modern Category Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Health Categories</h2>
          <p className="text-gray-600 dark:text-gray-400">Track and manage your family's wellness journey</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {TRACKER_CATEGORIES.map(category => {
            const count = entries.filter(entry => entry.category === category.id).length;
            return (
              <Link
                key={category.id}
                href={`/hometracker/${category.id}`}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  {category.status === 'functional' ? (
                    <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : category.status === 'partial' ? (
                    <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/50 dark:to-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {category.examples.slice(0, 2).join(', ')}...
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${category.color} border-current/20`}>
                        {count} entries
                      </span>
                    </div>
                    <div className={`text-xs font-medium flex items-center gap-1 ${
                      category.status === 'functional' ? 'text-emerald-600 dark:text-emerald-400' :
                      category.status === 'partial' ? 'text-amber-600 dark:text-amber-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        category.status === 'functional' ? 'bg-emerald-500' :
                        category.status === 'partial' ? 'bg-amber-500' :
                        'bg-gray-400'
                      }`}></div>
                      {category.status === 'functional' ? 'Active' :
                       category.status === 'partial' ? 'Partial' :
                       'Coming Soon'}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Modern Status Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Status Guide</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Active</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300">Fully functional</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100">Partial</div>
                <div className="text-xs text-amber-700 dark:text-amber-300">Some features ready</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Coming Soon</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In development</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Empty State or Entries */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/50 dark:to-blue-900/50 rounded-3xl flex items-center justify-center shadow-lg">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Ready to start tracking?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Begin your family's health and wellness journey by adding your first entry. Track everything from fitness to medications.
            </p>
            <button
              onClick={handleAdd}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Add Your First Entry
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Entries</h3>
              <span className="text-sm text-gray-600 dark:text-gray-400">{filteredEntries.length} total entries</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => {
                const categoryInfo = getCategoryInfo(entry.category);
                return (
                  <div
                    key={entry.id}
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                  >
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/30 dark:to-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${categoryInfo.color} border-current/20`}>
                            <span className="mr-1">{categoryInfo.icon}</span>
                            {categoryInfo.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting === entry.id}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            {deleting === entry.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {entry.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {entry.description}
                        </p>
                      </div>

                      {entry.value && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Value: </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {entry.value} {entry.unit}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {entry.date.toLocaleDateString()}
                        </div>
                        {entry.createdAt && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {entry.createdAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TRACKER_CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setFormData({...formData, category: category.id})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.category === category.id
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{category.icon}</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {category.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., Morning workout, Blood pressure check..."
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Additional details about this entry..."
                  />
                </div>

                {/* Value and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Value
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., 10000, 120/80, 2..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., steps, mmHg, tablets..."
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                {/* Action Buttons */}
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
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    {saving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {editingEntry ? 'Update' : 'Add'} Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
