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
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

const CATEGORY_INFO = {
  id: 'vaccines',
  name: 'Vaccines',
  icon: '💉',
  color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  examples: ['COVID Booster', 'Flu Shot', 'Travel Vaccines', 'Annual Shots', 'Immunization'],
  description: 'Track your vaccinations and immunization records'
};

export default function VaccinesTracker() {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    unit: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load vaccines entries from Firestore
  useEffect(() => {
    const entriesCollection = collection(db, 'homeTracker');
    const vaccinesQuery = query(entriesCollection, where('category', '==', 'vaccines'));
    
    const unsubscribe = onSnapshot(vaccinesQuery, (snapshot) => {
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
      console.error('Error fetching vaccines entries:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
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
      title: entry.title,
      description: entry.description,
      value: entry.value || '',
      unit: entry.unit || '',
      date: entry.date.toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vaccine entry?')) {
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
    
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setSaving(true);
      const entryData = {
        category: 'vaccines',
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
      title: '',
      description: '',
      value: '',
      unit: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your vaccines tracker...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/hometracker" 
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                ← Back to Home Tracker
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {CATEGORY_INFO.icon} {CATEGORY_INFO.name} Tracker
              </h1>
            </div>
            <button
              onClick={handleAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vaccine Entry
            </button>
          </div>
        </div>
      </header>

      {/* Category Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 border-b border-purple-200 dark:border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{CATEGORY_INFO.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{CATEGORY_INFO.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{CATEGORY_INFO.description}</p>
              <div className="flex gap-2 mt-2">
                {CATEGORY_INFO.examples.map((example, index) => (
                  <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_INFO.color}`}>
                    {example}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">{CATEGORY_INFO.icon}</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No vaccine entries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Keep track of your immunization records by adding your first vaccine entry.
            </p>
            <button
              onClick={handleAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Add Your First Vaccine Entry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Your Vaccine Entries ({entries.length})
              </h3>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_INFO.color}`}>
                      {CATEGORY_INFO.icon} {CATEGORY_INFO.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Delete"
                      >
                        {deleting === entry.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {entry.title}
                  </h3>
                  
                  {entry.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {entry.description}
                    </p>
                  )}
                  
                  {entry.value && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Lot/Batch: <span className="font-medium">{entry.value}</span>
                      {entry.unit && <span> ({entry.unit})</span>}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    📅 {entry.date.toLocaleDateString()}
                  </div>
                </div>
              ))}
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
                  {editingEntry ? 'Edit Vaccine Entry' : 'Add New Vaccine Entry'}
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
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vaccine Name *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., COVID-19 Booster, Flu Shot, HPV..."
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Healthcare provider, location, next due date, side effects..."
                  />
                </div>

                {/* Value and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lot/Batch Number
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., AB123456, P12345..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., Pfizer, Moderna, J&J..."
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vaccination Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
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
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
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
