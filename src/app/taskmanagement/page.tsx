'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getTasks, 
  addTask, 
  updateTask, 
  deleteTask, 
  reorderTasks,
  getNextSerialNo,
  Task 
} from '@/lib/taskManagement';

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: '',
    category: '',
    status: 'pending' as Task['status'],
    link: '',
    title: ''
  });

  // Load tasks from Firestore on component mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const loadedTasks = await getTasks();
        setTasks(loadedTasks);
        setFilteredTasks(loadedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  // Filter tasks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTasks(tasks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tasks.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.type.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query)
      );
      setFilteredTasks(filtered);
    }
  }, [searchQuery, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.type.trim() || !formData.category.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        const updates = {
          ...formData,
          updatedAt: new Date(),
        };
        await updateTask(editingTask.id, updates);
        const updatedTask: Task = {
          ...editingTask,
          ...formData,
        };
        setTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task));
      } else {
        // Add new task
        const serialNo = await getNextSerialNo();
        const newTask: Omit<Task, 'id'> = {
          ...formData,
          serialNo,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const addedTask = await addTask(newTask);
        setTasks(prev => [...prev, addedTask]);
      }

      // Reset form
      setFormData({
        type: '',
        category: '',
        status: 'pending',
        link: '',
        title: ''
      });
      setShowForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task. Please try again.');
    }
  };

  const handleEdit = async (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      type: task.type,
      category: task.category,
      status: task.status,
      link: task.link || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await deleteTask(taskId);
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      
      // Reorder serial numbers
      const reorderedTasks = updatedTasks.map((task, index) => ({
        ...task,
        serialNo: index + 1
      }));
      
      // Update serial numbers in Firestore
      await reorderTasks(reorderedTasks);
      setTasks(reorderedTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const statusStyles = {
      'pending': 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/50 dark:to-amber-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200/50 dark:border-yellow-700/50',
      'in-progress': 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/50',
      'completed': 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/50',
      'on-hold': 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/50'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-600/40 rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-6 sm:mb-0">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Task Management
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">
                Manage your tasks, freelance work, and study plans with modern efficiency
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-6 py-3 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 border border-white/40 dark:border-gray-600/40 text-slate-700 dark:text-slate-300 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (!showForm) {
                    setEditingTask(null);
                    setFormData({
                      type: '',
                      category: '',
                      status: 'pending',
                      link: '',
                      title: ''
                    });
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showForm ? 'Cancel' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-600/40 rounded-2xl shadow-2xl p-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tasks by title, type, category, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-12 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <div className="mt-4 p-4 rounded-xl backdrop-blur-sm bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30 dark:border-indigo-700/30">
              <p className="text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Task Form */}
        {showForm && (
          <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-600/40 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
                  placeholder="e.g., Study Planner, Freelance"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
                  placeholder="e.g., Study Tracker, Freelance"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full px-4 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200 text-lg"
                  placeholder="https://example.com"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingTask ? 'Update Task' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-4 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 border border-white/40 dark:border-gray-600/40 text-slate-700 dark:text-slate-300 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks Table */}
        <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-600/40 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/30 dark:border-gray-600/30">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Task Management ({filteredTasks.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-xl text-slate-600 dark:text-slate-400">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No tasks found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchQuery ? 'Try adjusting your search criteria' : 'Create your first task to get started'}
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Task
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Task Details
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-200"
                    >
                      <td className="px-6 py-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/30 rounded-xl flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                            {task.serialNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col space-y-1">
                          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {task.title}
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-700/50 w-fit">
                            {task.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-800 dark:text-blue-200 border border-blue-200/50 dark:border-blue-700/50">
                          {task.category}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          {task.link && (
                            <a
                              href={task.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 rounded-lg backdrop-blur-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300/50 dark:border-indigo-600/50 transition-all duration-200 hover:scale-105"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Link
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(task)}
                            className="inline-flex items-center px-3 py-2 rounded-lg backdrop-blur-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-300/50 dark:border-amber-600/50 transition-all duration-200 hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="inline-flex items-center px-3 py-2 rounded-lg backdrop-blur-sm bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 border border-red-300/50 dark:border-red-600/50 transition-all duration-200 hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}