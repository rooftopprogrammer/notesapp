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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading notes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Connection Error</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <div className="text-sm text-red-600 dark:text-red-400">
            <p>Please ensure:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Firebase configuration is properly set up</li>
              <li>Firestore database is enabled in your Firebase project</li>
              <li>You have an internet connection</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Organize your thoughts and ideas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No notes yet</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">Start by creating your first note</p>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create First Note
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const topic = NOTE_TOPICS.find(t => t.id === note.topic) || NOTE_TOPICS[0];
            return (
              <div
                key={note.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${topic.color}`}>
                      {topic.icon} {topic.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {note.noteType}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {note.title}
                </h3>
                
                <div className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                  {renderFormattedContent(note.content, note.noteType)}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>
                    {note.createdAt ? new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(note.createdAt) : 'Unknown date'}
                  </span>
                  {note.updatedAt && note.createdAt && note.updatedAt.getTime() !== note.createdAt.getTime() && (
                    <span className="text-blue-500 dark:text-blue-400">
                      Updated
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(note)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-sm transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(note)}
                    className="flex-1 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-2 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id, note.title)}
                    disabled={deleting === note.id}
                    className="flex-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {deleting === note.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {NOTE_TOPICS.map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.icon} {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note Type
                  </label>
                  <select
                    value={formData.noteType}
                    onChange={(e) => setFormData({...formData, noteType: e.target.value as 'paragraph' | 'bullet' | 'numbered' | 'link'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="bullet">Bullet Points</option>
                    <option value="numbered">Numbered List</option>
                    <option value="link">Links</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter note title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={
                      formData.noteType === 'bullet' ? 'Enter each point on a new line' :
                      formData.noteType === 'numbered' ? 'Enter each item on a new line' :
                      formData.noteType === 'link' ? 'Enter each URL on a new line' :
                      'Enter your note content'
                    }
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
                      setEditingNote(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : (editingNote ? 'Update Note' : 'Add Note')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const topic = NOTE_TOPICS.find(t => t.id === viewingNote.topic) || NOTE_TOPICS[0];
                    return (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${topic.color}`}>
                        {topic.icon} {topic.name}
                      </span>
                    );
                  })()}
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {viewingNote.noteType}
                  </span>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {viewingNote.title}
              </h2>
              
              <div className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                {renderFormattedContent(viewingNote.content, viewingNote.noteType)}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <div>
                  Created: {viewingNote.createdAt ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(viewingNote.createdAt) : 'Unknown date'}
                </div>
                {viewingNote.updatedAt && viewingNote.createdAt && viewingNote.updatedAt.getTime() !== viewingNote.createdAt.getTime() && (
                  <div>
                    Updated: {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(viewingNote.updatedAt)}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(viewingNote);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
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
    </div>
  );
}
