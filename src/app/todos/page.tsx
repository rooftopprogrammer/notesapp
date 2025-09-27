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
import { Plus, MoreHorizontal, Folder, Search, X, Filter, Calendar, User, CheckCircle, Clock, AlertCircle, Zap, Target, TrendingUp } from 'lucide-react';
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
  { id: 'completed', title: 'Completed', color: 'border-green-300', count: 0 },
  { id: 'archived', title: 'Archived', color: 'border-gray-400', count: 0 }
];

export default function TodoPage() {
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500'
  });

  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'inprogress' | 'completed' | 'archived',
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

    // Initialize with default projects immediately for better UX
    setProjects(defaultProjects);
    setSelectedProject(defaultProjects[0]);

    // Load projects
    const projectsCollection = collection(db, 'projects');
    const unsubscribeProjects = onSnapshot(
      projectsCollection, 
      (snapshot) => {
        try {
          if (snapshot.empty) {
            // If no projects exist, keep default projects
            setProjects(defaultProjects);
            if (!selectedProject) {
              setSelectedProject(defaultProjects[0]);
            }
          } else {
            const projectsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
              };
            }) as Project[];
            setProjects(projectsData);
            if (!selectedProject && projectsData.length > 0) {
              setSelectedProject(projectsData[0]);
            }
          }
          setLoading(false);
        } catch (err) {
          console.error('Error processing projects:', err);
          // Fallback to default projects
          setProjects(defaultProjects);
          if (!selectedProject) {
            setSelectedProject(defaultProjects[0]);
          }
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error loading projects:', err);
        setError(`Error loading projects: ${err.message}`);
        // Fallback to default projects
        setProjects(defaultProjects);
        if (!selectedProject) {
          setSelectedProject(defaultProjects[0]);
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProjects();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Load todos for selected project
  useEffect(() => {
    if (!selectedProject || !isFirebaseAvailable()) return;

    const todosCollection = collection(db, 'todos');
    const todosQuery = query(todosCollection, where('projectId', '==', selectedProject.id));
    
    const unsubscribeTodos = onSnapshot(
      todosQuery,
      (snapshot) => {
        try {
          const todosData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : (data.dueDate || null),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
            };
          }) as Todo[];
          

          setTodos(todosData);
        } catch (err) {
          console.error('Error processing todos:', err);
          setTodos([]);
        }
      },
      (err) => {
        console.error('Error loading todos:', err);
        toast.error(`Error loading todos: ${err.message}`);
        setTodos([]);
      }
    );

    return () => {
      unsubscribeTodos();
    };
  }, [selectedProject]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    
    // Add dragging class for visual feedback
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTodo(null);
    setDragOverColumn(null);
    (e.target as HTMLElement).classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the column container, not child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'todo' | 'inprogress' | 'completed' | 'archived') => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTodo || draggedTodo.status === newStatus) {
      setDraggedTodo(null);
      return;
    }

    const originalStatus = draggedTodo.status; // Store original status for error rollback

    console.log('🔄 Moving todo:', draggedTodo.title, 'from', originalStatus, 'to', newStatus);

    try {
      // Update local state optimistically first
      setTodos(prevTodos => {
        const updatedTodos = prevTodos.map(todo => 
          todo.id === draggedTodo.id 
            ? { ...todo, status: newStatus, updatedAt: new Date() }
            : todo
        );
        console.log('✅ Optimistic update complete. New todos count:', updatedTodos.length);
        return updatedTodos;
      });

      // Then update Firestore
      const todoRef = doc(db, 'todos', draggedTodo.id);
      await updateDoc(todoRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      console.log('🔥 Firestore update complete');
      toast.success(`Todo moved to ${newStatus.replace('inprogress', 'in progress')}`);
    } catch (error) {
      console.error('Error updating todo status:', error);
      toast.error('Failed to move todo');
      
      // Revert optimistic update on error
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === draggedTodo.id 
            ? { ...todo, status: originalStatus }
            : todo
        )
      );
    }
    
    setDraggedTodo(null);
  };

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
    completed: filteredTodos.filter(todo => todo.status === 'completed'),
    archived: filteredTodos.filter(todo => todo.status === 'archived')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-white/80 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Task Master</h1>
                <p className="text-white/80">Organize your productivity journey</p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">{projects.length}</div>
                    <div className="text-xs text-white/70">Projects</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">{todos.filter(t => t.status === 'inprogress').length}</div>
                    <div className="text-xs text-white/70">In Progress</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">{todos.filter(t => t.status === 'completed').length}</div>
                    <div className="text-xs text-white/70">Completed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Folder className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </button>
              <button
                onClick={() => setIsTodoModalOpen(true)}
                disabled={!selectedProject}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Modern Sidebar - Projects */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Projects</h2>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-sm font-medium">{projects.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full group flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-200 ${
                      selectedProject?.id === project.id
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-indigo-700 dark:text-indigo-300 shadow-lg border border-indigo-200 dark:border-indigo-700 transform scale-105'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:shadow-md hover:transform hover:scale-102'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${project.color} shadow-lg`}></div>
                    <div className="flex-1">
                      <span className="font-medium truncate block">{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate block mt-1">
                          {project.description}
                        </span>
                      )}
                    </div>
                    <div className="text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1">
                      {todos.filter(t => t.projectId === project.id).length}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
                    <div className="text-xs font-medium text-red-600 dark:text-red-400">
                      {todos.filter(t => t.status === 'todo').length}
                    </div>
                    <div className="text-xs text-red-500/70">To Do</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <Clock className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                    <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {todos.filter(t => t.status === 'inprogress').length}
                    </div>
                    <div className="text-xs text-yellow-500/70">Doing</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">
                      {todos.filter(t => t.status === 'completed').length}
                    </div>
                    <div className="text-xs text-green-500/70">Done</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Main Content */}
          <div className="flex-1">
            {selectedProject ? (
              <>
                {/* Modern Project Header */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 mb-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl ${selectedProject.color} shadow-xl flex items-center justify-center`}>
                        <Folder className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                          {selectedProject.name}
                        </h2>
                        {selectedProject.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-lg">{selectedProject.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Created {new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <TrendingUp className="w-4 h-4" />
                            <span>{todos.filter(t => t.projectId === selectedProject.id).length} tasks total</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-12 pr-4 py-3 w-80 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm shadow-lg"
                        />
                      </div>
                      <button className="p-3 bg-white/50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 backdrop-blur-sm shadow-lg">
                        <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modern Kanban Board */}
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-8">
                  {updatedColumns.map((column, index) => (
                    <div 
                      key={column.id} 
                      className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden transition-all duration-200 ${
                        dragOverColumn === column.id 
                          ? 'border-blue-400 shadow-2xl shadow-blue-500/30 scale-105' 
                          : ''
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id as 'todo' | 'inprogress' | 'completed' | 'archived')}
                    >
                      {/* Modern Column Header */}
                      <div className={`bg-gradient-to-r ${
                        column.id === 'todo' ? 'from-red-500 to-pink-500' :
                        column.id === 'inprogress' ? 'from-yellow-500 to-orange-500' :
                        column.id === 'completed' ? 'from-green-500 to-emerald-500' :
                        'from-gray-500 to-slate-500'
                      } p-6`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {column.id === 'todo' && <AlertCircle className="w-6 h-6 text-white" />}
                            {column.id === 'inprogress' && <Clock className="w-6 h-6 text-white" />}
                            {column.id === 'completed' && <CheckCircle className="w-6 h-6 text-white" />}
                            {column.id === 'archived' && (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                            <h3 className="text-xl font-bold text-white">{column.title}</h3>
                          </div>
                          <div className={`bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 transition-all ${
                            dragOverColumn === column.id ? 'animate-pulse scale-110' : ''
                          }`}>
                            <span className="text-white font-bold">{column.count}</span>
                          </div>
                          {dragOverColumn === column.id && (
                            <div className="animate-bounce ml-2">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Modern Todo Items */}
                      <div className="p-6 space-y-4 min-h-[500px]">
                        {todosByStatus[column.id].map((todo, todoIndex) => (
                          <div
                            key={todo.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, todo)}
                            onDragEnd={handleDragEnd}
                            className={`group relative ${
                              todo.status === 'archived' 
                                ? 'bg-gray-200/60 dark:bg-gray-800/60 opacity-75' 
                                : 'bg-white/80 dark:bg-gray-700/80'
                            } backdrop-blur-sm rounded-2xl p-5 border ${
                              todo.status === 'archived'
                                ? 'border-gray-300/40 dark:border-gray-600/40'
                                : 'border-white/20 dark:border-gray-600/30'
                            } hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-move hover:transform hover:scale-105 select-none ${
                              draggedTodo?.id === todo.id ? 'opacity-50 rotate-2 scale-105 shadow-2xl shadow-blue-500/50' : ''
                            }`}
                            onClick={(e) => {
                              // Prevent click when dragging
                              if (draggedTodo) return;
                              setViewingTodo(todo);
                              setIsViewModalOpen(true);
                            }}
                            style={{ animationDelay: `${todoIndex * 0.05}s` }}
                          >
                            {/* Priority Indicator */}
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${
                              todo.priority === 'high' ? 'bg-red-500' :
                              todo.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1 line-clamp-2">
                                  {todo.title}
                                </h4>
                                {todo.description && (
                                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                                    {todo.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditTodo(todo);
                                  }}
                                  className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                  title="Edit todo"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <div className="cursor-move p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600" title="Drag to move">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add menu options here
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  todo.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                  todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {todo.priority === 'high' && <Zap className="w-3 h-3 mr-1" />}
                                  {todo.priority === 'medium' && <AlertCircle className="w-3 h-3 mr-1" />}
                                  {todo.priority === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {todo.priority}
                                </span>
                                {todo.status === 'archived' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    Archived
                                  </span>
                                )}
                              </div>
                              
                              {todo.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-lg">
                                  <Calendar className="w-3 h-3" />
                                  {todo.dueDate.toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            {/* Modern Action Buttons */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {column.id !== 'todo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'todo');
                                  }}
                                  className="flex-1 text-xs px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors font-medium"
                                >
                                  ← To Do
                                </button>
                              )}
                              {column.id === 'todo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'inprogress');
                                  }}
                                  className="flex-1 text-xs px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors font-medium"
                                >
                                  ▶ Start
                                </button>
                              )}
                              {column.id === 'inprogress' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTodoStatus(todo.id, 'completed');
                                  }}
                                  className="flex-1 text-xs px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium"
                                >
                                  ✓ Complete
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTodo(todo.id);
                                }}
                                className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Drop Zone Indicator */}
                        {dragOverColumn === column.id && todosByStatus[column.id].length === 0 && (
                          <div className="border-2 border-dashed border-blue-400 rounded-2xl p-8 text-center bg-blue-50/50 dark:bg-blue-900/20 animate-pulse">
                            <div className="animate-bounce mb-2">
                              <svg className="w-8 h-8 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <p className="text-blue-600 dark:text-blue-400 font-medium">Drop todo here</p>
                          </div>
                        )}
                        
                        {/* Add Task Button */}
                        <button
                          onClick={() => setIsTodoModalOpen(true)}
                          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all duration-200 flex items-center justify-center gap-2 group"
                        >
                          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">Add new task</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-16 text-center">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl p-8 mb-8 inline-block">
                  <Folder className="w-20 h-20 text-indigo-500 mx-auto" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Ready to Get Organized?
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  Select a project from the sidebar or create your first project to start managing your tasks like a pro.
                </p>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg"
                >
                  Create Your First Project
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
                    onChange={(e) => setTodoForm({ ...todoForm, status: e.target.value as 'todo' | 'inprogress' | 'completed' | 'archived' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
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

      {/* View Todo Modal */}
      {isViewModalOpen && viewingTodo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-8 rounded-full ${
                  viewingTodo.priority === 'high' ? 'bg-red-500' :
                  viewingTodo.priority === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {viewingTodo.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      viewingTodo.status === 'todo' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      viewingTodo.status === 'inprogress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      viewingTodo.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {viewingTodo.status === 'todo' ? 'To Do' :
                       viewingTodo.status === 'inprogress' ? 'In Progress' :
                       viewingTodo.status === 'completed' ? 'Completed' : 'Archived'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      viewingTodo.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      viewingTodo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {viewingTodo.priority.charAt(0).toUpperCase() + viewingTodo.priority.slice(1)} Priority
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditTodo(viewingTodo);
                  }}
                  className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Edit Todo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingTodo(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              {viewingTodo.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {viewingTodo.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Due Date */}
              {viewingTodo.dueDate && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Due Date</h3>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5" />
                    <span>{new Date(viewingTodo.dueDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</h4>
                  <p className="text-gray-900 dark:text-white">
                    {viewingTodo.createdAt.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</h4>
                  <p className="text-gray-900 dark:text-white">
                    {viewingTodo.updatedAt.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingTodo(null);
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditTodo(viewingTodo);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
