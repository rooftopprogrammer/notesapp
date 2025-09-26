'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';

interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt?: Date;
  lastLogin?: Date;
}

export default function Business() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  // Get remaining session time
  const getSessionTimeRemaining = () => {
    if (!sessionExpiresAt) return null;
    const now = new Date().getTime();
    const remaining = sessionExpiresAt - now;
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const savedSession = localStorage.getItem('businessSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const now = new Date().getTime();
          
          // Check if session is not expired (24 hours)
          if (sessionData.expiresAt && now < sessionData.expiresAt) {
            setCurrentUser(sessionData.user);
            setIsAuthenticated(true);
            setSessionExpiresAt(sessionData.expiresAt);
          } else {
            // Session expired, clear it
            localStorage.removeItem('businessSession');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('businessSession');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, []);

  // Periodic session check (every minute)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      try {
        const savedSession = localStorage.getItem('businessSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const now = new Date().getTime();
          
          // Check if session expired
          if (sessionData.expiresAt && now >= sessionData.expiresAt) {
            handleLogout();
            alert('Your session has expired. Please login again.');
          }
        } else {
          // Session data missing, logout
          handleLogout();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Update session time display every minute
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return;

    const interval = setInterval(() => {
      // Force re-render to update session time display
      setSessionExpiresAt(prev => prev);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiresAt]);

  // Initialize default user in database if not exists
  useEffect(() => {
    const initializeUser = async () => {
      if (!isFirebaseAvailable()) {
        console.log('Firebase not available, skipping user initialization');
        return;
      }
      
      try {
        const usersCollection = collection(db, 'businessUsers');
        const userQuery = query(usersCollection, where('username', '==', 'ravin'));
        const querySnapshot = await getDocs(userQuery);
        
        if (querySnapshot.empty) {
          // Create default user
          await addDoc(usersCollection, {
            username: 'ravin',
            password: 'ravin', // In production, this should be hashed
            role: 'admin',
            createdAt: serverTimestamp()
          });
          console.log('Default business user created successfully');
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };

    initializeUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isFirebaseAvailable()) {
      setError('Firebase is not available. Please check your configuration.');
      setIsLoading(false);
      return;
    }

    try {
      // Query user from Firestore
      const usersCollection = collection(db, 'businessUsers');
      const userQuery = query(
        usersCollection, 
        where('username', '==', username),
        where('password', '==', password)
      );
      const querySnapshot = await getDocs(userQuery);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
        
        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        // Save session to localStorage (expires in 24 hours)
        const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
        const sessionData = {
          user: userData,
          expiresAt: expiresAt
        };
        localStorage.setItem('businessSession', JSON.stringify(sessionData));
        setSessionExpiresAt(expiresAt);
        
        console.log('User authenticated successfully:', userData.username);
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setError('');
    setSessionExpiresAt(null);
    
    // Clear session from localStorage
    localStorage.removeItem('businessSession');
  };

  // Show loading screen while checking session
  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Checking your session...</p>
        </div>
      </main>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <style jsx>{`
          @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
            50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.5); }
          }
          .animate-gradient-x { animation: gradient-x 15s ease infinite; }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        `}</style>
        
        <main className="min-h-screen relative overflow-hidden">
          {/* Ultra-Modern Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900 animate-gradient-x bg-[length:400%_400%]" />
          
          {/* Floating Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-r from-emerald-300/30 to-teal-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
            <div className="absolute top-1/4 -right-4 w-96 h-96 bg-gradient-to-r from-green-300/30 to-emerald-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute -bottom-8 left-1/3 w-80 h-80 bg-gradient-to-r from-teal-300/30 to-cyan-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />
          </div>

          <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
            <div className="max-w-md w-full animate-fade-in-up">
              {/* Back button */}
              <div className="mb-8">
                <Link 
                  href="/"
                  className="inline-flex items-center px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="ml-3 text-white/90 font-medium">Back to Home</span>
                </Link>
              </div>

              {/* Ultra-Modern Login Card */}
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition-all duration-500">
                <div className="text-center mb-8">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400/30 to-teal-400/30 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto animate-pulse-glow border border-emerald-400/30">
                      <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full animate-pulse border-2 border-white/20" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-3">
                    Business Hub Login
                  </h1>
                  <p className="text-white/70 text-lg">Welcome back! Please sign in to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <div className="backdrop-blur-xl bg-red-500/20 border border-red-400/30 rounded-2xl p-4 animate-fade-in-up">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="ml-3 text-red-200 font-medium">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="username" className="block text-sm font-semibold text-white/90 mb-3">
                        Username
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-4 py-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:bg-white/20 focus:border-emerald-400/50 text-white placeholder-white/50 font-medium transition-all duration-300"
                          placeholder="Enter your username"
                          required
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-3">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:bg-white/20 focus:border-emerald-400/50 text-white placeholder-white/50 font-medium transition-all duration-300"
                          placeholder="Enter your password"
                          required
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full mt-8 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-700 disabled:to-teal-700 rounded-2xl shadow-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                        <span className="text-lg">Signing in...</span>
                      </div>
                    ) : (
                      <span className="text-lg">Sign In</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }
  return (
    <>
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-gradient-x { animation: gradient-x 15s ease infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      <main className="min-h-screen relative overflow-hidden">
        {/* Ultra-Modern Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900 animate-gradient-x bg-[length:400%_400%]" />
        
        {/* Floating Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-r from-emerald-300/20 to-teal-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
          <div className="absolute top-1/4 -right-4 w-96 h-96 bg-gradient-to-r from-green-300/20 to-emerald-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-8 left-1/3 w-80 h-80 bg-gradient-to-r from-teal-300/20 to-cyan-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative z-10 p-6">
          {/* Ultra-Modern Header */}
          <div className="max-w-6xl mx-auto mb-10 animate-fade-in-up">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <Link 
                    href="/"
                    className="group p-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110"
                  >
                    <svg className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-2">
                      Business Hub
                    </h1>
                    {currentUser && (
                      <div className="text-white/80">
                        <p className="text-lg font-medium">Welcome back, <span className="text-emerald-300">{currentUser.username}</span></p>
                        {getSessionTimeRemaining() && (
                          <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Session expires in: {getSessionTimeRemaining()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Ultra-Modern Logout Button */}
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-3 px-6 py-4 backdrop-blur-xl bg-red-500/20 border border-red-400/30 rounded-2xl shadow-lg hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="w-8 h-8 bg-red-400/30 rounded-xl flex items-center justify-center group-hover:bg-red-400/40 transition-colors">
                    <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-red-200 font-semibold">Logout</span>
                </button>
              </div>
              
              <p className="text-white/70 text-lg leading-relaxed">
                Manage your business operations, finances, and professional activities with advanced security
              </p>
            </div>
          </div>

          {/* Business Categories Grid */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Projects & Credentials */}
              <Link
                href="/business/projects"
                className="group backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 hover:border-white/30 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-400/30 to-pink-400/30 backdrop-blur-xl rounded-2xl flex items-center justify-center animate-pulse-glow border border-red-400/30 group-hover:from-red-400/40 group-hover:to-pink-400/40 transition-all duration-300">
                    <svg className="w-8 h-8 text-red-300 group-hover:text-red-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse border-2 border-white/20" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-red-200 transition-colors">Projects & Credentials</h3>
                <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">Organize credentials by projects and manage subscriptions with enterprise-grade security</p>
                
                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-pink-500/5 transition-all duration-500 pointer-events-none" />
              </Link>

            </div>
          </div>

          {/* Ultra-Modern Stats Section */}
          <div className="max-w-6xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-500">
              <div className="mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-2">
                  Projects & Credentials Overview
                </h2>
                <p className="text-white/70">Real-time insights into your business operations</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Active Projects */}
                <div className="group text-center p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="relative mb-4">
                    <div className="text-5xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-2 animate-pulse-glow">0</div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full animate-pulse opacity-60" />
                  </div>
                  <div className="text-white/80 font-semibold text-lg">Active Projects</div>
                  <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-pink-400 w-0 animate-shimmer" />
                  </div>
                </div>

                {/* Total Credentials */}
                <div className="group text-center p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="relative mb-4">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 animate-pulse-glow">0</div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400 rounded-full animate-pulse opacity-60" />
                  </div>
                  <div className="text-white/80 font-semibold text-lg">Total Credentials</div>
                  <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 w-0 animate-shimmer" />
                  </div>
                </div>

                {/* Secure Entries */}
                <div className="group text-center p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="relative mb-4">
                    <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2 animate-pulse-glow">0</div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 rounded-full animate-pulse opacity-60" />
                  </div>
                  <div className="text-white/80 font-semibold text-lg">Secure Entries</div>
                  <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 w-0 animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
