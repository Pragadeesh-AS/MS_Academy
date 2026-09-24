// Bulk-fix question marks that were imported with a wrong value (e.g. "10 Marks", "15 Marks").
//
//   node fix_marks.js                      -> dry run: lists what would change, writes nothing
//   node fix_marks.js --apply              -> applies the change
//   node fix_marks.js --to "2 Mark (-0.66)" --apply
//   node fix_marks.js --all-sources        -> also include questions not imported by the AI Generator
//
// Only questions whose mark is NOT 1 or 2 (by leading number) are touched.
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocsFromServer, doc, updateDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const allSources = args.includes('--all-sources');
const toIdx = args.indexOf('--to');
const newMark = toIdx !== -1 ? args[toIdx + 1] : '1 Mark (-0.33)';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    envVars[match[1].trim()] = val;
  }
});

const app = initializeApp({
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);

async function run() {
  const snap = await getDocsFromServer(collection(db, 'question_bank'));
  const targets = snap.docs.filter(d => {
    const q = d.data();
    if (!allSources && q.source !== 'AI Generator') return false;
    const n = parseFloat(q.mark);
    return n !== 1 && n !== 2;
  });

  console.log(`${snap.size} questions scanned, ${targets.length} with a mark other than 1 or 2.`);
  const counts = {};
  targets.forEach(d => { const m = d.data().mark ?? '(empty)'; counts[m] = (counts[m] || 0) + 1; });
  console.table(counts);

  if (!apply) {
    console.log(`Dry run. Would set mark to "${newMark}". Re-run with --apply to write.`);
    process.exit(0);
  }

  for (const d of targets) {
    await updateDoc(doc(db, 'question_bank', d.id), { mark: newMark, updatedAt: new Date().toISOString() });
  }
  console.log(`Updated ${targets.length} questions to "${newMark}".`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
