import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPUfTp37K8-Uump68p_IhSLBDugErZivM",
  authDomain: "cycl-e3414.firebaseapp.com",
  projectId: "cycl-e3414",
  storageBucket: "cycl-e3414.firebasestorage.app",
  messagingSenderId: "121898817442",
  appId: "1:121898817442:web:c43df7a989ce4ee36344fb",
  measurementId: "G-MSX5HCS9PK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
