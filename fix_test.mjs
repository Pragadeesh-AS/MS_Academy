import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  console.log("Fixing test...");
  await updateDoc(doc(db, "tests", "test_sample_001"), {
    questions: ["q_test1_1", "q_test1_2", "q_test1_3", "q_test1_4"],
    allocations: {
      "q_test1_1": 1,
      "q_test1_2": 2,
      "q_test1_3": 1,
      "q_test1_4": 2
    }
  });
  console.log("Test fixed!");
  process.exit(0);
}

fix().catch(console.error);
