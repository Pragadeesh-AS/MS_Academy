import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Checks if a question has any diagram or image attached.
 */
export const hasDiagram = (q) => {
  if (!q) return false;
  return Boolean(
    q.questionImageUrl ||
    q.optionAImage ||
    q.optionBImage ||
    q.optionCImage ||
    q.optionDImage ||
    q.explanationImage ||
    (q.crops && typeof q.crops === 'object' && Object.keys(q.crops).some(k => Array.isArray(q.crops[k]) && q.crops[k].length > 0)) ||
    (Array.isArray(q.images) && q.images.length > 0)
  );
};

/**
 * Helper to clean undefined values before saving to Firestore.
 */
const sanitizePayload = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  if (typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = sanitizePayload(v);
    }
    return clean;
  }
  return obj;
};

/**
 * Records an activity log entry into Firestore 'question_import_logs'.
 */
export const logQuestionActivity = async (entry = {}) => {
  try {
    const currentUser = {
      name: sessionStorage.getItem('auth_name') || 'Admin',
      email: (sessionStorage.getItem('auth_email') || '').toLowerCase(),
      role: sessionStorage.getItem('user_role') || 'Admin'
    };

    const payload = sanitizePayload({
      batchId: entry.batchId || `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      type: entry.type || 'import', // 'import', 'direct_push', 'approval', 'rejection'
      action: entry.action || 'Question Import Activity',
      fileName: entry.fileName || 'Question Batch',
      department: entry.department || '',
      subject: entry.subject || '',
      topic: entry.topic || '',
      totalExtracted: Number(entry.totalExtracted || entry.importedCount || 0),
      importedCount: Number(entry.importedCount || 0),
      pushedCount: Number(entry.pushedCount || 0),
      skippedCount: Number(entry.skippedCount || 0),
      rejectedCount: Number(entry.rejectedCount || 0),
      diagramCount: Number(entry.diagramCount || 0),
      textOnlyCount: Math.max(0, Number(entry.importedCount || 0) - Number(entry.diagramCount || 0)),
      questionTypes: entry.questionTypes || {
        singleChoice: 0,
        multipleChoice: 0,
        nat: 0,
        match: 0
      },
      user: entry.user || currentUser,
      importedBy: entry.importedBy || (entry.type === 'rejection' ? null : currentUser),
      pushedBy: entry.pushedBy || (entry.pushedCount > 0 ? currentUser : null),
      rejectedBy: entry.rejectedBy || (entry.rejectedCount > 0 ? currentUser : null),
      reviewerEmail: entry.reviewerEmail || '',
      notes: entry.notes || '',
      createdAt: entry.createdAt || new Date().toISOString()
    });

    const docRef = await addDoc(collection(db, 'question_import_logs'), payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.warn('Failed to log question activity:', error);
    return null;
  }
};
