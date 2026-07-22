// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  authDomain: "msgate-5bad9.firebaseapp.com",
  projectId: "msgate-5bad9",
  storageBucket: "msgate-5bad9.firebasestorage.app",
  messagingSenderId: "1019189936632",
  appId: "1:1019189936632:web:037da2850fb638130f160d",
  measurementId: "G-NLC2S65LQ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize commonly used services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
