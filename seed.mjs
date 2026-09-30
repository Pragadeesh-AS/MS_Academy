import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Seeding database...");
  
  // 1. Create questions
  const q1Id = "q_test1_1";
  const q2Id = "q_test1_2";
  const q3Id = "q_test1_3";
  const q4Id = "q_test1_4";

  await setDoc(doc(db, "question_bank", q1Id), {
    department: "Mechanical (ME)",
    subject: "Thermodynamics",
    questionText: "Which of the following is an intensive property?",
    questionType: "Multiple Choice",
    optionA: "Volume",
    optionB: "Temperature",
    optionC: "Mass",
    optionD: "Energy",
    correctAnswers: ["B"],
    explanation: "Temperature does not depend on the mass of the system.",
    marks: 1
  });

  await setDoc(doc(db, "question_bank", q2Id), {
    department: "Mechanical (ME)",
    subject: "Fluid Mechanics",
    questionText: "Bernoulli's equation represents the conservation of:",
    questionType: "Multiple Choice",
    optionA: "Mass",
    optionB: "Momentum",
    optionC: "Energy",
    optionD: "Force",
    correctAnswers: ["C"],
    explanation: "Bernoulli's principle is a statement of the conservation of energy.",
    marks: 2
  });
  
  await setDoc(doc(db, "question_bank", q3Id), {
    department: "Mechanical (ME)",
    subject: "Heat Transfer",
    questionText: "Heat transfer by conduction is governed by:",
    questionType: "Multiple Choice",
    optionA: "Newton's law",
    optionB: "Fourier's law",
    optionC: "Stefan-Boltzmann law",
    optionD: "Fick's law",
    correctAnswers: ["B"],
    explanation: "Fourier's law governs heat conduction.",
    marks: 1
  });

  await setDoc(doc(db, "question_bank", q4Id), {
    department: "Mechanical (ME)",
    subject: "Thermodynamics",
    questionText: "The entropy of an isolated system can never:",
    questionType: "Multiple Choice",
    optionA: "Increase",
    optionB: "Decrease",
    optionC: "Remain constant",
    optionD: "None of these",
    correctAnswers: ["B"],
    explanation: "Second law of thermodynamics.",
    marks: 2
  });

  // 2. Create Test
  const testId = "test_sample_001";
  await setDoc(doc(db, "tests", testId), {
    title: "Sample Mechanical Engg Test",
    department: "Mechanical (ME)",
    subject: "Mixed",
    questions: [
      { id: q1Id, marks: 1 },
      { id: q2Id, marks: 2 },
      { id: q3Id, marks: 1 },
      { id: q4Id, marks: 2 }
    ],
    targetMarks: 6,
    duration: 60,
    isPublished: true,
    createdAt: serverTimestamp()
  });

  // 3. Create Students
  const s1Email = "student1@dev.com";
  const s2Email = "student2@dev.com";

  await setDoc(doc(db, "joined_students", s1Email), {
    email: s1Email,
    name: "Alice (Student 1)",
    department: "Mechanical (ME)",
    joinedAt: serverTimestamp()
  });

  await setDoc(doc(db, "joined_students", s2Email), {
    email: s2Email,
    name: "Bob (Student 2)",
    department: "Mechanical (ME)",
    joinedAt: serverTimestamp()
  });

  // 4. Create Attempts
  // Alice gets 6/6 (Topper), fast time
  await setDoc(doc(db, "test_attempts", "attempt_1"), {
    testId,
    testTitle: "Sample Mechanical Engg Test",
    studentEmail: s1Email,
    studentName: "Alice (Student 1)",
    score: 6,
    totalQuestions: 4,
    responses: [
      { questionId: q1Id, selectedAnswer: ["B"], correctAnswer: ["B"], timeSpent: 12 },
      { questionId: q2Id, selectedAnswer: ["C"], correctAnswer: ["C"], timeSpent: 15 },
      { questionId: q3Id, selectedAnswer: ["B"], correctAnswer: ["B"], timeSpent: 8 },
      { questionId: q4Id, selectedAnswer: ["B"], correctAnswer: ["B"], timeSpent: 20 }
    ],
    submittedAt: serverTimestamp()
  });

  // Bob gets 3/6, slower
  await setDoc(doc(db, "test_attempts", "attempt_2"), {
    testId,
    testTitle: "Sample Mechanical Engg Test",
    studentEmail: s2Email,
    studentName: "Bob (Student 2)",
    score: 3,
    totalQuestions: 4,
    responses: [
      { questionId: q1Id, selectedAnswer: ["B"], correctAnswer: ["B"], timeSpent: 45 },
      { questionId: q2Id, selectedAnswer: ["A"], correctAnswer: ["C"], timeSpent: 60 },
      { questionId: q3Id, selectedAnswer: ["B"], correctAnswer: ["B"], timeSpent: 30 },
      { questionId: q4Id, selectedAnswer: ["A"], correctAnswer: ["B"], timeSpent: 40 }
    ],
    submittedAt: serverTimestamp()
  });

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);
