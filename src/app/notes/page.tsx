'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Note {
  id: string;
  title: string;
  content: string;
  noteType: 'paragraph' | 'bullet' | 'numbered' | 'link';
  topic: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NOTE_TOPICS = [
  { id: 'youtube', name: 'YouTube', icon: '📺', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  { id: 'freelance', name: 'Freelance', icon: '💼', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  { id: 'job', name: 'Job', icon: '🏢', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  { id: 'learning', name: 'Learning', icon: '📚', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  { id: 'certification', name: 'Certification', icon: '🏆', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  { id: 'business', name: 'Business', icon: '🚀', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400' }
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    noteType: 'paragraph' | 'bullet' | 'numbered' | 'link';
    topic: string;
  }>({
    title: '',
    content: '',
    noteType: 'paragraph',
    topic: 'youtube'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    noteId: '',
    noteTitle: ''
  });

  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setError('Firebase is not available in this environment');
      setLoading(false);
      return;
    }

    const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Note)).sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching notes:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setEditingNote(null);
    setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
    setIsModalOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ 
      title: note.title, 
      content: note.content,
      noteType: note.noteType,
      topic: note.topic
    });
    setIsModalOpen(true);
  };

  const handleView = (note: Note) => {
    setViewingNote(note);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      noteId: id,
      noteTitle: title
    });
  };

  const confirmDelete = async () => {
    if (!isFirebaseAvailable()) return;
    
    try {
      setDeleting(confirmDialog.noteId);
      await deleteDoc(doc(db, 'notes', confirmDialog.noteId));
      setConfirmDialog({ isOpen: false, noteId: '', noteTitle: '' });
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, noteId: '', noteTitle: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseAvailable()) return;
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    try {
      setSaving(true);
      if (editingNote) {
        // Edit existing note
        await updateDoc(doc(db, 'notes', editingNote.id), {
          title: formData.title.trim(),
          content: formData.content.trim(),
          noteType: formData.noteType,
          topic: formData.topic,
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new note
        const notesCollection = collection(db, 'notes');
        await addDoc(notesCollection, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          noteType: formData.noteType,
          topic: formData.topic,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
      setEditingNote(null);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatContent = (content: string, noteType: string) => {
    if (noteType === 'bullet') {
      return content.split('\n').map(line => line.trim()).filter(line => line).map(line => `• ${line}`).join('\n');
    } else if (noteType === 'numbered') {
      return content.split('\n').map(line => line.trim()).filter(line => line).map((line, index) => `${index + 1}. ${line}`).join('\n');
    } else if (noteType === 'link') {
      return content.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
          return trimmed;
        }
        return trimmed;
      }).filter(line => line).join('\n');
    }
    return content;
  };

  const renderFormattedContent = (content: string, noteType: string) => {
    const formatted = formatContent(content, noteType);
    
    if (noteType === 'link') {
      const lines = formatted.split('\n');
      return (
        <>
          {lines.map((line, index) => (
            <React.Fragment key={index}>
              {line.startsWith('http://') || line.startsWith('https://') ? (
                <a 
                  href={line} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                >
                  {line}
                </a>
              ) : (
                <span>{line}</span>
              )}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </>
      );
    }
    
    return formatted.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < formatted.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  if (loading) {
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
          .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 15s ease infinite;
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out;
          }
        `}</style>
        
        <div className="min-h-screen relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-900 animate-gradient-x" />
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 rounded-full animate-spin border-t-violet-400"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
            </div>
            <p className="text-white/80 text-lg mt-6 font-medium">Loading your notes...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style jsx>{`
          @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 15s ease infinite;
          }
        `}</style>
        
        <div className="min-h-screen relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-900 animate-gradient-x" />
          <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
            <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-3xl p-12 text-center shadow-2xl max-w-2xl">
              <div className="text-red-400 mb-6">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
              <p className="text-white/80 mb-8 text-lg">{error}</p>
              <div className="text-left bg-red-500/10 rounded-2xl p-6 border border-red-500/20">
                <p className="text-red-200 font-medium mb-3">Please ensure:</p>
                <ul className="text-red-200 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    Firebase configuration is properly set up
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    Firestore database is enabled in your Firebase project
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    You have an internet connection
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

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
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5); }
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
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-900 animate-gradient-x" />
        
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float animation-delay-200" />
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
                    className="group relative overflow-hidden inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 animate-pulse-glow"
                    title="Home"
                  >
                    <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-100 to-purple-100 bg-clip-text text-transparent">
                      Smart Notes
                    </h1>
                    <p className="text-white/60 mt-1">Organize your thoughts and ideas</p>
                  </div>
                </div>
                
                <button
                  onClick={handleAdd}
                  className="group relative overflow-hidden inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 gap-3"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Note
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            {notes.length === 0 ? (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-16 shadow-2xl max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">No Notes Yet</h3>
                  <p className="text-white/70 text-lg mb-8">Start organizing your thoughts by creating your first note.</p>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create First Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {notes.map((note, index) => {
                  const topic = NOTE_TOPICS.find(t => t.id === note.topic) || NOTE_TOPICS[0];
                  return (
                    <div
                      key={note.id}
                      className={`group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:border-white/20 animate-fade-in-up animation-delay-${Math.min(index * 100, 400)}`}
                    >
                      {/* Topic and Type Badges */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-full text-sm font-bold text-white/90 flex items-center gap-2">
                            <span className="text-base">{topic.icon}</span>
                            {topic.name}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-medium text-white/70 capitalize">
                          {note.noteType}
                        </span>
                      </div>
                      
                      {/* Note Title */}
                      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-violet-200 transition-colors line-clamp-2">
                        {note.title}
                      </h3>
                      
                      {/* Note Preview */}
                      <div className="text-white/80 text-sm mb-6 line-clamp-3 leading-relaxed">
                        {renderFormattedContent(note.content, note.noteType)}
                      </div>
                      
                      {/* Date Information */}
                      <div className="flex items-center justify-between text-xs text-white/60 mb-6">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {note.createdAt ? new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(note.createdAt) : 'Unknown date'}
                          </span>
                        </div>
                        {note.updatedAt && note.createdAt && note.updatedAt.getTime() !== note.createdAt.getTime() && (
                          <span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30 font-medium">
                            Updated
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                          onClick={() => handleView(note)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white hover:text-violet-200 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(note)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 hover:text-violet-200 rounded-xl transition-all duration-300 border border-violet-500/30 hover:border-violet-400/50 font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(note.id, note.title)}
                          disabled={deleting === note.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50 disabled:opacity-50 font-medium"
                        >
                          {deleting === note.id ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          {deleting === note.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Ultra-Modern Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="relative backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
                  setEditingNote(null);
                }}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-white/90">
                    Topic Category
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 text-white transition-all duration-300"
                  >
                    {NOTE_TOPICS.map(topic => (
                      <option key={topic.id} value={topic.id} className="bg-gray-800 text-white">
                        {topic.icon} {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-white/90">
                    Note Type
                  </label>
                  <select
                    value={formData.noteType}
                    onChange={(e) => setFormData({...formData, noteType: e.target.value as 'paragraph' | 'bullet' | 'numbered' | 'link'})}
                    className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 text-white transition-all duration-300"
                  >
                    <option value="paragraph" className="bg-gray-800 text-white">📄 Paragraph</option>
                    <option value="bullet" className="bg-gray-800 text-white">• Bullet Points</option>
                    <option value="numbered" className="bg-gray-800 text-white">🔢 Numbered List</option>
                    <option value="link" className="bg-gray-800 text-white">🔗 Links</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-lg font-semibold text-white/90">
                  Note Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 text-white placeholder-white/50 transition-all duration-300"
                  placeholder="Enter a descriptive title for your note"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-lg font-semibold text-white/90">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={8}
                  className="w-full px-4 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 text-white placeholder-white/50 transition-all duration-300 resize-none"
                  placeholder={
                    formData.noteType === 'bullet' ? 'Enter each point on a new line\n• Point 1\n• Point 2\n• Point 3' :
                    formData.noteType === 'numbered' ? 'Enter each item on a new line\n1. First item\n2. Second item\n3. Third item' :
                    formData.noteType === 'link' ? 'Enter each URL on a new line\nhttps://example1.com\nhttps://example2.com' :
                    'Enter your note content here...'
                  }
                  required
                />
                <p className="text-sm text-white/60 bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                  💡 {formData.noteType === 'bullet' ? 'Use bullet points for lists and ideas' :
                      formData.noteType === 'numbered' ? 'Perfect for step-by-step instructions' :
                      formData.noteType === 'link' ? 'Store and organize your important links' :
                      'Write in paragraph form for detailed notes'}
                </p>
              </div>
              
              {/* Modal Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
                    setEditingNote(null);
                  }}
                  className="flex-1 px-6 py-3 text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-400/50 disabled:to-purple-400/50 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-medium shadow-lg hover:shadow-xl"
                >
                  {saving && (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {saving ? 'Saving...' : (editingNote ? 'Update Note' : 'Create Note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ultra-Modern View Modal */}
      {isViewModalOpen && viewingNote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="relative backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-8 border-b border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const topic = NOTE_TOPICS.find(t => t.id === viewingNote.topic) || NOTE_TOPICS[0];
                    return (
                      <span className="px-4 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-full text-sm font-bold text-white/90 flex items-center gap-2">
                        <span className="text-base">{topic.icon}</span>
                        {topic.name}
                      </span>
                    );
                  })()}
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-medium text-white/70 capitalize">
                    {viewingNote.noteType}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {viewingNote.title}
                </h2>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-8">
              <div className="text-white/90 mb-8 whitespace-pre-wrap leading-relaxed text-lg">
                {renderFormattedContent(viewingNote.content, viewingNote.noteType)}
              </div>
              
              {/* Date Information */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Created:</span>
                    <span>
                      {viewingNote.createdAt ? new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(viewingNote.createdAt) : 'Unknown date'}
                    </span>
                  </div>
                  {viewingNote.updatedAt && viewingNote.createdAt && viewingNote.updatedAt.getTime() !== viewingNote.createdAt.getTime() && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="font-medium">Updated:</span>
                      <span>
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(viewingNote.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1 px-6 py-3 text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(viewingNote);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-medium shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${confirmDialog.noteTitle}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
