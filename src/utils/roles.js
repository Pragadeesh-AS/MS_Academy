// Central definition of the multi-role login system. An admin can invite the
// same email address into several roles (teacher, typist, reviewer, and/or
// enroll them as a student) - each role lives in its own Firestore collection,
// so one email can legitimately match more than one of the checks below.
// resolveUserRoles() runs all of them and returns every role that email holds,
// so the UI can offer a "switch dashboard" control instead of picking just one.
import { db } from '../firebase';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';

export const ADMIN_EMAILS = ['msgateacademy2026@gmail.com', 'msacademy2026@gmail.com', 'msgateacademy@gmail.com'];

// 'reviewer' shares the /typist-dashboard route and the 'typist' sessionStorage
// auth_role with 'typist' - only localStorage 'pair_role' tells them apart -
// see getActiveRoleKey()/switchToRole() below.
export const ROLE_META = {
  admin: { label: 'Admin', path: '/admin' },
  teacher: { label: 'Teacher', path: '/teacher-dashboard' },
  typist: { label: 'Typist', path: '/typist-dashboard' },
  reviewer: { label: 'Reviewer', path: '/typist-dashboard' },
  student: { label: 'Student', path: '/student' },
};

const ROLE_PRIORITY = ['admin', 'teacher', 'typist', 'reviewer', 'student'];

// Every role an email is currently assigned to, most-privileged first isn't
// guaranteed - use pickPrimaryRole() to choose where to land after login.
export async function resolveUserRoles(email) {
  const normalized = (email || '').toLowerCase();
  const roles = [];

  if (ADMIN_EMAILS.includes(normalized)) {
    roles.push({ role: 'admin' });
  }

  try {
    const teacherSnap = await getDocs(query(collection(db, 'invited_teachers'), where('email', '==', email)));
    if (!teacherSnap.empty) {
      const teacherDoc = teacherSnap.docs[0];
      await updateDoc(doc(db, 'invited_teachers', teacherDoc.id), { status: 'Accepted', lastLogin: serverTimestamp() });
      roles.push({ role: 'teacher', name: teacherDoc.data().name || null });
    }
  } catch (e) {
    console.error('Failed to check teacher role', e);
  }

  try {
    const typistSnap = await getDocs(query(collection(db, 'invited_typists'), where('typistEmail', '==', email)));
    if (!typistSnap.empty) {
      const pairDoc = typistSnap.docs[0];
      roles.push({ role: 'typist', pairId: pairDoc.id, name: pairDoc.data().typistName || null });
    }
  } catch (e) {
    console.error('Failed to check typist role', e);
  }

  try {
    const reviewerSnap = await getDocs(query(collection(db, 'invited_typists'), where('reviewerEmail', '==', email)));
    if (!reviewerSnap.empty) {
      const pairDoc = reviewerSnap.docs[0];
      roles.push({ role: 'reviewer', pairId: pairDoc.id, name: pairDoc.data().reviewerName || null });
    } else {
      const aiSnap = await getDoc(doc(db, 'site_settings', 'ai_review'));
      if (aiSnap.exists() && (aiSnap.data().reviewerEmail || '').toLowerCase() === normalized) {
        roles.push({ role: 'reviewer', pairId: 'ai-review', name: null });
      }
    }
  } catch (e) {
    console.error('Failed to check reviewer role', e);
  }

  try {
    const studentSnap = await getDocs(query(collection(db, 'joined_students'), where('email', '==', email)));
    if (!studentSnap.empty) {
      roles.push({ role: 'student', name: studentSnap.docs[0].data().name || null });
    }
  } catch (e) {
    console.error('Failed to check student role', e);
  }

  // A brand-new email with no invite and no prior enrollment - treat as a
  // regular self-service student, same as before multi-role support existed.
  if (roles.length === 0) {
    roles.push({ role: 'student' });
  }

  return roles;
}

export function pickPrimaryRole(roles) {
  for (const key of ROLE_PRIORITY) {
    const match = roles.find(r => r.role === key);
    if (match) return match;
  }
  return roles[0];
}

// The sessionStorage 'auth_role' value is 'typist' for both typists and
// reviewers (they share a dashboard route); the sub-role only lives in
// localStorage 'pair_role'. This resolves which one is actually active.
export function getActiveRoleKey() {
  const role = sessionStorage.getItem('auth_role');
  if (role === 'typist') {
    return localStorage.getItem('pair_role') === 'reviewer' ? 'reviewer' : 'typist';
  }
  return role;
}

export function getStoredRoles() {
  try {
    const raw = sessionStorage.getItem('auth_roles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Applies a role descriptor (as returned by resolveUserRoles) as the active
// session role and, for navigate, sends the user to its dashboard.
export function switchToRole(descriptor, navigate) {
  const sessionRole = descriptor.role === 'reviewer' ? 'typist' : descriptor.role;
  sessionStorage.setItem('auth_role', sessionRole);

  if (descriptor.role === 'typist' || descriptor.role === 'reviewer') {
    localStorage.setItem('pair_id', descriptor.pairId);
    localStorage.setItem('pair_role', descriptor.role);
  } else {
    localStorage.removeItem('pair_id');
    localStorage.removeItem('pair_role');
  }

  window.dispatchEvent(new Event('storage'));
  if (navigate) navigate(ROLE_META[descriptor.role].path, { replace: true });
}
