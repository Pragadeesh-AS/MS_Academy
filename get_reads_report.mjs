import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKk6b6Coo7n5mRbYIBh2dWhut8_-QA2xM",
  projectId: "msgate-5bad9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Filter for the last 24 hours (or custom duration)
const now = Date.now();
const windowStartMs = now - (24 * 60 * 60 * 1000); // 24 hours ago

async function generateReport() {
  console.log("===============================================================================");
  console.log("                FIRESTORE 24-HOUR READS USAGE AUDIT REPORT                     ");
  console.log("===============================================================================");
  console.log(`Generated At : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
  console.log(`Report Window: ${new Date(windowStartMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to Now\n`);

  const snap = await getDocs(query(collection(db, 'audit_read_logs'), orderBy('timestamp', 'desc')));
  
  const records = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const timeMs = data.timestamp ? new Date(data.timestamp).getTime() : 0;
    if (timeMs >= windowStartMs) {
      records.push({ id: docSnap.id, ...data, timeMs });
    }
  });

  if (records.length === 0) {
    console.log("No read audit records found in the last 24 hours yet.");
    console.log("Tracking is currently ACTIVE. As users browse, take tests, or open tabs,");
    console.log("their reads will be automatically recorded here.");
    process.exit(0);
  }

  const totalReads = records.reduce((sum, r) => sum + (Number(r.readsCount) || 1), 0);
  console.log(`TOTAL FIRESTORE READS RECORDED : ${totalReads.toLocaleString('en-IN')}`);
  console.log(`TOTAL USER ACTIONS LOGGED      : ${records.length}\n`);

  // 1. Group by Person (Email + Name + Role)
  const byPerson = {};
  records.forEach(r => {
    const key = r.userEmail || 'unknown@visitor.com';
    if (!byPerson[key]) {
      byPerson[key] = {
        name: r.userName || 'Unknown',
        email: r.userEmail || 'N/A',
        role: r.userRole || 'Visitor',
        totalReads: 0,
        actionsCount: 0,
        actions: new Set()
      };
    }
    const reads = Number(r.readsCount) || 1;
    byPerson[key].totalReads += reads;
    byPerson[key].actionsCount += 1;
    if (r.action) byPerson[key].actions.add(r.action);
  });

  console.log("-------------------------------------------------------------------------------");
  console.log("1. USAGE BY PERSON (NAME & EMAIL ID)");
  console.log("-------------------------------------------------------------------------------");
  console.log(
    "Name".padEnd(22) +
    "Email ID".padEnd(32) +
    "Role".padEnd(12) +
    "Reads".padStart(10) +
    "  % Total"
  );
  console.log("-".repeat(84));

  const sortedPersons = Object.values(byPerson).sort((a, b) => b.totalReads - a.totalReads);
  sortedPersons.forEach(p => {
    const pct = ((p.totalReads / totalReads) * 100).toFixed(1) + "%";
    console.log(
      p.name.slice(0, 20).padEnd(22) +
      p.email.slice(0, 30).padEnd(32) +
      p.role.slice(0, 10).padEnd(12) +
      p.totalReads.toLocaleString('en-IN').padStart(10) +
      pct.padStart(9)
    );
  });

  // 2. Group by Action
  const byAction = {};
  records.forEach(r => {
    const act = r.action || 'General Query';
    if (!byAction[act]) {
      byAction[act] = { action: act, reads: 0, users: new Set(), count: 0 };
    }
    const reads = Number(r.readsCount) || 1;
    byAction[act].reads += reads;
    byAction[act].count += 1;
    if (r.userName) byAction[act].users.add(r.userName);
  });

  console.log("\n-------------------------------------------------------------------------------");
  console.log("2. USAGE BY ACTION / FEATURE");
  console.log("-------------------------------------------------------------------------------");
  console.log(
    "Action Description".padEnd(46) +
    "Users Involved".padEnd(20) +
    "Reads".padStart(8) +
    " % Total"
  );
  console.log("-".repeat(84));

  const sortedActions = Object.values(byAction).sort((a, b) => b.reads - a.reads);
  sortedActions.forEach(a => {
    const pct = ((a.reads / totalReads) * 100).toFixed(1) + "%";
    const userSummary = Array.from(a.users).slice(0, 2).join(', ') + (a.users.size > 2 ? ` +${a.users.size - 2}` : '');
    console.log(
      a.action.slice(0, 44).padEnd(46) +
      userSummary.slice(0, 18).padEnd(20) +
      a.reads.toLocaleString('en-IN').padStart(8) +
      pct.padStart(8)
    );
  });

  // 3. Group by Collection
  const byCollection = {};
  records.forEach(r => {
    const col = r.collection || 'other';
    byCollection[col] = (byCollection[col] || 0) + (Number(r.readsCount) || 1);
  });

  console.log("\n-------------------------------------------------------------------------------");
  console.log("3. USAGE BY FIRESTORE COLLECTION");
  console.log("-------------------------------------------------------------------------------");
  Object.entries(byCollection)
    .sort((a, b) => b[1] - a[1])
    .forEach(([col, reads]) => {
      const pct = ((reads / totalReads) * 100).toFixed(1) + "%";
      console.log(`- ${col.padEnd(30)} : ${reads.toLocaleString('en-IN').padStart(8)} reads (${pct})`);
    });

  // 4. Highest Individual Read Events
  console.log("\n-------------------------------------------------------------------------------");
  console.log("4. TOP HIGHEST READ EVENTS (HEAVY OPERATIONS)");
  console.log("-------------------------------------------------------------------------------");
  const topEvents = [...records].sort((a, b) => (Number(b.readsCount) || 0) - (Number(a.readsCount) || 0)).slice(0, 10);
  topEvents.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.istTime || e.timestamp}] ${e.userName} (${e.userEmail})`);
    console.log(`   Action: ${e.action} | Collection: ${e.collection}`);
    console.log(`   Reads Taken: ${e.readsCount} docs | ${e.details || ''}\n`);
  });

  process.exit(0);
}

generateReport().catch(err => {
  console.error("Report error:", err);
  process.exit(1);
});
