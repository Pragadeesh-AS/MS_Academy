import { db } from '../firebase';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';

const DB_NAME = 'ms_academy_cache';
const DB_VERSION = 1;
const STORE_NAME = 'question_bank_store';

// Helper: safe timestamp extraction for questions
export const questionTimeMillis = (q) => {
  if (!q) return 0;
  const val = q.importedAt || q.createdAt || q.updatedAt;
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000 + (val.nanoseconds ? Math.round(val.nanoseconds / 1000000) : 0);
  const parsed = Date.parse(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const sortQuestionsList = (list) => {
  return [...list].sort((a, b) => {
    const bTime = questionTimeMillis(b);
    const aTime = questionTimeMillis(a);
    if (bTime !== aTime) return bTime - aTime;
    return (a.importOrder ?? 0) - (b.importOrder ?? 0);
  });
};

// Check common department names
export const isCommonDeptName = (name) => {
  const n = (name || '').trim().toLowerCase();
  return n === 'engineering mathematics' || /ap+titude/.test(n);
};

export const deptNameVariants = (name) => {
  if (!name) return [];
  const code = (name.match(/\(([^)]+)\)/) || [])[1];
  return code ? [name, code.trim()] : [name];
};

// ==========================================
// TIER 1: In-Memory Singleton Cache (0ms Access)
// ==========================================
const memoryCache = {
  questions: {},   // cacheKey -> Array of questions
  attributes: null,// Array of attributes
  lastSync: {},    // cacheKey -> ISO string timestamp
  isSyncing: {},   // cacheKey -> boolean
};

export const getCachedQuestionsSync = (cacheKey = 'all') => {
  return memoryCache.questions[cacheKey] || null;
};

export const getCachedAttributesSync = () => {
  return memoryCache.attributes || null;
};

export const hasCachedQuestions = (cacheKey = 'all') => {
  return Array.isArray(memoryCache.questions[cacheKey]) && memoryCache.questions[cacheKey].length > 0;
};

// ==========================================
// TIER 2: IndexedDB Persistent Storage (~30ms)
// ==========================================
function openIndexedDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const idb = event.target.result;
        if (!idb.objectStoreNames.contains(STORE_NAME)) {
          idb.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (err) => {
        resolve(null);
      };
      request.onblocked = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const idb = await openIndexedDB();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const idb = await openIndexedDB();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        resolve(false);
      };
    } catch (e) {
      resolve(false);
    }
  });
}

