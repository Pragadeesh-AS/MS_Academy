import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim().replace(/\r/g, '');
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    envVars[match[1].trim()] = val;
  }
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID
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
