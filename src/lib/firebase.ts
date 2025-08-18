import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCRKUwhSJKB_9EXUuKtIPsFtKtQG7v80aA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'notesapp-89d19.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'notesapp-89d19',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'notesapp-89d19.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '965149704808',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:965149704808:web:03af69c4892af7c0c6b1dd',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-ES1L1WDE6C'
};

// Check if we have valid configuration
const isValidConfig = Boolean(
  (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey !== 'dummy-key') && 
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId !== 'dummy-project')
);

// Always initialize Firebase to avoid type issues during build
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper function to check if Firebase is available for actual operations
export function isFirebaseAvailable(): boolean {
  return isValidConfig && typeof window !== 'undefined';
}

export { auth, db, storage };
export default app;
