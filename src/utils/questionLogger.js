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
 * Robustly counts questions by format: Single Choice (MCQ), Multiple Choice (MSQ), Fill in Blanks (NAT), Match
 */
export const countQuestionTypes = (questions = []) => {
  const counts = { singleChoice: 0, multipleChoice: 0, nat: 0, match: 0 };
  const list = Array.isArray(questions) ? questions : (questions ? [questions] : []);

  for (const q of list) {
    if (!q) continue;
    const raw = String(q.questionType || '').trim().toLowerCase();
    if (raw === 'multiple choice' || raw === 'multiple select' || raw === 'msq') {
      counts.multipleChoice += 1;
    } else if (
      raw.includes('fill') || 
      raw.includes('blank') || 
      raw.includes('numerical') || 
      raw === 'nat'
    ) {
      counts.nat += 1;
    } else if (raw.includes('match')) {
      counts.match += 1;
    } else {
      counts.singleChoice += 1;
    }
  }

  return counts;
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

    const questionsList = Array.isArray(entry.questions) 
      ? entry.questions 
      : (entry.question ? [entry.question] : []);

    let questionTypes = entry.questionTypes;
    const qtSum = questionTypes 
      ? ((Number(questionTypes.singleChoice) || 0) + (Number(questionTypes.multipleChoice) || 0) + (Number(questionTypes.nat) || 0) + (Number(questionTypes.match) || 0))
      : 0;

    if (qtSum === 0 && questionsList.length > 0) {
      questionTypes = countQuestionTypes(questionsList);
    } else if (!questionTypes) {
      questionTypes = {
        singleChoice: 0,
        multipleChoice: 0,
        nat: 0,
        match: 0
      };
    } else {
      questionTypes = {
        singleChoice: Number(questionTypes.singleChoice) || 0,
        multipleChoice: Number(questionTypes.multipleChoice) || 0,
        nat: Number(questionTypes.nat) || 0,
        match: Number(questionTypes.match) || 0
      };
    }

    const importedCount = Number(entry.importedCount ?? (questionsList.length || 0));
    const diagramCount = Number(
      entry.diagramCount !== undefined 
        ? entry.diagramCount 
        : (questionsList.length > 0 ? questionsList.filter(hasDiagram).length : 0)
    );

    let pageCount = Number(entry.pagesExtracted ?? entry.pageCount ?? 0);
    if (!pageCount && questionsList.length > 0) {
      const pNums = new Set();
      questionsList.forEach(q => {
        if (q.page) pNums.add(Number(q.page));
        if (Array.isArray(q.images)) {
          q.images.forEach(img => {
            if (img && img.page != null) pNums.add(Number(img.page));
          });
        }
      });
      if (pNums.size > 0) {
        pageCount = Math.max(...pNums);
      }
    }
    if (!pageCount && importedCount > 0) {
      pageCount = Math.max(1, Math.round((diagramCount * 0.8) + (Math.max(0, importedCount - diagramCount) * 0.4)));
    }
    if (!pageCount) {
      pageCount = 1;
    }

    const payload = sanitizePayload({
      batchId: entry.batchId || `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      type: entry.type || 'import', // 'import', 'direct_push', 'approval', 'rejection'
      action: entry.action || 'Question Import Activity',
      fileName: entry.fileName || 'Question Batch',
      department: entry.department || '',
      subject: entry.subject || '',
      topic: entry.topic || '',
      pagesExtracted: pageCount,
      pageCount: pageCount,
      totalExtracted: Number(entry.totalExtracted || importedCount || 0),
      importedCount,
      pushedCount: Number(entry.pushedCount ?? importedCount),
      skippedCount: Number(entry.skippedCount || 0),
      rejectedCount: Number(entry.rejectedCount || 0),
      diagramCount,
      textOnlyCount: Math.max(0, importedCount - diagramCount),
      questionTypes,
      user: entry.user || currentUser,
      importedBy: entry.importedBy || (entry.type === 'rejection' ? null : currentUser),
      pushedBy: entry.pushedBy || (Number(entry.pushedCount ?? importedCount) > 0 ? currentUser : null),
      rejectedBy: entry.rejectedBy || (Number(entry.rejectedCount || 0) > 0 ? currentUser : null),
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
