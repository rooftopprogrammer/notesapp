'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';

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

interface Credential {
  id: string;
  title: string;
  type: string;
  username: string;
  password: string;
  siteLink?: string;
  isPaid?: boolean;
  amount?: number;
  currency?: string;
  nextCycle?: Date;
  autoDebit?: boolean;
  notes?: string;
  projectId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CREDENTIAL_TYPES = ['Website', 'Application', 'Database', 'Server', 'API', 'Other'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

function ProjectCredentialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [filteredCredentials, setFilteredCredentials] = useState<Credential[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string, title: string}>({
    show: false,
    id: '',
    title: ''
  });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    siteLink: '',
    isPaid: false,
    amount: '',
    currency: 'INR',
    nextCycle: '',
    autoDebit: false,
    notes: '',
    type: 'Website',
    title: ''
  });

  // Check authentication
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

  // Check if projectId is provided
  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided');
      return;
    }
  }, [projectId]);

  // Load project details
  useEffect(() => {
    if (!isAuthenticated || !projectId || !isFirebaseAvailable()) return;

    const loadProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, 'businessProjects', projectId));
        if (projectDoc.exists()) {
          const projectData = {
            id: projectDoc.id,
            ...projectDoc.data(),
            createdAt: projectDoc.data().createdAt?.toDate(),
            updatedAt: projectDoc.data().updatedAt?.toDate()
          } as Project;
          setProject(projectData);
        } else {
          setError('Project not found');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        setError('Failed to load project details');
      }
    };

    loadProject();
  }, [isAuthenticated, projectId]);

  // Load credentials for this project
  useEffect(() => {
    if (!isAuthenticated || !projectId) return;

    console.log('Setting up credentials listener for project:', projectId);
    const q = query(
      collection(db, 'businessCredentials'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Credentials snapshot received, size:', snapshot.size);
      const credentialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nextCycle: doc.data().nextCycle?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Credential[];
      
      setCredentials(credentialsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading credentials:', error);
      setError('Failed to load credentials');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, projectId]);

  // Filter credentials based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCredentials(credentials);
    } else {
      const filtered = credentials.filter(credential => 
        (credential.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (credential.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (credential.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (credential.siteLink || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (credential.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCredentials(filtered);
    }
  }, [credentials, searchTerm]);

  const togglePasswordVisibility = (credentialId: string) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text || text.trim() === '') {
      toast.error(`No ${fieldName.toLowerCase()} to copy`);
      return;
    }

    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(`${fieldName} copied to clipboard!`, {
          icon: '📋',
        });
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success(`${fieldName} copied to clipboard!`, {
            icon: '📋',
          });
        } else {
          throw new Error('Copy command was unsuccessful');
        }
      }
    } catch (error) {
      console.error('Failed to copy text: ', error);
      toast.error(`Failed to copy ${fieldName.toLowerCase()}. Please copy manually.`, {
        icon: '❌',
        duration: 4000,
      });
    }
  };

  const openModal = (credential?: Credential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        username: credential.username || '',
        password: credential.password || '',
        siteLink: credential.siteLink || '',
        isPaid: credential.isPaid || false,
        amount: credential.amount?.toString() || '',
        currency: credential.currency || 'INR',
        nextCycle: credential.nextCycle ? credential.nextCycle.toISOString().split('T')[0] : '',
        autoDebit: credential.autoDebit || false,
        notes: credential.notes || '',
        type: credential.type || 'Website',
        title: credential.title || ''
      });
    } else {
      setEditingCredential(null);
      setFormData({
        username: '',
        password: '',
        siteLink: '',
        isPaid: false,
        amount: '',
        currency: 'INR',
        nextCycle: '',
        autoDebit: false,
        notes: '',
        type: 'Website',
        title: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCredential(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    
    setSaving(true);
    setError(null);

    try {
      const credentialData = {
        title: formData.title,
        type: formData.type,
        username: formData.username,
        password: formData.password,
        siteLink: formData.siteLink || null,
        isPaid: formData.isPaid,
        amount: formData.isPaid && formData.amount ? parseFloat(formData.amount) : null,
        currency: formData.isPaid ? formData.currency : null,
        nextCycle: formData.isPaid && formData.nextCycle ? Timestamp.fromDate(new Date(formData.nextCycle)) : null,
        autoDebit: formData.isPaid ? formData.autoDebit : false,
        notes: formData.notes || null,
        projectId: projectId,
        updatedAt: serverTimestamp()
      };

      if (editingCredential) {
        await updateDoc(doc(db, 'businessCredentials', editingCredential.id), credentialData);
      } else {
        await addDoc(collection(db, 'businessCredentials'), {
          ...credentialData,
          createdAt: serverTimestamp()
        });
      }

      closeModal();
    } catch (error) {
      console.error('Error saving credential:', error);
      setError('Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'businessCredentials', deleteConfirm.id));
      setDeleteConfirm({ show: false, id: '', title: '' });
    } catch (error) {
      console.error('Error deleting credential:', error);
      setError('Failed to delete credential');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">No Project Selected</h3>
            <p className="mt-2 text-red-700 dark:text-red-300">
              Please select a project from the projects page to manage its credentials.
            </p>
            <Link 
              href="/business/projects"
              className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-xl">
            <nav className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
              <Link href="/business" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Business
              </Link>
              <span className="text-slate-400">/</span>
              <Link href="/business/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Projects
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">{project?.name || 'Loading...'}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Credentials
              </span>
            </nav>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                  {project?.name ? `${project.name} - Credentials` : 'Project Credentials'}
                </h1>
                {project?.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-lg">{project.description}</p>
                )}
              </div>
              <button
                onClick={() => openModal()}
                className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Credential
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-12 py-3 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-lg transition-all duration-200"
                placeholder="Search credentials..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center group"
                >
                  <svg className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-4 p-3 backdrop-blur-sm bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/30 dark:border-blue-700/30">
                <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Found {filteredCredentials.length} credential{filteredCredentials.length !== 1 ? 's' : ''} matching <span className="font-medium">&ldquo;{searchTerm}&rdquo;</span>
                </p>
              </div>
            )}
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

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
              <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading credentials...</h3>
              <p className="text-slate-600 dark:text-slate-400">Please wait while we fetch your secure data</p>
            </div>
          </div>
        ) : (
          <>
            {/* Credentials Grid */}
            {credentials.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto w-24 h-24 backdrop-blur-xl bg-slate-100/50 dark:bg-slate-800/50 rounded-full border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No credentials yet</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">Get started by creating your first credential to keep your login information secure and organized.</p>
                <div className="space-y-4">
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Credential
                  </button>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <p>💡 Store passwords, API keys, and access tokens securely</p>
                  </div>
                </div>
              </div>
            ) : filteredCredentials.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-20 h-20 backdrop-blur-xl bg-amber-100/50 dark:bg-amber-900/30 rounded-full border border-amber-200/50 dark:border-amber-700/50 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No matching credentials</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">We couldn't find any credentials matching your search. Try adjusting your search terms or clear the search to see all credentials.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Search
                  </button>
                  <span className="text-slate-400 dark:text-slate-500">or</span>
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Credential
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCredentials.map((credential) => (
                  <div key={credential.id} className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-6 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">{credential.title}</h3>
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-800 dark:text-blue-200 text-xs px-3 py-1 rounded-full font-medium border border-blue-200/50 dark:border-blue-700/50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                          {credential.type}
                        </span>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => openModal(credential)}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Edit credential"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, id: credential.id, title: credential.title })}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Delete credential"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/30 dark:border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Username</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm text-slate-900 dark:text-white break-all flex-1 py-1">{credential.username}</p>
                          <button
                            onClick={() => copyToClipboard(credential.username, 'Username')}
                            className="ml-2 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Copy username"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/30 dark:border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Password</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm text-slate-900 dark:text-white break-all flex-1 py-1">
                            {passwordVisibility[credential.id] ? credential.password : '•'.repeat(credential.password.length)}
                          </p>
                          <div className="flex ml-2 gap-1">
                            <button
                              onClick={() => copyToClipboard(credential.password, 'Password')}
                              className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Copy password"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => togglePasswordVisibility(credential.id)}
                              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:scale-110"
                              title={passwordVisibility[credential.id] ? 'Hide password' : 'Show password'}
                            >
                              {passwordVisibility[credential.id] ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122L15 15m-3-3l3-3m-3 3l-3 3" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {credential.siteLink && (
                        <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/30 dark:border-slate-600/30">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Website</p>
                          </div>
                          <a 
                            href={credential.siteLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm break-all inline-flex items-center gap-1 hover:gap-2 transition-all duration-200"
                          >
                            {credential.siteLink}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {credential.isPaid && (
                        <div className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/20 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-700/30 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Paid Service</span>
                            </div>
                            {credential.autoDebit && (
                              <span className="text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-full font-medium border border-emerald-300/50 dark:border-emerald-600/50">
                                Auto-debit
                              </span>
                            )}
                          </div>
                          {credential.amount && (
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                              {credential.currency} {credential.amount}
                            </p>
                          )}
                          {credential.nextCycle && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Next: {credential.nextCycle.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {credential.notes && (
                        <div className="backdrop-blur-sm bg-amber-50/50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200/30 dark:border-amber-700/30">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Notes</p>
                          </div>
                          <p className="text-sm text-amber-700 dark:text-amber-200 line-clamp-2 overflow-hidden leading-relaxed">{credential.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-600/50">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Created: {credential.createdAt?.toLocaleDateString()}
                        </div>
                        {credential.updatedAt && credential.updatedAt.getTime() !== credential.createdAt?.getTime() && (
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Updated: {credential.updatedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/30 dark:border-gray-700/30 shadow-2xl animate-scale-in">
              <div className="overflow-y-auto max-h-[90vh]">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {editingCredential ? 'Update the credential details below' : 'Fill in the details to create a new credential'}
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-110"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-200/30 dark:border-slate-600/30">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                            placeholder="e.g., Gmail Account"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Type *
                          </label>
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                            required
                          >
                            {CREDENTIAL_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Login Credentials Section */}
                    <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-200/30 dark:border-slate-600/30">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Login Credentials
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                            placeholder="Enter username or email"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                            placeholder="Enter password"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={formData.siteLink}
                          onChange={(e) => setFormData({ ...formData, siteLink: e.target.value })}
                          className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    {/* Paid Service Section */}
                    <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-200/30 dark:border-slate-600/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Billing Information
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isPaid}
                            onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Paid Service</span>
                        </label>
                      </div>

                      {formData.isPaid && (
                        <div className="space-y-4 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200/30 dark:border-emerald-700/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                                Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-emerald-300/50 dark:border-emerald-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 dark:text-white transition-all duration-200"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                                Currency
                              </label>
                              <select
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-emerald-300/50 dark:border-emerald-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 dark:text-white transition-all duration-200"
                              >
                                {CURRENCIES.map(currency => (
                                  <option key={currency} value={currency}>{currency}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                                Next Billing Cycle
                              </label>
                              <input
                                type="date"
                                value={formData.nextCycle}
                                onChange={(e) => setFormData({ ...formData, nextCycle: e.target.value })}
                                className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-emerald-300/50 dark:border-emerald-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 dark:text-white transition-all duration-200"
                              />
                            </div>
                          </div>

                          <label className="flex items-center space-x-3 pt-2">
                            <input
                              type="checkbox"
                              checked={formData.autoDebit}
                              onChange={(e) => setFormData({ ...formData, autoDebit: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 bg-white border-emerald-300 rounded focus:ring-emerald-500 focus:ring-2 dark:bg-gray-800 dark:border-emerald-600"
                            />
                            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Auto-debit enabled</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    <div className="backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-200/30 dark:border-slate-600/30">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Additional Notes
                      </h3>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border border-slate-300/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white transition-all duration-200 resize-none"
                        placeholder="Add any additional notes, recovery information, or special instructions..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200/50 dark:border-slate-600/50">
                      <button
                        type="button"
                        onClick={closeModal}
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingCredential ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                            </svg>
                            {editingCredential ? 'Update Credential' : 'Create Credential'}
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button for Mobile */}
        {credentials.length > 0 && (
          <button
            onClick={() => openModal()}
            className="fixed bottom-6 right-6 lg:hidden group bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 transform hover:scale-110 z-40"
            title="Add Credential"
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
          title="Delete Credential"
          message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm({ show: false, id: '', title: '' })}
          confirmText="Delete"
          type="danger"
        />
      </div>
    </div>
  );
}

export default function ProjectCredentials() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ProjectCredentialsContent />
    </Suspense>
  );
}
