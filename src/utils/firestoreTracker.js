import * as realFirestore from '@firebase/firestore';

export * from '@firebase/firestore';

// Helper to safely get the current logged-in user info from browser storage
function getCurrentUser() {
  try {
    const email = sessionStorage.getItem('auth_email') || localStorage.getItem('auth_email') || 'visitor@anonymous.com';
    const name = sessionStorage.getItem('auth_name') || localStorage.getItem('auth_name') || (email.includes('@') ? email.split('@')[0] : 'Visitor');
    const role = sessionStorage.getItem('auth_role') || (email === 'visitor@anonymous.com' ? 'Visitor' : 'Student');
    return { name, email, role };
  } catch (_) {
    return { name: 'Visitor', email: 'visitor@anonymous.com', role: 'Visitor' };
  }
}

// Inferred human-friendly action based on URL and collection
function inferAction(collectionPath, queryType) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';

  if (collectionPath === 'question_bank') {
    if (path.includes('admin')) return 'Admin: Viewed Question Bank / Duplicate Check';
    if (path.includes('test') || search.includes('test')) return 'Student: Loaded Test Questions';
    return 'Loaded Question Bank Documents';
  }
  if (collectionPath === 'test_attempts') {
    if (path.includes('admin')) return 'Admin: Loaded Test Attempts & Analytics';
    return 'Student: Submitted or Viewed Test History';
  }
  if (collectionPath === 'tests') {
    if (path.includes('admin')) return 'Admin: Loaded Tests Manager / Overview';
    return 'Student: Viewed Tests Schedule / List';
  }
  if (collectionPath === 'active_proctoring') {
    if (path.includes('admin') || path.includes('teacher')) return 'Teacher/Admin: Exam Live Proctoring Monitor';
    return 'Student: Live Proctoring Session Sync';
  }
  if (collectionPath === 'joined_students') return 'Admin: Viewed Student Directory';
  if (collectionPath === 'notes' || collectionPath === 'note_folders' || collectionPath === 'note_bundles') return 'Viewed Study Notes / Materials';
  if (collectionPath === 'recordings') return 'Viewed Class Recordings';
  if (collectionPath === 'live_sessions') return 'Live Class Session Sync';
  if (collectionPath === 'contact_queries') return 'Contact & Enquiry Notifications';
  if (collectionPath === 'payments') return 'Admin: Payments & Purchases Sync';
  if (collectionPath === 'question_attributes') return 'Loaded Categories, Departments & Topics';
  
  return `${queryType} on [${collectionPath}]`;
}

// Extract clean collection name from a docRef or query
function getPathFromTarget(target) {
  if (!target) return 'unknown';
  if (typeof target.path === 'string') return target.path;
  if (target._path?.segments) return target._path.segments.join('/');
  if (target._query?.path?.segments) return target._query.path.segments.join('/');
  return 'query';
}

// Buffer to accumulate read logs before writing to Firestore
let logBuffer = [];
let flushTimer = null;
let isFlushing = false;

// Direct raw addDoc to write without intercepting our own logging!
async function flushLogsToFirestore() {
  if (isFlushing || logBuffer.length === 0) return;
  isFlushing = true;
  const toSend = [...logBuffer];
  logBuffer = [];

  try {
    const rawDb = realFirestore.getFirestore();
    const colRef = realFirestore.collection(rawDb, 'audit_read_logs');

    // Aggregate by user + action + collection within the flush window to keep writes minimal
    const aggregated = new Map();
    for (const item of toSend) {
      const key = `${item.userEmail}|${item.action}|${item.collection}|${item.queryType}`;
      if (aggregated.has(key)) {
        const prev = aggregated.get(key);
        prev.readsCount += item.readsCount;
      } else {
        aggregated.set(key, { ...item });
      }
    }

    // Write aggregated records
    for (const record of aggregated.values()) {
      await realFirestore.addDoc(colRef, {
        ...record,
        loggedAt: realFirestore.serverTimestamp()
      }).catch(err => console.warn('Could not save read audit:', err));
    }
  } catch (err) {
    // If offline or failed, put back
    logBuffer.push(...toSend);
  } finally {
    isFlushing = false;
  }
}

