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
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Credential {
  id: string;
  title: string;
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

const CREDENTIAL_TYPES = [
  'Website',
  'Software',
  'Cloud Service',
  'Email',
  'Social Media',
  'Banking',
  'Hosting',
  'Domain',
  'API Service',
  'Other'
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

export default function BusinessCredentials() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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
    title: '',
    type: 'Website',
    username: '',
    password: '',
    siteLink: '',
    isPaid: false,
    amount: '',
    currency: 'USD',
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
          console.log('No session found, redirecting to business login');
          // No session, redirect to business login
          router.push('/business');
          return;
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/business');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [router]);

  // Load credentials from Firestore only if authenticated
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseAvailable()) return;
    
    console.log('Starting to load credentials from Firestore...');
    const credentialsCollection = collection(db, 'businessCredentials');
    
    const unsubscribe = onSnapshot(credentialsCollection, (snapshot) => {
      console.log('Firestore snapshot received:', snapshot.size, 'documents');
      const credentialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nextCycle: doc.data().nextCycle?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Credential[];
      
      console.log('Processed credentials data:', credentialsData);
      setCredentials(credentialsData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return 0;
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching credentials:', error);
      setError('Failed to connect to database. Please ensure Firestore is enabled.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleAdd = () => {
    setEditingCredential(null);
    setFormData({
      title: '',
      type: 'Website',
      username: '',
      password: '',
      siteLink: '',
      isPaid: false,
      amount: '',
      currency: 'USD',
      nextCycle: '',
      autoDebit: false,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormData({
      title: credential.title || '',
      type: credential.type,
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
      await deleteDoc(doc(db, 'businessCredentials', deleteConfirm.id));
      setDeleteConfirm({ show: false, id: '', title: '' });
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Error deleting credential. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseAvailable()) return;
    
    if (!formData.username.trim() || !formData.password.trim()) {
      alert('Please enter username and password');
      return;
    }

    try {
      setSaving(true);
      
      // Build credential data object without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentialData: Record<string, any> = {
        title: formData.title.trim(),
        type: formData.type,
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
        title: '',
        type: 'Website',
        username: '',
        password: '',
        siteLink: '',
        isPaid: false,
        amount: '',
        currency: 'USD',
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
      // Create a temporary toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg z-50 animate-fade-in';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          ${field} copied to clipboard!
        </div>
      `;
      document.body.appendChild(toast);
      
      // Remove toast after 2 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    }).catch(() => {
      alert(`Failed to copy ${field}. Please try again.`);
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Website': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Software': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Cloud Service': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      'Email': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Social Media': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'Banking': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Hosting': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Domain': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'API Service': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return colors[type] || colors['Other'];
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      'Website': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" /></svg>,
      'Software': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" /></svg>,
      'Cloud Service': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" /></svg>,
      'Email': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>,
      'Social Media': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>,
      'Banking': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>,
      'Hosting': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" /><path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1v4.5a1.5 1.5 0 01-3 0V7z" /></svg>,
      'Domain': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.122l1.027 1.027a4 4 0 01-2.171.102l-.47-.1a4 4 0 01-2.53 0l-.469.1a4 4 0 01-2.172-.102l1.027-1.027A3 3 0 009 8.172z" clipRule="evenodd" /></svg>,
      'API Service': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>,
      'Other': <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
    };
    return icons[type] || icons['Other'];
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to business login if not authenticated (handled in useEffect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Redirecting to business login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Database Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/30 dark:to-purple-900/30">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-white/20 dark:border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <Link 
                href="/business" 
                className="group flex items-center gap-2 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-all duration-300 font-medium"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                Back to Business Hub
              </Link>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Credentials Vault
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Secure access management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {credentials.length} {credentials.length === 1 ? 'Credential' : 'Credentials'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {credentials.filter(c => c.isPaid).length} paid services
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <div className="relative flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Credential
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {credentials.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your Vault is Empty</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Start securing your business credentials and subscription details in one protected space
            </p>
            <button
              onClick={handleAdd}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Create Your First Credential
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="group p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{credentials.length}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Total Credentials</div>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{credentials.filter(c => c.isPaid).length}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Paid Services</div>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{credentials.filter(c => c.autoDebit).length}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Auto-debit Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {credentials.map((credential, index) => (
                <div 
                  key={credential.id} 
                  className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-900/10 dark:hover:shadow-black/20 hover:scale-[1.02] animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Card Gradient Overlay */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent via-transparent to-slate-900/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(credential.type)}`}>
                            {getTypeIcon(credential.type)}
                            {credential.type}
                          </span>
                          {credential.isPaid && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                              </svg>
                              Paid
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                          {credential.title || credential.username}
                        </h3>
                        {credential.title && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{credential.username}</p>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={() => handleEdit(credential)}
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-300 hover:scale-110"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(credential.id, credential.title || credential.username)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-300 hover:scale-110"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="space-y-4">
                      <div className="group/field">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Username</label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 group-hover/field:bg-slate-100/80 dark:group-hover/field:bg-slate-900/60 transition-all duration-300 backdrop-blur-sm">
                          <span className="flex-1 text-sm text-slate-900 dark:text-white font-mono truncate">{credential.username}</span>
                          <button
                            onClick={() => copyToClipboard(credential.username, 'Username')}
                            className="group/copy p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-500 hover:text-white text-slate-400 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm"
                            title="Copy username"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="group/field">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Password</label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 group-hover/field:bg-slate-100/80 dark:group-hover/field:bg-slate-900/60 transition-all duration-300 backdrop-blur-sm">
                          <span className="flex-1 text-sm text-slate-900 dark:text-white font-mono truncate">{credential.password}</span>
                          <button
                            onClick={() => copyToClipboard(credential.password, 'Password')}
                            className="group/copy p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-500 hover:text-white text-slate-400 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm"
                            title="Copy password"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {credential.siteLink && (
                        <div className="group/field">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Site Link</label>
                          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 group-hover/field:bg-slate-100/80 dark:group-hover/field:bg-slate-900/60 transition-all duration-300 backdrop-blur-sm">
                            <a
                              href={credential.siteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium group/link transition-all duration-300"
                            >
                              <span className="truncate">{credential.siteLink}</span>
                              <svg className="w-4 h-4 opacity-50 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    {credential.isPaid && (
                      <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Payment Details</span>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                            credential.autoDebit 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {credential.autoDebit ? (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Auto-debit ON
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Manual Payment
                              </>
                            )}
                          </span>
                        </div>
                        
                        {credential.amount && (
                          <div className="mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                              {formatCurrency(credential.amount, credential.currency)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">per billing cycle</div>
                          </div>
                        )}

                        {credential.nextCycle && (
                          <div className="p-5 bg-gradient-to-br from-slate-50/80 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Next Billing
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{credential.nextCycle.toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${getDaysUntilNextCycle(credential.nextCycle) <= 7 ? 'text-red-600 dark:text-red-400' : getDaysUntilNextCycle(credential.nextCycle) <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                  {getDaysUntilNextCycle(credential.nextCycle)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">days remaining</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {credential.notes && (
                      <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Notes
                        </label>
                        <div className="p-4 bg-gradient-to-br from-slate-50/70 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{credential.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Effect Indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-b-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {credentials.length > 0 && (
        <button
          onClick={handleAdd}
          className="fixed bottom-8 right-8 group bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-40"
          title="Add new credential"
        >
          <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
          <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
        
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgb(148 163 184) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(148 163 184);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(100 116 139);
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full max-w-3xl max-h-[90vh] overflow-hidden transform animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                  </h2>
                  <p className="text-emerald-100 text-sm mt-1">
                    {editingCredential ? 'Update your credential information' : 'Secure your new credential details'}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Basic Information</h3>
                  </div>

                  {/* Title */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                      placeholder="e.g., Apple iCloud, GitHub Pro, AWS Console"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Service Type *
                    </label>
                    <div className="relative">
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white appearance-none cursor-pointer transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                        required
                      >
                        {CREDENTIAL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Login Credentials Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Login Credentials</h3>
                  </div>

                  {/* Username and Password */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 font-mono transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                        placeholder="Enter username or email"
                        required
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Password *
                      </label>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 font-mono transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                  </div>

                  {/* Site Link */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.siteLink}
                      onChange={(e) => setFormData({...formData, siteLink: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Payment Configuration Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Payment Configuration</h3>
                  </div>

                  {/* Payment Toggle */}
                  <div className="group p-6 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
                    <label className="flex items-center gap-4 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isPaid}
                          onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                          className="sr-only"
                        />
                        <div className={`w-14 h-8 rounded-full transition-all duration-300 ${formData.isPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-all duration-300 mt-1 ${formData.isPaid ? 'translate-x-7' : 'translate-x-1'}`}></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Paid Service</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Enable if this service requires payment</div>
                      </div>
                    </label>
                  </div>

                  {formData.isPaid && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="p-6 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-2xl border-2 border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm">
                        {/* Amount and Currency */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div className="group">
                            <label className="block text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Amount per cycle
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.amount}
                              onChange={(e) => setFormData({...formData, amount: e.target.value})}
                              className="w-full px-4 py-3 border-2 border-emerald-200 dark:border-emerald-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="group">
                            <label className="block text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Currency
                            </label>
                            <div className="relative">
                              <select
                                value={formData.currency}
                                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                className="w-full px-4 py-3 border-2 border-emerald-200 dark:border-emerald-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm text-slate-900 dark:text-white appearance-none cursor-pointer transition-all duration-300"
                              >
                                {CURRENCIES.map(currency => (
                                  <option key={currency} value={currency}>{currency}</option>
                                ))}
                              </select>
                              <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Next Cycle */}
                        <div className="group mb-6">
                          <label className="block text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Next Billing Date
                          </label>
                          <input
                            type="date"
                            value={formData.nextCycle}
                            onChange={(e) => setFormData({...formData, nextCycle: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-emerald-200 dark:border-emerald-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm text-slate-900 dark:text-white transition-all duration-300"
                          />
                        </div>

                        {/* Auto Debit Toggle */}
                        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-emerald-200/50 dark:border-emerald-600/50">
                          <label className="flex items-center gap-4 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={formData.autoDebit}
                                onChange={(e) => setFormData({...formData, autoDebit: e.target.checked})}
                                className="sr-only"
                              />
                              <div className={`w-12 h-7 rounded-full transition-all duration-300 ${formData.autoDebit ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 mt-1 ${formData.autoDebit ? 'translate-x-6' : 'translate-x-1'}`}></div>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Auto-debit Enabled</div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400">Automatic payment processing</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Additional Notes</h3>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-500 resize-none"
                      placeholder="Additional information, recovery codes, or other important notes..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 bg-gradient-to-r from-slate-50/95 to-white/95 dark:from-slate-800/95 dark:to-slate-700/95 backdrop-blur-xl p-6 -mx-8 -mb-8 mt-8 border-t border-slate-200/50 dark:border-slate-600/50 rounded-b-3xl">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all duration-300 font-medium hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 disabled:from-emerald-400 disabled:to-cyan-400 text-white px-8 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        {saving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingCredential ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                            </svg>
                            {editingCredential ? 'Update Credential' : 'Create Credential'}
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onCancel={() => setDeleteConfirm({ show: false, id: '', title: '' })}
        onConfirm={confirmDelete}
        title="Delete Credential"
        message={`Are you sure you want to delete the credential for "${deleteConfirm.title}"? This action cannot be undone.`}
        type="danger"
      />
    </div>
  );
}
