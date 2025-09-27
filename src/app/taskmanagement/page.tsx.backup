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
  }, [tasks, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.category || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        await updateTask(editingTask.id, formData);
        const updatedTasks = tasks.map(task => 
          task.id === editingTask.id 
            ? {
                ...task,
                ...formData,
                updatedAt: new Date()
              }
            : task
        );
        setTasks(updatedTasks);
      } else {
        // Create new task
        const nextSerialNo = await getNextSerialNo();
        const newTask = await addTask({
          serialNo: nextSerialNo,
          ...formData
        });
        setTasks([...tasks, newTask]);
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

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      type: task.type,
      category: task.category,
      status: task.status,
      link: task.link,
      title: task.title
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
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'on-hold': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-2xl p-8 border border-white/20 dark:border-gray-700/30 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="group p-3 rounded-xl backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
              >
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 dark:from-indigo-300 dark:to-purple-300 bg-clip-text text-transparent mb-2">
                  Task Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Manage your tasks with categories, status tracking, and direct links
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingTask(null);
                setFormData({
                  type: '',
                  category: '',
                  status: 'pending',
                  link: '',
                  title: ''
                });
              }}
              className="group px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-xl mb-8">
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
              className="block w-full pl-12 pr-12 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <div className="mt-4 p-3 rounded-xl backdrop-blur-sm bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-700/30">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Task Form */}
        {showForm && (
          <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl p-8 border border-white/30 dark:border-gray-700/30 shadow-xl mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/30 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 border border-white/40 dark:border-gray-600/40 hover:bg-white/80 dark:hover:bg-gray-600/80 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
                  placeholder="e.g., Study Planner, Freelance"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
                  placeholder="e.g., Study Tracker, Freelance"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full px-4 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-0 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 shadow-lg transition-all duration-200"
                  placeholder="https://example.com"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingTask ? 'Update Task' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 backdrop-blur-sm bg-white/60 dark:bg-gray-700/60 border border-white/40 dark:border-gray-600/40 text-slate-700 dark:text-slate-300 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g., Development, Design, Research"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g., Frontend, Backend, UI/UX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as Task['status']})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tasks ({filteredTasks.length}{searchQuery ? ` of ${tasks.length}` : ''})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {searchQuery ? (
                <>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No tasks found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors mr-2"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No tasks found</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Add Your First Task
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.serialNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {task.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {task.link ? (
                          <a
                            href={task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
      </div>
    </main>
  );
}
