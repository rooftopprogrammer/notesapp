'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';

interface Credential {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  username: string;
  password: string;
  siteLink?: string;
  notes?: string;
  type?: string;
  isPaid?: boolean;
  amount?: number;
  currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Project {
  id: string;
  name: string;
  type: string;
}

export default function AllCredentialsList() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCredentials, setTotalCredentials] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]); // Store all credentials for client-side operations
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // Check authentication 
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Use the same auth key as other business pages
        const savedSession = localStorage.getItem('businessSession');
        
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const now = new Date().getTime();
          
          // Check if session is valid and not expired
          if (sessionData.expiresAt && now < sessionData.expiresAt) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('businessSession');
            router.push('/business');
            return;
          }
        } else {
          router.push('/business');
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/business');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load projects for name mapping
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  const loadProjects = async () => {
    if (!isFirebaseAvailable()) return;

    try {
      const projectsCollection = collection(db, 'businessProjects');
      const q = query(projectsCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const projectsData: Project[] = [];
      querySnapshot.forEach((doc) => {
        projectsData.push({ id: doc.id, ...doc.data() } as Project);
      });
      
      setProjects(projectsData);
      setProjectsLoaded(true);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Load all credentials initially
  const loadAllCredentials = async () => {
    if (!isFirebaseAvailable() || !projectsLoaded) return;

    setLoading(true);
    setError('');

    try {
      const credentialsCollection = collection(db, 'businessCredentials');
      const q = query(credentialsCollection, orderBy('title'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setAllCredentials([]);
        setCredentials([]);
        setTotalCredentials(0);
        setLoading(false);
        return;
      }
      
      const credentialsData: Credential[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        credentialsData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.(),
          updatedAt: data.updatedAt?.toDate?.()
        } as Credential);
      });

      // Map project names
      const credentialsWithProjectNames = credentialsData.map(credential => {
        const project = projects.find(p => p.id === credential.projectId);
        return {
          ...credential,
          projectName: project?.name || 'Unknown Project'
        };
      });

      setAllCredentials(credentialsWithProjectNames);
      applyFiltersAndPagination(credentialsWithProjectNames, '', 1);

    } catch (error) {
      console.error('Error loading credentials:', error);
      setError('Failed to load credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply search filters and pagination
  const applyFiltersAndPagination = (data: Credential[], searchTerm: string, page: number) => {
    let filteredCredentials = data;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase();
      filteredCredentials = data.filter(credential =>
        credential.title.toLowerCase().includes(searchTermLower) ||
        credential.username.toLowerCase().includes(searchTermLower) ||
        credential.type?.toLowerCase().includes(searchTermLower) ||
        credential.notes?.toLowerCase().includes(searchTermLower) ||
        credential.projectName?.toLowerCase().includes(searchTermLower)
      );
    }

    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCredentials = filteredCredentials.slice(startIndex, endIndex);
    
    // Update state
    setCredentials(paginatedCredentials);
    setTotalCredentials(filteredCredentials.length);
    setCurrentPage(page);
    setHasNextPage(endIndex < filteredCredentials.length);
    setHasPrevPage(page > 1);
  };

  // Load credentials when projects are loaded
  useEffect(() => {
    if (isAuthenticated && projectsLoaded) {
      loadAllCredentials();
    }
  }, [isAuthenticated, projectsLoaded]);

  // Handle search term changes
  useEffect(() => {
    if (allCredentials.length > 0) {
      applyFiltersAndPagination(allCredentials, searchTerm, 1);
    }
  }, [searchTerm, allCredentials]);

  const handleNextPage = () => {
    if (hasNextPage && !loading) {
      const nextPage = currentPage + 1;
      applyFiltersAndPagination(allCredentials, searchTerm, nextPage);
    }
  };

  const handlePreviousPage = () => {
    if (hasPrevPage && !loading && currentPage > 1) {
      const prevPage = currentPage - 1;
      applyFiltersAndPagination(allCredentials, searchTerm, prevPage);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Create a modern toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg z-50 animate-fade-in';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          ${type} copied to clipboard!
        </div>
      `;
      document.body.appendChild(toast);
      
      // Remove toast after 2 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect will happen in useEffect
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
                href="/business/projects" 
                className="group flex items-center gap-2 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-all duration-300 font-medium"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                Back to Projects
              </Link>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Credentials List View
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">All credentials across projects</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {credentials.length} {credentials.length === 1 ? 'Credential' : 'Credentials'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {searchTerm ? `Search: "${searchTerm}"` : 'All projects'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by title, username, type, or notes..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-6 bg-red-50/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/60 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading credentials...</p>
          </div>
        )}

                {/* Credentials Table */}
        {!loading && (
          <>
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gradient-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-700/60 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Title
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Project
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Username
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Password
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          URL
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Payment
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Created
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {credentials.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative mx-auto w-24 h-24 mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-500 rounded-2xl blur-xl opacity-30"></div>
                              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                              </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                              {searchTerm ? 'No credentials found' : 'No credentials available'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md text-center">
                              {searchTerm 
                                ? `No credentials match "${searchTerm}". Try adjusting your search terms.`
                                : 'Start by creating a project and adding credentials to see them here.'
                              }
                            </p>
                            {!searchTerm && (
                              <Link
                                href="/business/projects"
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                              >
                                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                                <div className="relative flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                  Go to Projects
                                </div>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      credentials.map((credential, index) => (
                        <tr key={credential.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all duration-300 group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                                {credential.title}
                              </div>
                              {credential.notes && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs mt-1">
                                  {credential.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                              {credential.projectName}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {credential.type && (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                                {credential.type}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">{credential.username}</span>
                              <button
                                onClick={() => copyToClipboard(credential.username, 'Username')}
                                className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-500 hover:text-white text-slate-400 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50"
                                title="Copy username"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">{'•'.repeat(Math.min(credential.password.length, 8))}</span>
                              <button
                                onClick={() => copyToClipboard(credential.password, 'Password')}
                                className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-500 hover:text-white text-slate-400 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50"
                                title="Copy password"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {credential.siteLink ? (
                              <a 
                                href={credential.siteLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group/link transition-all duration-300"
                                title={credential.siteLink}
                              >
                                <span className="truncate max-w-xs">
                                  {credential.siteLink.length > 30 ? credential.siteLink.substring(0, 30) + '...' : credential.siteLink}
                                </span>
                                <svg className="w-4 h-4 opacity-50 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">No URL</span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {credential.isPaid ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                                  </svg>
                                  Paid Service
                                </span>
                                {credential.amount && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                    {formatCurrency(credential.amount, credential.currency)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Free Service
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(credential.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <Link
                              href={`/business/projects/${credential.projectId}`}
                              className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm transition-all duration-300 hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Project
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {!searchTerm && credentials.length > 0 && (
              <div className="mt-8 flex items-center justify-between p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg">
                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Page {currentPage} of {Math.ceil(totalCredentials / itemsPerPage)} - Showing {credentials.length} of {totalCredentials} credentials
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePreviousPage}
                    disabled={!hasPrevPage || loading}
                    className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 backdrop-blur-sm shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </div>
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage || loading}
                    className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 backdrop-blur-sm shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Search Results Info */}
            {searchTerm && (
              <div className="mt-8 text-center p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {credentials.length > 0 
                    ? `Found ${totalCredentials} credential(s) matching "${searchTerm}"`
                    : `No credentials found matching "${searchTerm}"`
                  }
                </div>
              </div>
            )}
          </>
        )}
      </main>

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
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
