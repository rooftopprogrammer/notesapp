'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInAnonymouslyIfNeeded: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInAnonymouslyIfNeeded: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  clearError: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const signInAnonymouslyIfNeeded = async () => {
    if (!user) {
      try {
        console.log('Attempting anonymous sign-in...');
        await signInAnonymously(auth);
        console.log('Anonymous sign-in successful');
        setError(null);
      } catch (error) {
        console.error('Error signing in anonymously:', error);
        
        if (error instanceof Error && (error as { code?: string }).code === 'auth/admin-restricted-operation') {
          const errorMessage = 'Anonymous authentication is disabled. Please enable it in Firebase Console or use email authentication.';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
        
        setError('Failed to sign in anonymously');
        throw error;
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setError(errorMessage);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user?.uid || 'No user');
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Separate effect to handle anonymous sign-in
  useEffect(() => {
    const signInIfNeeded = async () => {
      if (!loading && !user) {
        try {
          console.log('Attempting anonymous sign-in...');
          const result = await signInAnonymously(auth);
          console.log('Anonymous sign-in successful:', result.user.uid);
        } catch (error) {
          console.error('Error signing in anonymously:', error);
          // If anonymous auth is disabled, we might need to enable it in Firebase Console
          if (error instanceof Error && (error as { code?: string }).code === 'auth/admin-restricted-operation') {
            console.error('Anonymous authentication is disabled. Please enable it in Firebase Console.');
          }
        }
      }
    };

    signInIfNeeded();
  }, [loading, user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      signInAnonymouslyIfNeeded,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
