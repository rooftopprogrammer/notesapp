'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Project {
  id: string;
  name: string;
  type: string;
  description?: string;
  parentId?: string; // For sub-projects
  level: number; // 0 = main project, 1 = sub-project
  createdAt?: Date;
  updatedAt?: Date;
}

const PROJECT_TYPES = [
  'Website',
  'Software',
  'Cloud Service',
  'Email',
  'Social Media',
  'Banking',
  'Hosting',
  'Domain',
  'API Service',
  'E-commerce',
  'Mobile App',
  'Desktop App',
  'Other'
];

export default function BusinessProjects() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string, title: string}>({
    show: false,
    id: '',
    title: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'Website',
    description: '',
    parentId: '', // For creating sub-projects
    isSubProject: false
  });
  const [parentProjectForSub, setParentProjectForSub] = useState<Project | null>(null);

  // Check business authentication
  useEffect(() => {
    const checkAuthentication = () => {
      console.log('Checking business authentication...');
      try {
        const savedSession = localStorage.getItem('businessSession');
        console.log('Business session found:', !!savedSession);
        
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const now = new Date().getTime();
          console.log('Session expires at:', new Date(sessionData.expiresAt));
          console.log('Current time:', new Date(now));
          
          // Check if session is valid and not expired
          if (sessionData.expiresAt && now < sessionData.expiresAt) {
            console.log('Session is valid, setting authenticated to true');
            setIsAuthenticated(true);
          } else {
            console.log('Session expired, redirecting to business login');
            // Session expired, redirect to business login
            router.push('/business');
            return;
          }
        } else {
          console.log('No business session found, redirecting to business login');
          router.push('/business');
          return;
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/business');
        return;
      }
      
      setIsCheckingAuth(false);
    };

    checkAuthentication();
  }, [router]);

  // Load projects from Firestore
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseAvailable()) return;

    console.log('Setting up projects listener...');
    const q = query(collection(db, 'businessProjects'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Projects snapshot received, size:', snapshot.size);
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Project[];
      
      setProjects(projectsData);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error loading projects:', error);
      setError('Failed to load projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      type: 'Website',
      description: '',
      parentId: '',
      isSubProject: false
    });
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      type: project.type,
      description: project.description || '',
      parentId: project.parentId || '',
      isSubProject: project.level > 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirm({
      show: true,
      id: id,
      title: title
    });
  };

  const confirmDelete = async () => {
    if (!isFirebaseAvailable()) return;
    
    try {
      await deleteDoc(doc(db, 'businessProjects', deleteConfirm.id));
      setDeleteConfirm({ show: false, id: '', title: '' });
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const handleAddSubProject = (parentProject: Project) => {
    setParentProjectForSub(parentProject);
    setEditingProject(null);
    setFormData({
      name: '',
      type: parentProject.type, // Inherit type from parent
      description: '',
      parentId: parentProject.id,
      isSubProject: true
    });
    setIsModalOpen(true);
  };

  // Get sub-projects for a parent project
  const getSubProjects = (parentId: string) => {
    return projects.filter(project => project.parentId === parentId);
  };

  // Get main projects (no parent)
  const getMainProjects = () => {
    return projects.filter(project => !project.parentId || project.level === 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseAvailable()) return;
    
    if (!formData.name.trim()) {
      alert('Please enter project name');
      return;
    }

    try {
      setSaving(true);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectData: Record<string, any> = {
        name: formData.name.trim(),
        type: formData.type,
        level: formData.isSubProject ? 1 : 0, // 0 = main project, 1 = sub-project
        updatedAt: serverTimestamp()
      };

      // Only add description if provided
      if (formData.description.trim()) {
        projectData.description = formData.description.trim();
      }

      // Add parent ID if this is a sub-project
      if (formData.isSubProject && formData.parentId) {
        projectData.parentId = formData.parentId;
      }

      if (editingProject) {
        // Edit existing project
        await updateDoc(doc(db, 'businessProjects', editingProject.id), projectData);
      } else {
        // Add new project
        await addDoc(collection(db, 'businessProjects'), {
          ...projectData,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'Website',
        description: '',
        parentId: '',
        isSubProject: false
      });
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
            <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Checking authentication...</h3>
            <p className="text-slate-600 dark:text-slate-400">Please wait while we verify your access</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
            <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading projects...</h3>
            <p className="text-slate-600 dark:text-slate-400">Fetching your business projects</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-2xl p-8 border border-white/20 dark:border-gray-700/30 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <Link 
                  href="/business" 
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 font-medium group"
                >
                  <svg className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Business Hub
                </Link>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Business Projects
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">Organize and manage your credentials by projects</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/business/credentials"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Credentials Vault
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
                <Link
                  href="/business/projects/all-credentials"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  List View
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
                <button
                  onClick={handleAdd}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Project
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8">
            <div className="backdrop-blur-xl bg-red-50/80 dark:bg-red-900/30 border border-red-200/50 dark:border-red-800/30 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-1">Error</h3>
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-24 h-24 backdrop-blur-xl bg-slate-100/50 dark:bg-slate-800/50 rounded-full border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center mb-8">
              <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No projects yet</h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">Get started by creating your first project to organize your credentials and manage your business assets.</p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Project
            </button>
            <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              <p>💡 Organize credentials by website, service, or department</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {getMainProjects().map((project) => (
              <div key={project.id} className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                {/* Main Project */}
                <div className="p-8 bg-gradient-to-r from-white/10 to-transparent dark:from-gray-800/10 border-b border-white/20 dark:border-gray-700/30">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 backdrop-blur-sm bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/30 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                            {project.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/30 text-blue-800 dark:text-blue-200 text-sm px-3 py-1 rounded-full font-medium border border-blue-200/50 dark:border-blue-700/50">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {project.type}
                            </span>
                            {getSubProjects(project.id).length > 0 && (
                              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 text-purple-800 dark:text-purple-200 text-sm px-3 py-1 rounded-full font-medium border border-purple-200/50 dark:border-purple-700/50">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {getSubProjects(project.id).length} Sub-projects
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{project.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {project.createdAt && (
                              <span>Created {project.createdAt.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:flex-col lg:w-auto">
                      <Link
                        href={`/business/projects/credentials?projectId=${project.id}`}
                        className="group/btn inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Manage Credentials
                      </Link>
                      <button
                        onClick={() => handleEdit(project)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleAddSubProject(project)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Sub-Project
                      </button>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Projects */}
                {getSubProjects(project.id).length > 0 && (
                  <div className="p-8 bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-800/30 dark:to-slate-900/20 border-t border-white/20 dark:border-gray-700/30">
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">Sub-Projects</h4>
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm px-2 py-1 rounded-full font-medium">
                        {getSubProjects(project.id).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {getSubProjects(project.id).map((subProject) => (
                        <div key={subProject.id} className="group backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/40 dark:border-gray-700/40 p-6 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 backdrop-blur-sm bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 rounded-xl border border-purple-200/50 dark:border-purple-700/50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                                {subProject.name}
                              </h5>
                              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/30 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium border border-slate-200/50 dark:border-slate-600/50">
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                {subProject.type}
                              </span>
                              {subProject.description && (
                                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-2">{subProject.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Link
                              href={`/business/projects/credentials?projectId=${subProject.id}`}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 text-xs min-w-0"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="truncate">Credentials</span>
                            </Link>
                            <button
                              onClick={() => handleEdit(subProject)}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-xs"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(subProject.id, subProject.name)}
                              className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-xs"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 rounded-2xl w-full max-w-lg border border-white/30 dark:border-gray-700/30 shadow-2xl animate-scale-in">
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                      {editingProject 
                        ? 'Edit Project' 
                        : formData.isSubProject 
                          ? `Add Sub-Project` 
                          : 'Add New Project'
                      }
                    </h2>
                    {formData.isSubProject && (
                      <div className="mt-2 p-3 backdrop-blur-sm bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/30 dark:border-purple-700/30">
                        <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
                          Parent: {parentProjectForSub?.name}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Type will be inherited: {parentProjectForSub?.type}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-110"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Information Section */}
                  <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-200/30 dark:border-slate-600/30">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Project Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                          placeholder="Enter project name (e.g., Company Website, Gmail Account)"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Project Type *
                          {formData.isSubProject && (
                            <span className="text-sm text-purple-600 dark:text-purple-400 font-normal ml-1">(Inherited from parent)</span>
                          )}
                        </label>
                        <div className="relative">
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100/50 dark:disabled:bg-slate-700/50 appearance-none"
                            disabled={formData.isSubProject}
                            required
                          >
                            {PROJECT_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200 resize-none"
                          rows={3}
                          placeholder="Project description (optional) - Add notes about what this project encompasses..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200/50 dark:border-slate-600/50">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-700/70 backdrop-blur-sm rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-600/70 transition-all duration-200 font-medium border border-slate-200/50 dark:border-slate-600/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[120px]"
                    >
                      {saving ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingProject ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                          </svg>
                          {editingProject ? 'Update Project' : 'Create Project'}
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button for Mobile */}
        {projects.length > 0 && (
          <button
            onClick={handleAdd}
            className="fixed bottom-6 right-6 lg:hidden group bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 transform hover:scale-110 z-40"
            title="Add Project"
          >
            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.show}
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ show: false, id: '', title: '' })}
        />
      </div>
    </div>
  );
}
