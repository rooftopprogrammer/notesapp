'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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

export default function ProjectCredentialsClient() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
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
    const authState = localStorage.getItem('businessAuth');
    if (authState === 'authenticated') {
      setIsAuthenticated(true);
    } else {
      // Redirect to business login
      router.push('/business');
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

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
      setError(null);
    }, (error) => {
      console.error('Error fetching credentials:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, projectId]);

  const handleAdd = () => {
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
    setIsModalOpen(true);
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormData({
      username: credential.username,
      password: credential.password,
      siteLink: credential.siteLink || '',
      isPaid: credential.isPaid || false,
      amount: credential.amount?.toString() || '',
      currency: credential.currency || 'INR',
      nextCycle: credential.nextCycle ? credential.nextCycle.toISOString().split('T')[0] : '',
      autoDebit: credential.autoDebit || false,
      notes: credential.notes || '',
      type: credential.type,
      title: credential.title
    });
    setIsModalOpen(true);
  };

  const handleDeleteCredential = (id: string, title: string) => {
    setDeleteConfirm({
      show: true,
      id: id,
      title: title
    });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'businessCredentials', deleteConfirm.id));
      setDeleteConfirm({ show: false, id: '', title: '' });
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Error deleting credential. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, id: '', title: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      alert('Please enter username and password');
      return;
    }

    try {
      setSaving(true);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentialData: Record<string, any> = {
        title: formData.title.trim(),
        type: formData.type,
        username: formData.username.trim(),
        password: formData.password.trim(),
        projectId: projectId,
        updatedAt: serverTimestamp()
      };

      // Only add optional fields if they have values
      if (formData.siteLink.trim()) {
        credentialData.siteLink = formData.siteLink.trim();
      }

      if (formData.isPaid) {
        credentialData.isPaid = true;
        credentialData.autoDebit = formData.autoDebit;
        
        if (formData.currency) {
          credentialData.currency = formData.currency;
        }
        
        if (formData.amount.trim()) {
          credentialData.amount = parseFloat(formData.amount);
        }
      }

      // Only add nextCycle if isPaid is true and nextCycle is provided
      if (formData.isPaid && formData.nextCycle) {
        credentialData.nextCycle = Timestamp.fromDate(new Date(formData.nextCycle));
      }

      // Only add notes if provided
      if (formData.notes.trim()) {
        credentialData.notes = formData.notes.trim();
      }

      if (editingCredential) {
        // Edit existing credential
        await updateDoc(doc(db, 'businessCredentials', editingCredential.id), credentialData);
      } else {
        // Add new credential
        await addDoc(collection(db, 'businessCredentials'), {
          ...credentialData,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
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
      setEditingCredential(null);
    } catch (error) {
      console.error('Error saving credential:', error);
      alert('Error saving credential. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link href="/business/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/business/projects" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block">
            ← Back to Projects
          </Link>
          {project && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  {project.type}
                </span>
                {project.level === 1 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                    Sub-project
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created {project.createdAt?.toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Credentials ({credentials.length})
            </h2>
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Credential
            </button>
          </div>

          <div className="p-6">
            {credentials.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔐</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No credentials yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add your first credential to get started.
                </p>
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
                >
                  Add First Credential
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {credentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {credential.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {credential.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(credential)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(credential.id, credential.title)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Username:</span>
                        <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">{credential.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Password:</span>
                        <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">••••••••</span>
                      </div>
                      {credential.siteLink && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">URL:</span>
                          <a
                            href={credential.siteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                          >
                            {credential.siteLink}
                          </a>
                        </div>
                      )}
                      {credential.isPaid && credential.amount && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                          <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                            {credential.currency} {credential.amount}
                          </span>
                          {credential.autoDebit && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded">
                              Auto-debit
                            </span>
                          )}
                        </div>
                      )}
                      {credential.nextCycle && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Next billing:</span>
                          <span className="ml-2 text-orange-600 dark:text-orange-400">
                            {credential.nextCycle.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {credential.notes && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                          <p className="ml-2 text-gray-700 dark:text-gray-300 text-xs">{credential.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                      Added {credential.createdAt?.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., AWS Console, GitHub"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {CREDENTIAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username/Email *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Username or email"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Password"
                    required
                  />
                </div>

                {/* Site Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site/Application URL
                  </label>
                  <input
                    type="url"
                    value={formData.siteLink}
                    onChange={(e) => setFormData({...formData, siteLink: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Paid Service Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPaid" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    This is a paid service
                  </label>
                </div>

                {/* Payment Details (shown when isPaid is true) */}
                {formData.isPaid && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="99.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({...formData, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      >
                        {CURRENCIES.map(currency => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formData.isPaid && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Next Billing Date
                      </label>
                      <input
                        type="date"
                        value={formData.nextCycle}
                        onChange={(e) => setFormData({...formData, nextCycle: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoDebit"
                        checked={formData.autoDebit}
                        onChange={(e) => setFormData({...formData, autoDebit: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoDebit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Auto-debit enabled
                      </label>
                    </div>
                  </>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Action Buttons */}
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
                    {editingCredential ? 'Update' : 'Add'} Credential
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
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="Delete"
      />
    </div>
  );
}
