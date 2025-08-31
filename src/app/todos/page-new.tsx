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
import { Plus, MoreHorizontal, Folder, Search, X } from 'lucide-react';
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

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Project
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProjectForm({ ...projectForm, color })}
                      className={`w-8 h-8 rounded-full ${color} ${
                        projectForm.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Todo Modal */}
      {isTodoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTodo ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => {
                  setIsTodoModalOpen(false);
                  setEditingTodo(null);
                  setTodoForm({
                    title: '',
                    description: '',
                    status: 'todo',
                    priority: 'medium',
                    dueDate: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTodo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={todoForm.title}
                  onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={todoForm.description}
                  onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={todoForm.status}
                    onChange={(e) => setTodoForm({ ...todoForm, status: e.target.value as 'todo' | 'inprogress' | 'completed' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={todoForm.priority}
                    onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={todoForm.dueDate}
                  onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsTodoModalOpen(false);
                    setEditingTodo(null);
                    setTodoForm({
                      title: '',
                      description: '',
                      status: 'todo',
                      priority: 'medium',
                      dueDate: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTodo ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
