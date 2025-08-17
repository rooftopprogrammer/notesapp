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
import { db } from '@/lib/firebase';
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
  projectId: string;
  type: string;
  username: string;
  password: string;
  siteLink: string;
  isPaid: boolean;
  amount?: number;
  currency: string;
  nextCycle?: Date;
  autoDebit: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export default function ProjectCredentials() {
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
    notes: ''
  });

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

  // Load project details
  useEffect(() => {
    if (!isAuthenticated || !projectId) return;

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
        setError('Failed to load project');
      }
    };

    loadProject();
  }, [isAuthenticated, projectId]);

  // Load credentials from Firestore
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
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        nextCycle: doc.data().nextCycle?.toDate()
      })) as Credential[];
      
      setCredentials(credentialsData);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error loading credentials:', error);
      setError('Failed to load credentials');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, projectId]);

  const handleAdd = () => {
    if (!project) return;
    
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
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormData({
      username: credential.username,
      password: credential.password,
      siteLink: credential.siteLink,
      isPaid: credential.isPaid,
      amount: credential.amount?.toString() || '',
      currency: credential.currency,
      nextCycle: credential.nextCycle ? credential.nextCycle.toISOString().split('T')[0] : '',
      autoDebit: credential.autoDebit,
      notes: credential.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, username: string) => {
    setDeleteConfirm({
      show: true,
      id: id,
      title: username
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      alert('Please enter username and password');
      return;
    }

    if (!project) {
      alert('Project not found');
      return;
    }

    try {
      setSaving(true);
      
      // Build credential data object without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentialData: Record<string, any> = {
        projectId: projectId,
        type: project.type, // Use project type
        username: formData.username.trim(),
        password: formData.password.trim(),
        siteLink: formData.siteLink.trim(),
        isPaid: formData.isPaid,
        currency: formData.currency,
        autoDebit: formData.autoDebit,
        updatedAt: serverTimestamp()
      };

      // Only add amount if isPaid is true and amount is provided
      if (formData.isPaid && formData.amount) {
        credentialData.amount = parseFloat(formData.amount);
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
        notes: ''
      });
      setEditingCredential(null);
    } catch (error) {
      console.error('Error saving credential:', error);
      alert('Error saving credential. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${field} copied to clipboard!`);
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDaysUntilNextCycle = (nextCycle: Date) => {
    const now = new Date();
    const diffTime = nextCycle.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading credentials...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Project not found</div>
          <Link 
            href="/business/projects" 
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/business/projects" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
                ← Back to Projects
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {project.type}
                </span>
                {project.description && (
                  <p className="text-gray-600">{project.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Credential
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Credentials Grid */}
        {credentials.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No credentials found for this project</div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Credential
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((credential) => (
              <div key={credential.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{credential.username}</h3>
                      <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full mb-3">
                        {credential.type}
                      </span>
                      
                      {credential.siteLink && (
                        <div className="mb-3">
                          <a 
                            href={credential.siteLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm break-all"
                          >
                            {credential.siteLink}
                          </a>
                        </div>
                      )}

                      {credential.isPaid && credential.amount && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Cost:</span> {formatCurrency(credential.amount, credential.currency)}
                            {credential.autoDebit && <span className="text-orange-600 ml-2">(Auto-debit)</span>}
                          </div>
                          {credential.nextCycle && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Next cycle:</span> {credential.nextCycle.toLocaleDateString()}
                              {(() => {
                                const days = getDaysUntilNextCycle(credential.nextCycle);
                                if (days < 0) return <span className="text-red-600 ml-2">(Overdue)</span>;
                                if (days <= 7) return <span className="text-orange-600 ml-2">(Due soon)</span>;
                                return <span className="text-green-600 ml-2">({days} days)</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {credential.notes && (
                        <div className="mb-3">
                          <p className="text-gray-600 text-sm"><span className="font-medium">Notes:</span> {credential.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 w-20">Username:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1 break-all">{credential.username}</code>
                      <button 
                        onClick={() => copyToClipboard(credential.username, 'Username')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 w-20">Password:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">••••••••</code>
                      <button 
                        onClick={() => copyToClipboard(credential.password, 'Password')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      {credential.createdAt && (
                        <span>Added {credential.createdAt.toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(credential)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(credential.id, credential.username)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Credential Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <input
                      type="text"
                      value={project.type}
                      disabled
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Type is inherited from project</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Link
                    </label>
                    <input
                      type="url"
                      value={formData.siteLink}
                      onChange={(e) => setFormData({...formData, siteLink: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPaid" className="ml-2 block text-sm text-gray-900">
                      This is a paid service
                    </label>
                  </div>

                  {formData.isPaid && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Currency
                          </label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {CURRENCIES.map(currency => (
                              <option key={currency} value={currency}>{currency}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Next Billing Cycle
                        </label>
                        <input
                          type="date"
                          value={formData.nextCycle}
                          onChange={(e) => setFormData({...formData, nextCycle: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        <label htmlFor="autoDebit" className="ml-2 block text-sm text-gray-900">
                          Auto-debit enabled
                        </label>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Additional notes (optional)"
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
                      {saving ? 'Saving...' : (editingCredential ? 'Update' : 'Add')} Credential
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
          message={`Are you sure you want to delete the credential for "${deleteConfirm.title}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ show: false, id: '', title: '' })}
        />
      </div>
    </div>
  );
}
