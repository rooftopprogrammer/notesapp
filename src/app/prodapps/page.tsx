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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ProductionApp {
  id: string;
  name: string;
  links: string[]; // Changed from single link to array of links
  createdAt?: Date;
  updatedAt?: Date;
}

export default function ProductionApps() {
  const [apps, setApps] = useState<ProductionApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ProductionApp | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    appId: string;
    appName: string;
  }>({
    isOpen: false,
    appId: '',
    appName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    links: [''] // Array of links, starting with one empty link
  });

  // Load apps from Firestore on component mount
  useEffect(() => {
    const appsCollection = collection(db, 'productionApps');
    
    const unsubscribe = onSnapshot(appsCollection, (snapshot) => {
      const appsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Handle migration from old single link to new multiple links format
          links: data.links || (data.link ? [data.link] : []),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }) as ProductionApp[];
      
      setApps(appsData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return 0;
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching apps:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setEditingApp(null);
    setFormData({ name: '', links: [''] });
    setIsModalOpen(true);
  };

  const handleEdit = (app: ProductionApp) => {
    setEditingApp(app);
    setFormData({ name: app.name, links: app.links.length > 0 ? [...app.links] : [''] });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      appId: id,
      appName: name
    });
  };

  const confirmDelete = async () => {
    try {
      setDeleting(confirmDialog.appId);
      await deleteDoc(doc(db, 'productionApps', confirmDialog.appId));
      setConfirmDialog({ isOpen: false, appId: '', appName: '' });
    } catch (error) {
      console.error('Error deleting app:', error);
      alert('Error deleting application. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, appId: '', appName: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty links and validate
    const validLinks = formData.links.filter(link => link.trim() !== '');
    
    if (!formData.name.trim() || validLinks.length === 0) {
      alert('Please fill in the application name and at least one link');
      return;
    }

    try {
      setSaving(true);
      if (editingApp) {
        // Edit existing app
        await updateDoc(doc(db, 'productionApps', editingApp.id), {
          name: formData.name.trim(),
          links: validLinks.map(link => link.trim()),
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new app
        const appsCollection = collection(db, 'productionApps');
        await addDoc(appsCollection, {
          name: formData.name.trim(),
          links: validLinks.map(link => link.trim()),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ name: '', links: [''] });
      setEditingApp(null);
    } catch (error) {
      console.error('Error saving app:', error);
      alert('Error saving application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', links: [''] });
    setEditingApp(null);
  };

  // Helper functions for managing multiple links
  const addLinkField = () => {
    setFormData({ ...formData, links: [...formData.links, ''] });
  };

  const removeLinkField = (index: number) => {
    if (formData.links.length > 1) {
      const newLinks = formData.links.filter((_, i) => i !== index);
      setFormData({ ...formData, links: newLinks });
    }
  };

  const updateLinkField = (index: number, value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = value;
    setFormData({ ...formData, links: newLinks });
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
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5); }
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
      `}</style>
      
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-cyan-900 animate-gradient-x" />
        
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float animation-delay-200" />
          <div className="absolute bottom-20 left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float animation-delay-400" />
        </div>
        
        <div className="relative z-10 min-h-screen">
          {/* Glassmorphism Header */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
                <div className="flex items-center gap-6 mb-4 sm:mb-0">
                  <Link
                    href="/"
                    className="group relative overflow-hidden inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 animate-pulse-glow"
                    title="Home"
                  >
                    <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      Production Applications
                    </h1>
                    <p className="text-white/60 mt-1">Manage your production deployments</p>
                  </div>
                </div>
                
                <button
                  onClick={handleAdd}
                  className="group relative overflow-hidden inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 gap-3"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Application
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-white/20 rounded-full animate-spin border-t-blue-400"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
                </div>
                <p className="text-white/80 text-lg mt-6 font-medium">Loading applications...</p>
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
                  <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6 text-left">
                    <h4 className="font-bold text-blue-300 mb-4 text-lg">Setup Required:</h4>
                    <ol className="text-blue-200 space-y-2">
                      <li className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        Go to <a href="https://console.firebase.google.com/project/notesapp-89d19/firestore" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">Firebase Console</a>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        Click "Create database"
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        Choose "Start in test mode"
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        Select a location and click "Done"
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {apps.length === 0 ? (
                  <div className="text-center py-20 animate-fade-in-up">
                    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-16 shadow-2xl">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">No Applications Yet</h3>
                      <p className="text-white/70 text-lg mb-8">Click "Add Application" to get started with your first production app.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {apps.map((app, index) => (
                      <div
                        key={app.id}
                        className={`group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:border-white/20 animate-fade-in-up animation-delay-${Math.min(index * 100, 400)}`}
                      >
                        {/* Card Number */}
                        <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white/80">#{index + 1}</span>
                        </div>
                        
                        {/* App Icon */}
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        
                        {/* App Name */}
                        <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                          {app.name}
                        </h3>
                        
                        {/* Links */}
                        <div className="space-y-3 mb-8">
                          {app.links.map((link, linkIndex) => (
                            <div key={linkIndex} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-white/80 mt-1">
                                {linkIndex + 1}
                              </span>
                              <a
                                href={link.startsWith('http') ? link : `https://${link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:text-blue-200 text-sm break-all hover:underline leading-relaxed transition-colors flex-1 group-hover:text-blue-200"
                              >
                                {link}
                              </a>
                            </div>
                          ))}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                          <button
                            onClick={() => handleEdit(app)}
                            className="group flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 rounded-xl transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(app.id, app.name)}
                            disabled={deleting === app.id}
                            className="group flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50 disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting === app.id ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                            ) : (
                              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {editingApp ? 'Edit Application' : 'Add New Application'}
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
                  <label className="block text-lg font-semibold text-white/90">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white placeholder-white/50 transition-all duration-300"
                    placeholder="Enter application name"
                    required
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-white/90">
                    Application Links
                  </label>
                  <div className="space-y-4">
                    {formData.links.map((link, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => updateLinkField(index, e.target.value)}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white placeholder-white/50 transition-all duration-300"
                            placeholder={`https://example${index > 0 ? index + 1 : ''}.com`}
                            required={index === 0}
                          />
                        </div>
                        {formData.links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLinkField(index)}
                            className="p-3 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50"
                            title="Remove link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addLinkField}
                      className="w-full px-4 py-3 border-2 border-dashed border-white/30 hover:border-blue-400/50 rounded-xl text-white/70 hover:text-blue-300 transition-all duration-300 flex items-center justify-center gap-3 hover:bg-blue-500/10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Another Link
                    </button>
                  </div>
                  <p className="text-sm text-white/60 bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                    💡 Add multiple domains for the same application (e.g., nersys.com, nersys.info, nersys.app)
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-blue-400/50 disabled:to-purple-400/50 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-medium shadow-lg hover:shadow-xl"
                >
                  {saving && (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {editingApp ? 'Update' : 'Add'} Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Application"
        message={`Are you sure you want to delete "${confirmDialog.appName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </>
  );
}
