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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link href="/business" className="hover:text-blue-600 dark:hover:text-blue-400">Business</Link>
            <span>/</span>
            <Link href="/business/projects" className="hover:text-blue-600 dark:hover:text-blue-400">Projects</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">{project?.name || 'Loading...'}</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">Credentials</span>
          </nav>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project?.name ? `${project.name} - Credentials` : 'Project Credentials'}
              </h1>
              {project?.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{project.description}</p>
              )}
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Credential
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Search credentials..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredCredentials.length} credential{filteredCredentials.length !== 1 ? 's' : ''} matching &ldquo;{searchTerm}&rdquo;
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading credentials...</span>
          </div>
        ) : (
          <>
            {/* Credentials Grid */}
            {credentials.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No credentials</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new credential.</p>
                <div className="mt-6">
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Credential
                  </button>
                </div>
              </div>
            ) : filteredCredentials.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No matching credentials</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search terms or clear the search to see all credentials.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCredentials.map((credential) => (
                  <div key={credential.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{credential.title}</h3>
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                          {credential.type}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(credential)}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, id: credential.id, title: credential.title })}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono text-sm text-gray-900 dark:text-white break-all flex-1">{credential.username}</p>
                          <button
                            onClick={() => copyToClipboard(credential.username, 'Username')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
                            title="Copy username"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Password</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono text-sm text-gray-900 dark:text-white break-all flex-1">
                            {passwordVisibility[credential.id] ? credential.password : '•'.repeat(credential.password.length)}
                          </p>
                          <button
                            onClick={() => copyToClipboard(credential.password, 'Password')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
                            title="Copy password"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => togglePasswordVisibility(credential.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
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

                      {credential.siteLink && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Site</p>
                          <a 
                            href={credential.siteLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                          >
                            {credential.siteLink}
                          </a>
                        </div>
                      )}

                      {credential.isPaid && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">Paid Service</span>
                            {credential.autoDebit && (
                              <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                Auto-debit
                              </span>
                            )}
                          </div>
                          {credential.amount && (
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              {credential.currency} {credential.amount}
                            </p>
                          )}
                          {credential.nextCycle && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Next: {credential.nextCycle.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {credential.notes && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 overflow-hidden">{credential.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {credential.createdAt?.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        {CREDENTIAL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Site Link
                    </label>
                    <input
                      type="url"
                      value={formData.siteLink}
                      onChange={(e) => setFormData({ ...formData, siteLink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid Service</span>
                    </label>
                  </div>

                  {formData.isPaid && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Currency
                        </label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                          {CURRENCIES.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Next Cycle
                        </label>
                        <input
                          type="date"
                          value={formData.nextCycle}
                          onChange={(e) => setFormData({ ...formData, nextCycle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.autoDebit}
                            onChange={(e) => setFormData({ ...formData, autoDebit: e.target.checked })}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-debit enabled</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : (editingCredential ? 'Update' : 'Create')}
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
