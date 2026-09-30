import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'invited_teachers'), where('email', '==', 'student1@dev.com'));
  const snap = await getDocs(q);
  console.log("Is Alice a teacher?", !snap.empty);
  process.exit(0);
}

check().catch(console.error);
