import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'public_leaderboards')).catch(e => null);
  console.log("public_leaderboards exists:", snap ? !snap.empty : false);
  process.exit(0);
}

check().catch(console.error);
