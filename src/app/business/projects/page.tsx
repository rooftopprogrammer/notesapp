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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/business" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block">
                ← Back to Business Hub
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Business Projects</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Organize your credentials by projects</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/business/credentials"
                className="bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Credentials Vault
              </Link>
              <Link
                href="/business/projects/all-credentials"
                className="bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                List View
              </Link>
              <button
                onClick={handleAdd}
                className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">No projects found</div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {getMainProjects().map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md">
                {/* Main Project */}
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mb-3">
                        {project.type}
                      </span>
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-500">
                      {project.createdAt && (
                        <span>Created {project.createdAt.toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/business/projects/credentials?projectId=${project.id}`}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Manage Credentials
                      </Link>
                      <button
                        onClick={() => handleEdit(project)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit Project
                      </button>
                      <button
                        onClick={() => handleAddSubProject(project)}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                      >
                        Add Sub-Project
                      </button>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Projects */}
                {getSubProjects(project.id).length > 0 && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="text-lg font-medium text-gray-700 mb-3">Sub-Projects</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getSubProjects(project.id).map((subProject) => (
                        <div key={subProject.id} className="bg-white rounded-lg shadow-sm p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="text-md font-medium text-gray-800 mb-1">{subProject.name}</h5>
                              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                {subProject.type}
                              </span>
                              {subProject.description && (
                                <p className="text-gray-600 text-xs mt-2">{subProject.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Link
                              href={`/business/projects/credentials?projectId=${subProject.id}`}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors flex-1 text-center"
                            >
                              Credentials
                            </Link>
                            <button
                              onClick={() => handleEdit(subProject)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors flex-1 text-center"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(subProject.id, subProject.name)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Del
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {editingProject 
                        ? 'Edit Project' 
                        : formData.isSubProject 
                          ? `Add Sub-Project to "${parentProjectForSub?.name}"` 
                          : 'Add New Project'
                      }
                    </h2>
                    {formData.isSubProject && (
                      <p className="text-sm text-gray-600 mt-1">
                        Type will be inherited from parent project ({parentProjectForSub?.type})
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type *
                      {formData.isSubProject && (
                        <span className="text-sm text-gray-500 font-normal"> (Inherited from parent)</span>
                      )}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={formData.isSubProject}
                      required
                    >
                      {PROJECT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Project description (optional)"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : (editingProject ? 'Update' : 'Add')} Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
