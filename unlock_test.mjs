import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function unlock() {
  console.log("Unlocking test...");
  await updateDoc(doc(db, "tests", "test_sample_001"), {
    solutionsUnlocked: true,
    solutionsReleaseMode: 'immediate'
  });
  console.log("Test unlocked!");
  process.exit(0);
}

unlock().catch(console.error);
