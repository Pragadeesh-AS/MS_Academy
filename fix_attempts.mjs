import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  console.log("Fixing attempts...");
  
  // Alice attempt
  await updateDoc(doc(db, "test_attempts", "attempt_1"), {
    totalMarks: 6,
    correctCount: 4
  });

  // Bob attempt
  await updateDoc(doc(db, "test_attempts", "attempt_2"), {
    totalMarks: 6,
    correctCount: 2
  });

  console.log("Attempts fixed!");
  process.exit(0);
}

fix().catch(console.error);
