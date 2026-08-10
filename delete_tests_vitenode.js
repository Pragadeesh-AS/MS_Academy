import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllTests() {
  console.log("Fetching tests to delete...");
  const snapshot = await getDocs(collection(db, 'tests'));
  
  if (snapshot.empty) {
    console.log("No tests found to delete.");
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} tests. Deleting...`);
  let count = 0;
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, 'tests', document.id));
    count++;
    console.log(`Deleted test ${count}/${snapshot.size}: ${document.id}`);
  }
  
  console.log("All tests successfully deleted.");
  process.exit(0);
}

deleteAllTests().catch(console.error);
