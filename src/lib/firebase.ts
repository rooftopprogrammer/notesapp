import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRKUwhSJKB_9EXUuKtIPsFtKtQG7v80aA",
  authDomain: "notesapp-89d19.firebaseapp.com",
  projectId: "notesapp-89d19",
  storageBucket: "notesapp-89d19.firebasestorage.app",
  messagingSenderId: "965149704808",
  appId: "1:965149704808:web:03af69c4892af7c0c6b1dd",
  measurementId: "G-ES1L1WDE6C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