function queueReadAudit({ target, queryType, readsCount, details }) {
  const collectionPath = getPathFromTarget(target);
  // Never log reads or writes on the audit collection itself!
  if (collectionPath.includes('audit_read_logs')) return;

  const user = getCurrentUser();
  const entry = {
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    action: inferAction(collectionPath, queryType),
    collection: collectionPath,
    queryType,
    readsCount: Math.max(1, readsCount || 1),
    timestamp: new Date().toISOString(),
    istTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    url: typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '',
    details: details || ''
  };

  logBuffer.push(entry);

  // Print helpful console line for debugging
  console.info(`[Firestore Audit] Read +${entry.readsCount} docs | ${entry.userName} (${entry.userEmail}) | ${entry.action}`);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushLogsToFirestore();
    }, 6000); // Batch write every 6 seconds
  }
}

// Flush immediately when user navigates away or closes tab
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushLogsToFirestore();
  });
  window.addEventListener('pagehide', () => flushLogsToFirestore());
}

// ==========================================
// INTERCEPTED FIRESTORE READ OPERATIONS
// ==========================================

export async function getDoc(docRef, ...args) {
  const snap = await realFirestore.getDoc(docRef, ...args);
  // In Firestore, getDoc costs 1 read whether document exists or not
  queueReadAudit({
    target: docRef,
    queryType: 'getDoc',
    readsCount: 1,
    details: `Doc ID: ${docRef?.id || 'unknown'}`
  });
  return snap;
}

export async function getDocs(queryRef, ...args) {
  const snap = await realFirestore.getDocs(queryRef, ...args);
  const count = snap.size > 0 ? snap.size : 1; // 1 read minimum for empty query
  queueReadAudit({
    target: queryRef,
    queryType: 'getDocs',
    readsCount: count,
    details: `Returned ${snap.size} documents`
  });
  return snap;
}

export async function getCountFromServer(queryRef, ...args) {
  const snap = await realFirestore.getCountFromServer(queryRef, ...args);
  queueReadAudit({
    target: queryRef,
    queryType: 'getCountFromServer',
    readsCount: 1,
    details: `Count server aggregation: ${snap.data().count}`
  });
  return snap;
}

export function onSnapshot(...args) {
  const target = args[0];
  let userCallback = null;
  let userError = null;

  if (typeof args[1] === 'function') {
    userCallback = args[1];
    userError = args[2];
  } else if (typeof args[2] === 'function') {
    userCallback = args[2];
    userError = args[3];
  }

  let isFirstEmission = true;

  const wrappedCallback = (snapshot) => {
    try {
      let count = 0;
      if (isFirstEmission) {
        // Initial snapshot delivery
        count = typeof snapshot.size === 'number' ? Math.max(1, snapshot.size) : 1;
        isFirstEmission = false;
      } else {
        // Subsequent document changes
        if (typeof snapshot.docChanges === 'function') {
          const changes = snapshot.docChanges();
          count = changes.length;
        } else {
          count = 1;
        }
      }

      if (count > 0) {
        queueReadAudit({
          target,
          queryType: 'onSnapshot',
          readsCount: count,
          details: isFirstEmission ? 'Initial snapshot load' : 'Live document update'
        });
      }
    } catch (_) {}

    if (userCallback) userCallback(snapshot);
  };

  const newArgs = [...args];
  if (typeof args[1] === 'function') {
    newArgs[1] = wrappedCallback;
  } else if (typeof args[2] === 'function') {
    newArgs[2] = wrappedCallback;
  }

  return realFirestore.onSnapshot(...newArgs);
}
