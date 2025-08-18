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

interface Note {
  id: string;
  title: string;
  content: string;
  noteType: 'paragraph' | 'bullet' | 'numbered';
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

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    noteType: 'paragraph' as 'paragraph' | 'bullet' | 'numbered',
    topic: 'youtube'
  });

  // Load notes from Firestore on component mount
  useEffect(() => {
    const notesCollection = collection(db, 'notes');
    
    const unsubscribe = onSnapshot(notesCollection, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Note[];
      
      setNotes(notesData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return 0;
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Error deleting note. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    try {
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
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ title: '', content: '', noteType: 'paragraph', topic: 'youtube' });
    setEditingNote(null);
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

  const formatContent = (content: string, noteType: string) => {
    if (noteType === 'bullet') {
      return content.split('\n').map((line, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-gray-500 mt-1">•</span>
          <span>{line}</span>
        </div>
      ));
    } else if (noteType === 'numbered') {
      return content.split('\n').map((line, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-gray-500 mt-1">{index + 1}.</span>
          <span>{line}</span>
        </div>
      ));
    }
    return content.split('\n').map((line, index) => (
      <p key={index} className="mb-1">{line}</p>
    ));
  };

  const getTopicInfo = (topicId: string) => {
    return NOTE_TOPICS.find(topic => topic.id === topicId) || NOTE_TOPICS[0];
  };

  const filteredNotes = selectedTopic === 'all' 
    ? notes 
    : notes.filter(note => note.topic === selectedTopic);

  const getTopicCount = (topicId: string) => {
    return notes.filter(note => note.topic === topicId).length;
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
              Notes
            </h1>
          </div>
          
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        </div>

        {/* Topic Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopic('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTopic === 'all'
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Notes ({notes.length})
            </button>
            {NOTE_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedTopic === topic.id
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <span>{topic.icon}</span>
                {topic.name} ({getTopicCount(topic.id)})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading notes...</p>
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
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {selectedTopic === 'all' 
                    ? 'No notes found. Click "Add Note" to get started.'
                    : `No notes found for ${getTopicInfo(selectedTopic).name}. Click "Add Note" to create one.`
                  }
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const topicInfo = getTopicInfo(note.topic);
                  return (
                    <div key={note.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {note.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${topicInfo.color}`}>
                              {topicInfo.icon} {topicInfo.name}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                              {note.noteType}
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-300 mb-3">
                            {formatContent(note.content, note.noteType)}
                          </div>
                          {note.createdAt && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Created: {formatDateTime(note.createdAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(note)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
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
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {editingNote ? 'Edit Note' : 'Add New Note'}
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
                  placeholder="Enter note title"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic *
                  </label>
                  <select
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    {NOTE_TOPICS.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.icon} {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="noteType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note Type *
                  </label>
                  <select
                    id="noteType"
                    value={formData.noteType}
                    onChange={(e) => setFormData({ ...formData, noteType: e.target.value as 'paragraph' | 'bullet' | 'numbered' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="bullet">Bullet Points</option>
                    <option value="numbered">Numbered List</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content *
                </label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder={
                    formData.noteType === 'bullet' ? 'Enter each bullet point on a new line' :
                    formData.noteType === 'numbered' ? 'Enter each item on a new line' :
                    'Enter your note content'
                  }
                  rows={8}
                  required
                />
                {formData.noteType !== 'paragraph' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tip: Each line will be formatted as a separate {formData.noteType === 'bullet' ? 'bullet point' : 'numbered item'}
                  </p>
                )}
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
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingNote ? 'Update' : 'Add'} Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
