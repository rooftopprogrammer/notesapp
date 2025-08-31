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
  query,
  where 
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import { Project, Todo, TodoColumn } from '@/lib/types/todo';
import { Plus, MoreHorizontal, Folder, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const defaultProjects: Project[] = [
  {
    id: 'work',
    name: 'Work',
    description: 'Work related tasks',
    color: 'bg-blue-500',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Personal tasks and goals',
    color: 'bg-green-500',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const columns: TodoColumn[] = [
  { id: 'todo', title: 'To Do', color: 'border-gray-300', count: 0 },
  { id: 'inprogress', title: 'In Progress', color: 'border-orange-300', count: 0 },
  { id: 'completed', title: 'Completed', color: 'border-green-300', count: 0 }
];

export default function TodoPage() {
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500'
  });

  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'inprogress' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: ''
  });

  // Color options for projects
  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
    'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
  ];

  // Load projects and todos
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setError('Firebase is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    // Load projects
    const projectsCollection = collection(db, 'projects');
    const unsubscribeProjects = onSnapshot(projectsCollection, (snapshot) => {
      if (snapshot.empty) {
        // If no projects exist, use default projects
        setProjects(defaultProjects);
        setSelectedProject(defaultProjects[0]);
      } else {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Project[];
        setProjects(projectsData);
        if (!selectedProject && projectsData.length > 0) {
          setSelectedProject(projectsData[0]);
        }
      }
    });

    return () => {
      unsubscribeProjects();
    };
  }, []);

  // Load todos for selected project
  useEffect(() => {
    if (!selectedProject || !isFirebaseAvailable()) return;

    const todosCollection = collection(db, 'todos');
    const todosQuery = query(todosCollection, where('projectId', '==', selectedProject.id));
    
    const unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Todo[];
      
      setTodos(todosData);
      setLoading(false);
    });

    return () => {
      unsubscribeTodos();
    };
  }, [selectedProject]);

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;

    try {
      const newProject = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        color: projectForm.color,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects'), newProject);
      
      setProjectForm({ name: '', description: '', color: 'bg-blue-500' });
      setIsProjectModalOpen(false);
      toast.success('Project created successfully!');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  // Create or update todo
  const handleSaveTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoForm.title.trim() || !selectedProject) return;

    try {
      const todoData = {
        title: todoForm.title.trim(),
        description: todoForm.description.trim(),
        status: todoForm.status,
        priority: todoForm.priority,
        projectId: selectedProject.id,
        dueDate: todoForm.dueDate ? new Date(todoForm.dueDate) : null,
        updatedAt: serverTimestamp()
      };

      if (editingTodo) {
        // Update existing todo
        await updateDoc(doc(db, 'todos', editingTodo.id), todoData);
        toast.success('Todo updated successfully!');
      } else {
        // Create new todo
        await addDoc(collection(db, 'todos'), {
          ...todoData,
          createdAt: serverTimestamp()
        });
        toast.success('Todo created successfully!');
      }

      setTodoForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: ''
      });
      setEditingTodo(null);
      setIsTodoModalOpen(false);
    } catch (error) {
      console.error('Error saving todo:', error);
      toast.error('Failed to save todo');
    }
  };

  // Update todo status
  const handleUpdateTodoStatus = async (todoId: string, newStatus: 'todo' | 'inprogress' | 'completed') => {
    try {
      await updateDoc(doc(db, 'todos', todoId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating todo status:', error);
      toast.error('Failed to update todo status');
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: string) => {
    try {
      await deleteDoc(doc(db, 'todos', todoId));
      toast.success('Todo deleted successfully!');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
    }
  };

  // Filter todos by search term
  const filteredTodos = todos.filter(todo =>
    todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    todo.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group todos by status
  const todosByStatus = {
    todo: filteredTodos.filter(todo => todo.status === 'todo'),
    inprogress: filteredTodos.filter(todo => todo.status === 'inprogress'),
    completed: filteredTodos.filter(todo => todo.status === 'completed')
  };

  // Update column counts
  const updatedColumns = columns.map(column => ({
    ...column,
    count: todosByStatus[column.id].length
  }));

  const openEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setTodoForm({
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.toISOString().split('T')[0] : ''
    });
    setIsTodoModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading todos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">To Do List</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your tasks and projects</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Folder className="w-4 h-4" />
                New Project
              </button>
              <button
                onClick={() => setIsTodoModalOpen(true)}
                disabled={!selectedProject}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Projects */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Projects</h2>
              </div>
              <div className="p-2">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${project.color}`}></div>
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedProject ? (
              <>
                {/* Project Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${selectedProject.color}`}></div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {selectedProject.name}
                        </h2>
                        {selectedProject.description && (
                          <p className="text-gray-600 dark:text-gray-400">{selectedProject.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-3 gap-6">
                  {updatedColumns.map(column => (
                    <div key={column.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      {/* Column Header */}
                      <div className={`border-t-4 ${column.color} rounded-t-lg p-4 border-b border-gray-200 dark:border-gray-700`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-sm">
                            {column.count}
                          </span>
                        </div>
                      </div>

                      {/* Todo Items */}
                      <div className="p-4 space-y-3 min-h-[400px]">
                        {todosByStatus[column.id].map(todo => (
                          <div
                            key={todo.id}
                            className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => openEditTodo(todo)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {todo.title}
                              </h4>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add menu options here
                                  }}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {todo.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                {todo.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                todo.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {todo.priority}
                              </span>
                              
                              {todo.dueDate && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {todo.dueDate.toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Status Change Buttons */}
                            <div className="mt-3 flex gap-2">
                              {column.id !== 'todo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'todo');
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                  Move to To Do
                                </button>
                              )}
                              {column.id === 'todo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'inprogress');
                                  }}
                                  className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/40"
                                >
                                  Start
                                </button>
                              )}
                              {column.id === 'inprogress' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'completed');
                                  }}
                                  className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/40"
                                >
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTodo(todo.id);
                                }}
                                className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Project Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select a project from the sidebar or create a new one to get started.
                </p>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return 0;
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching todos:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter todos based on selected filters
  const filteredTodos = todos.filter(todo => {
    if (selectedCategory !== 'All' && todo.category !== selectedCategory) return false;
    if (selectedPriority !== 'All' && todo.priority !== selectedPriority) return false;
    if (!showCompleted && todo.isCompleted) return false;
    return true;
  });

  const handleAdd = () => {
    setEditingTodo(null);
    setFormData({ 
      title: '', 
      description: '', 
      priority: 'medium', 
      category: 'Personal', 
      dueDate: '' 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({ 
      title: todo.title, 
      description: todo.description,
      priority: todo.priority,
      category: todo.category,
      dueDate: todo.dueDate ? todo.dueDate.toISOString().slice(0, 16) : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      todoId: id,
      todoTitle: title
    });
  };

  const confirmDelete = async () => {
    if (!isFirebaseAvailable()) return;
    
    try {
      setDeleting(confirmDialog.todoId);
      await deleteDoc(doc(db, 'todos', confirmDialog.todoId));
      setConfirmDialog({ isOpen: false, todoId: '', todoTitle: '' });
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Error deleting todo. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, todoId: '', todoTitle: '' });
  };

  const handleComplete = async (id: string, isCompleted: boolean) => {
    if (!isFirebaseAvailable()) return;
    
    try {
      setUpdating(id);
      await updateDoc(doc(db, 'todos', id), {
        isCompleted: !isCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('Error updating todo. Please try again.');
    } finally {
      setUpdating(null);
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
      const todoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        isCompleted: false,
        ...(formData.dueDate && { dueDate: new Date(formData.dueDate) }),
        updatedAt: serverTimestamp()
      };

      if (editingTodo) {
        // Edit existing todo
        await updateDoc(doc(db, 'todos', editingTodo.id), todoData);
      } else {
        // Add new todo
        const todosCollection = collection(db, 'todos');
        await addDoc(todosCollection, {
          ...todoData,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        category: 'Personal', 
        dueDate: '' 
      });
      setEditingTodo(null);
    } catch (error) {
      console.error('Error saving todo:', error);
      alert('Error saving todo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ 
      title: '', 
      description: '', 
      priority: 'medium', 
      category: 'Personal', 
      dueDate: '' 
    });
    setEditingTodo(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isOverdue = (dueDate: Date) => {
    return new Date() > dueDate;
  };

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || '';
  };

  // Stats
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.isCompleted).length;
  const pendingTodos = totalTodos - completedTodos;
  const overdueTodos = todos.filter(t => !t.isCompleted && t.dueDate && isOverdue(t.dueDate)).length;

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
              Todo List
            </h1>
          </div>
          
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Todo
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTodos}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{completedTodos}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{pendingTodos}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{overdueTodos}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="All">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="All">All Priorities</option>
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Show completed tasks
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Todos List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading todos...</p>
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
              {filteredTodos.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {todos.length === 0 
                    ? 'No todos found. Click "Add Todo" to get started.'
                    : 'No todos match the selected filters.'
                  }
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <div 
                    key={todo.id} 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      todo.isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleComplete(todo.id, todo.isCompleted)}
                          disabled={updating === todo.id}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 ${
                            todo.isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          } ${updating === todo.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updating === todo.id ? (
                            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : todo.isCompleted ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : null}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-lg font-medium ${
                              todo.isCompleted 
                                ? 'line-through text-gray-500 dark:text-gray-400' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {todo.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(todo.priority)}`}>
                              {priorities.find(p => p.value === todo.priority)?.label}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                              {todo.category}
                            </span>
                            {todo.dueDate && isOverdue(todo.dueDate) && !todo.isCompleted && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                                Overdue
                              </span>
                            )}
                          </div>
                          
                          {todo.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-2">
                              {todo.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {todo.createdAt && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Created: {formatDate(todo.createdAt)}
                              </div>
                            )}
                            {todo.dueDate && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Due: {formatDate(todo.dueDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(todo)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id, todo.title)}
                          disabled={deleting === todo.id}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                          title="Delete"
                        >
                          {deleting === todo.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {editingTodo ? 'Edit Todo' : 'Add New Todo'}
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
                  placeholder="Enter todo title"
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
                  placeholder="Enter todo description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
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
                  {editingTodo ? 'Update' : 'Add'} Todo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Todo"
        message={`Are you sure you want to delete "${confirmDialog.todoTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </div>
  );
}
