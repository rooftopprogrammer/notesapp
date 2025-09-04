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
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Load credentials when authenticated or search term changes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadData = async () => {
      if (!isFirebaseAvailable()) {
        setError('Firebase not available');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const credentialsCollection = collection(db, 'businessCredentials');
        
        let q;
        
        if (searchTerm.trim()) {
          // Search by title (case-insensitive) - use simple ordering
          q = query(
            credentialsCollection,
            orderBy('title'),
            limit(itemsPerPage + 1)
          );
        } else {
          // Regular pagination - order by title instead of createdAt to avoid index issues
          q = query(
            credentialsCollection,
            orderBy('title'),
            limit(itemsPerPage + 1)
          );
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
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

        // Filter by search term if needed (client-side filtering for better search)
        let filteredCredentials = credentialsData;
        if (searchTerm.trim()) {
          const searchTermLower = searchTerm.toLowerCase();
          filteredCredentials = credentialsData.filter(credential =>
            credential.title.toLowerCase().includes(searchTermLower) ||
            credential.username.toLowerCase().includes(searchTermLower) ||
            credential.type?.toLowerCase().includes(searchTermLower) ||
            credential.notes?.toLowerCase().includes(searchTermLower)
          );
        }

        // Check if there's a next page
        const hasNext = filteredCredentials.length > itemsPerPage;
        if (hasNext) {
          filteredCredentials.pop(); // Remove the extra item
        }

        // Map project names
        const credentialsWithProjectNames = filteredCredentials.map(credential => {
          const project = projects.find(p => p.id === credential.projectId);
          return {
            ...credential,
            projectName: project?.name || 'Unknown Project'
          };
        });

        setCredentials(credentialsWithProjectNames);
        setCurrentPage(1);
        setHasNextPage(hasNext);
        setTotalCredentials(credentialsWithProjectNames.length);

      } catch (error) {
        console.error('Error loading credentials:', error);
        setError('Failed to load credentials. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, searchTerm, itemsPerPage, projects]);

  // Remove the second useEffect since we've consolidated the logic
  // Load credentials when projects are loaded
  // useEffect(() => {
  //   if (isAuthenticated && projects.length > 0 && credentials.length === 0 && !loading) {
  //     loadCredentials(true);
  //   }
  // }, [projects]); // Load once when projects are available

  const handleNextPage = () => {
    // Pagination temporarily disabled - could be implemented with proper state management
    console.log('Pagination not implemented yet');
  };

  const handlePreviousPage = () => {
    // Pagination temporarily disabled - could be implemented with proper state management  
    console.log('Pagination not implemented yet');
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Simple feedback - you could replace with a toast notification
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        const originalText = button.title;
        button.title = `${type} copied!`;
        setTimeout(() => {
          button.title = originalText;
        }, 2000);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect will happen in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/business/projects" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block">
                ← Back to Projects
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">All Credentials</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Complete list of all credentials across projects</p>
            </div>
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
              placeholder="Search credentials..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading credentials...</p>
          </div>
        )}

        {/* Credentials Table */}
        {!loading && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Password
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Paid Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {credentials.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                              {searchTerm ? 'No credentials found matching your search' : 'No credentials found'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              {searchTerm 
                                ? 'Try adjusting your search terms or browse all credentials.'
                                : 'Start by creating a project and adding credentials to see them here.'
                              }
                            </p>
                            {!searchTerm && (
                              <Link
                                href="/business/projects"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Go to Projects
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      credentials.map((credential) => (
                        <tr key={credential.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {credential.title}
                            </div>
                            {credential.notes && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {credential.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                              {credential.projectName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {credential.type && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                {credential.type}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{credential.username}</span>
                              <button
                                onClick={() => copyToClipboard(credential.username, 'Username')}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Copy username"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{'•'.repeat(Math.min(credential.password.length, 8))}</span>
                              <button
                                onClick={() => copyToClipboard(credential.password, 'Password')}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Copy password"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {credential.siteLink ? (
                              <a 
                                href={credential.siteLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate max-w-xs inline-block"
                                title={credential.siteLink}
                              >
                                {credential.siteLink.length > 30 ? credential.siteLink.substring(0, 30) + '...' : credential.siteLink}
                              </a>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {credential.isPaid ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                  Paid
                                </span>
                                {credential.amount && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatCurrency(credential.amount, credential.currency)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                Free
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(credential.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <Link
                              href={`/business/projects/${credential.projectId}`}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                            >
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
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} - Showing {credentials.length} credentials
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage || loading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Search Results Info */}
            {searchTerm && (
              <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                {credentials.length > 0 
                  ? `Found ${totalCredentials} credential(s) matching "${searchTerm}"`
                  : `No credentials found matching "${searchTerm}"`
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