async function idbDelete(key) {
  const idb = await openIndexedDB();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// ==========================================
// CACHE MUTATIONS (Sync Memory + IndexedDB)
// ==========================================
export const cacheUpdateQuestion = (updatedQuestion, cacheKey = 'all') => {
  if (!updatedQuestion?.id) return;
  // Update memory
  const keys = cacheKey === 'all' ? Object.keys(memoryCache.questions) : [cacheKey, 'all'];
  keys.forEach(k => {
    if (Array.isArray(memoryCache.questions[k])) {
      memoryCache.questions[k] = memoryCache.questions[k].map(q =>
        q.id === updatedQuestion.id ? { ...q, ...updatedQuestion } : q
      );
      idbSet(`questions_${k}`, memoryCache.questions[k]);
    }
  });
};

export const cacheAddQuestion = (newQuestion, cacheKey = 'all') => {
  if (!newQuestion) return;
  const keys = cacheKey === 'all' ? Object.keys(memoryCache.questions) : [cacheKey, 'all'];
  keys.forEach(k => {
    if (Array.isArray(memoryCache.questions[k])) {
      memoryCache.questions[k] = sortQuestionsList([newQuestion, ...memoryCache.questions[k]]);
      idbSet(`questions_${k}`, memoryCache.questions[k]);
    }
  });
};

export const cacheRemoveQuestions = (ids, cacheKey = 'all') => {
  if (!ids || !ids.length) return;
  const idSet = new Set(ids);
  const keys = cacheKey === 'all' ? Object.keys(memoryCache.questions) : [cacheKey, 'all'];
  keys.forEach(k => {
    if (Array.isArray(memoryCache.questions[k])) {
      memoryCache.questions[k] = memoryCache.questions[k].filter(q => !idSet.has(q.id));
      idbSet(`questions_${k}`, memoryCache.questions[k]);
    }
  });
};

export const cacheBulkUpdate = (ids, updates, cacheKey = 'all') => {
  if (!ids || !ids.length) return;
  const idSet = new Set(ids);
  const keys = cacheKey === 'all' ? Object.keys(memoryCache.questions) : [cacheKey, 'all'];
  keys.forEach(k => {
    if (Array.isArray(memoryCache.questions[k])) {
      memoryCache.questions[k] = memoryCache.questions[k].map(q =>
        idSet.has(q.id) ? { ...q, ...updates } : q
      );
      idbSet(`questions_${k}`, memoryCache.questions[k]);
    }
  });
};

export const invalidateQuestionBankCache = (cacheKey = null) => {
  if (cacheKey) {
    delete memoryCache.questions[cacheKey];
    delete memoryCache.lastSync[cacheKey];
    idbDelete(`questions_${cacheKey}`);
    idbDelete(`meta_${cacheKey}`);
  } else {
    memoryCache.questions = {};
    memoryCache.lastSync = {};
    memoryCache.attributes = null;
    idbDelete('attributes');
  }
};

// ==========================================
// CORE LOADER: Memory -> IndexedDB -> Incremental Background Sync
// ==========================================
export const loadQuestionBankData = async ({
  lockedDepartment = null,
  forceRefresh = false,
  onCacheHit = null,
  onBackgroundUpdate = null,
  onSyncStateChange = null
}) => {
  const cacheKey = lockedDepartment ? `dept_${lockedDepartment}` : 'all';

  // 1. Check Memory Cache (Tier 1 - Instant 0ms)
  if (!forceRefresh && memoryCache.questions[cacheKey] && memoryCache.attributes) {
    if (onCacheHit) {
      onCacheHit({
        questions: memoryCache.questions[cacheKey],
        attributes: memoryCache.attributes,
        source: 'memory'
      });
    }
    // Run background sync quietly
    triggerBackgroundSync({ lockedDepartment, cacheKey, onBackgroundUpdate, onSyncStateChange });
    return;
  }

  // 2. Check IndexedDB (Tier 2 - Instant ~30ms)
  if (!forceRefresh) {
    try {
      const [storedQuestions, storedAttributes, storedMeta] = await Promise.all([
        idbGet(`questions_${cacheKey}`),
        idbGet('attributes'),
        idbGet(`meta_${cacheKey}`)
      ]);

      if (storedQuestions && Array.isArray(storedQuestions) && storedQuestions.length > 0) {
        memoryCache.questions[cacheKey] = storedQuestions;
        if (storedAttributes) memoryCache.attributes = storedAttributes;
        if (storedMeta?.lastSync) memoryCache.lastSync[cacheKey] = storedMeta.lastSync;

        if (onCacheHit) {
          onCacheHit({
            questions: storedQuestions,
            attributes: storedAttributes || [],
            source: 'indexeddb'
          });
        }

        // Run background sync quietly
        triggerBackgroundSync({ lockedDepartment, cacheKey, onBackgroundUpdate, onSyncStateChange });
        return;
      }
    } catch (e) {
    }
  }

  // 3. Cold Start / Force Refresh (Network Load)
  if (onSyncStateChange) onSyncStateChange(true);
  try {
    const questions = await fetchFullQuestionBank({ lockedDepartment, cacheKey });
    const attributes = await fetchAttributes();

    if (onBackgroundUpdate) {
      onBackgroundUpdate({ questions, attributes, source: 'network' });
    }
  } catch (err) {
    try {
      const storedQ = await idbGet(`questions_${cacheKey}`);
      const storedAttr = await idbGet('attributes');
      if (storedQ && storedQ.length > 0) {
        memoryCache.questions[cacheKey] = storedQ;
        if (storedAttr) memoryCache.attributes = storedAttr;
        if (onCacheHit) onCacheHit({ questions: storedQ, attributes: storedAttr || [], source: 'indexeddb_fallback' });
      }
    } catch (_) {}
  } finally {
    if (onSyncStateChange) onSyncStateChange(false);
  }
};

// Update attributes in memory & IndexedDB cache live
export const updateCachedAttributes = (attrs) => {
  if (Array.isArray(attrs)) {
    memoryCache.attributes = attrs;
    idbSet('attributes', attrs);
  }
};

// Invalidate attributes cache when attributes are modified
export const clearAttributesCache = () => {
  memoryCache.attributes = null;
  idbDelete('attributes');
};

// Fetch attributes in parallel
export const fetchAttributes = async (force = false) => {
  if (!force && memoryCache.attributes) return memoryCache.attributes;
  try {
    const attrSnapshot = await getDocs(collection(db, 'question_attributes'));
    const attrData = attrSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    memoryCache.attributes = attrData;
    idbSet('attributes', attrData);
    return attrData;
  } catch (err) {
    return memoryCache.attributes || [];
  }
};

// Full question fetch from Firestore
async function fetchFullQuestionBank({ lockedDepartment, cacheKey }) {
  const questionsRef = collection(db, 'question_bank');
  let qSnapshot;

  try {
    if (lockedDepartment) {
      const attributes = await fetchAttributes();
      const commonNames = attributes.filter(a => a.type === 'department' && isCommonDeptName(a.name)).map(a => a.name);
      const allowed = [...new Set([...deptNameVariants(lockedDepartment), ...commonNames])].slice(0, 30);
      qSnapshot = await getDocs(query(questionsRef, where('department', 'in', allowed)));
    } else {
      qSnapshot = await getDocs(questionsRef);
    }
  } catch (err) {
    console.warn("fetchFullQuestionBank error, trying IDB fallback:", err);
    const fallback = await idbGet(`questions_${cacheKey}`);
    if (fallback && Array.isArray(fallback) && fallback.length > 0) {
      memoryCache.questions[cacheKey] = fallback;
      return fallback;
    }
    throw err;
  }

  const qData = sortQuestionsList(qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  const nowIso = new Date().toISOString();

  // Save to Memory & IndexedDB
  memoryCache.questions[cacheKey] = qData;
  memoryCache.lastSync[cacheKey] = nowIso;

  idbSet(`questions_${cacheKey}`, qData);
  idbSet(`meta_${cacheKey}`, { lastSync: nowIso, count: qData.length });

  return qData;
}

// Background Incremental Sync (Checks only delta records since lastSync)
async function triggerBackgroundSync({ lockedDepartment, cacheKey, onBackgroundUpdate, onSyncStateChange }) {
  if (memoryCache.isSyncing[cacheKey]) return;
  memoryCache.isSyncing[cacheKey] = true;
  if (onSyncStateChange) onSyncStateChange(true);

  try {
    const lastSync = memoryCache.lastSync[cacheKey];
    const existing = memoryCache.questions[cacheKey] || [];

    // If we have a recent sync timestamp, do an ultra-fast delta query!
    if (lastSync && existing.length > 0) {
      const questionsRef = collection(db, 'question_bank');

      // Fetch newly updated or created questions since lastSync in parallel
      const [updatedSnap, createdSnap, countSnap] = await Promise.all([
        getDocs(query(questionsRef, where('updatedAt', '>=', lastSync))),
        getDocs(query(questionsRef, where('createdAt', '>=', lastSync))),
        getCountFromServer(questionsRef).catch(() => null)
      ]);

      const deltaDocs = new Map();
      updatedSnap.docs.forEach(d => deltaDocs.set(d.id, { id: d.id, ...d.data() }));
      createdSnap.docs.forEach(d => deltaDocs.set(d.id, { id: d.id, ...d.data() }));

      const serverCount = countSnap ? countSnap.data().count : null;

      // If server count changed significantly (e.g. external deletions) and delta is empty,
      // reconcile in the background (only for department-scoped views to avoid massive full downloads)
      if (serverCount !== null && lockedDepartment && Math.abs(serverCount - existing.length) > 2 && deltaDocs.size === 0) {
        const fullQ = await fetchFullQuestionBank({ lockedDepartment, cacheKey });
        if (onBackgroundUpdate) onBackgroundUpdate({ questions: fullQ, attributes: memoryCache.attributes });
        return;
      }

      if (deltaDocs.size > 0) {
        const updatedMap = new Map(existing.map(q => [q.id, q]));
        deltaDocs.forEach((docData, id) => {
          // If lockedDepartment, check if doc matches department
          if (lockedDepartment) {
            const allowed = deptNameVariants(lockedDepartment);
            if (!allowed.includes(docData.department) && !isCommonDeptName(docData.department)) {
              return;
            }
          }
          updatedMap.set(id, docData);
        });

        const merged = sortQuestionsList(Array.from(updatedMap.values()));
        const nowIso = new Date().toISOString();

        memoryCache.questions[cacheKey] = merged;
        memoryCache.lastSync[cacheKey] = nowIso;
        idbSet(`questions_${cacheKey}`, merged);
        idbSet(`meta_${cacheKey}`, { lastSync: nowIso, count: merged.length });

        if (onBackgroundUpdate) {
          onBackgroundUpdate({ questions: merged, attributes: memoryCache.attributes });
        }
      } else {
        // Just touch lastSync
        const nowIso = new Date().toISOString();
        memoryCache.lastSync[cacheKey] = nowIso;
        idbSet(`meta_${cacheKey}`, { lastSync: nowIso, count: existing.length });
      }
    } else if (lockedDepartment) {
      // First background sync without timestamp (only for scoped department)
      const questions = await fetchFullQuestionBank({ lockedDepartment, cacheKey });
      if (onBackgroundUpdate) {
        onBackgroundUpdate({ questions, attributes: memoryCache.attributes });
      }
    }
  } catch (err) {
  } finally {
    memoryCache.isSyncing[cacheKey] = false;
    if (onSyncStateChange) onSyncStateChange(false);
  }
}

// ==========================================
// PRE-WARMER HELPER (Call on App/Dashboard Mount)
// ==========================================
export const prewarmQuestionBankCache = (lockedDepartment = null) => {
  const cacheKey = lockedDepartment ? `dept_${lockedDepartment}` : 'all';

  // If already in memory, nothing to do
  if (memoryCache.questions[cacheKey]) return;

  // Use requestIdleCallback if available, or setTimeout
  const runner = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 100);

  runner(async () => {
    try {
      // Warm IndexedDB into memory
      const [storedQ, storedAttr, storedMeta] = await Promise.all([
        idbGet(`questions_${cacheKey}`),
        idbGet('attributes'),
        idbGet(`meta_${cacheKey}`)
      ]);

      if (storedQ && Array.isArray(storedQ) && storedQ.length > 0) {
        memoryCache.questions[cacheKey] = storedQ;
        if (storedAttr) memoryCache.attributes = storedAttr;
        if (storedMeta?.lastSync) memoryCache.lastSync[cacheKey] = storedMeta.lastSync;
        // Silently sync delta
        triggerBackgroundSync({ lockedDepartment, cacheKey });
      }
    } catch (e) {
    }
  });
};
