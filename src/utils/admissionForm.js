// Admission Application Form: every student fills it in (with photo and signature) before they can
// use the student portal or pay for anything. The form lives in admission_forms/{joined_students id};
// the student record only carries admissionFormSubmitted / admissionFormNo, so the admin student list
// doesn't download everyone's photo and signature.
import { db } from '../firebase';
import { doc, getDoc, runTransaction, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { STUDENT_DEPARTMENTS } from './subjects';

export const ADMISSION_FORMS = 'admission_forms';

export const GENDERS = ['Male', 'Female', 'Other'];
export const CURRENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];
export const GATE_PAPERS = [...STUDENT_DEPARTMENTS, 'Other'];
export const REFERRAL_SOURCES = ['Friend / Senior', 'Social media', 'Poster / Flex', 'College visit', 'Google search', 'Other'];

export const gateYearOptions = () => {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2, y + 3].map(String);
};

export const RULES = [
  {
    title: 'Admission and Fees',
    items: ['Admission is confirmed only after this form is fully filled in, signed, and the full payment is paid.'],
  },
  {
    title: 'Refund Policy',
    items: ['Fees once paid are not refundable.'],
  },
  {
    title: 'Online Classes, Recordings and Study Material',
    items: [
      'Login details, recordings, notes, e-content and test series access are for the enrolled student’s personal use only. Sharing a login with anyone else is not allowed.',
      'Sharing, forwarding, copying, recording, uploading or selling any class, recording, notes or test is strictly prohibited. All material is the copyright of MS GATE Academy.',
      'If an account is found to be shared or misused, access will be blocked without refund.',
    ],
  },
  {
    title: 'Privacy and Communication',
    items: [
      'The Academy will use the student’s details (phone number, email, address, photo) only for admission, classes, communication and Academy purposes, and will not share them with outside parties for their own use.',
      'The student agrees to receive updates, reminders and test information from the Academy by WhatsApp, SMS and email.',
    ],
  },
  {
    title: 'Achievers and Photos',
    items: [
      'Our student’s success is our pride! By joining, you allow MS GATE Academy to feature your name, photo, rank and course in our achievers list and advertisements. Your phone number and address will never be shown.',
      'To be featured, we just need your GATE scorecard – please share it with us when your results are out.',
    ],
  },
  {
    title: 'Changes to Rules',
    items: ['The Academy may update these rules from time to time and will inform students in writing or through the official WhatsApp group.'],
  },
];

export const DECLARATION = 'I declare that the information given in this form is true and correct. I have read and understood the Rules and Regulations of MS GATE Academy and I agree to follow them.';

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 2026-10-06 -> 06/10/2026
export const formatFormDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '');
};

export const emptyAdmissionForm = () => ({
  ugBatch: '',
  fullName: '',
  dob: '',
  gender: '',
  mobile: '',
  whatsapp: '',
  email: '',
  address: '',
  degreeBranch: '',
  college: '',
  currentYear: '',
  passingYear: '',
  cgpa: '',
  gatePaper: '',
  gateYear: '',
  referralSources: [],
  referralOther: '',
  declarationAccepted: false,
  photo: '',
  signature: '',
});

const digits = (s) => String(s || '').replace(/\D/g, '');

// { field: message } for every missing or invalid answer (empty object = ready to submit)
export const validateAdmissionForm = (f) => {
  const e = {};
  const need = (k, msg) => { if (!String(f[k] || '').trim()) e[k] = msg; };
  need('fullName', 'Enter your full name as per ID');
  need('dob', 'Enter your date of birth');
  need('gender', 'Select your gender');
  need('email', 'Enter your email ID');
  need('address', 'Enter your permanent address');
  need('ugBatch', 'Enter your UG batch, e.g. 2022-2026');
  need('degreeBranch', 'Enter your degree / branch');
  need('college', 'Enter your college');
  need('currentYear', 'Select your current year');
  need('passingYear', 'Enter your year of passing');
  need('cgpa', 'Enter your CGPA / percentage');
  need('gatePaper', 'Select your GATE paper');
  need('gateYear', 'Select the GATE year you are appearing');
  if (digits(f.mobile).length !== 10) e.mobile = 'Enter a 10-digit mobile number';
  if (digits(f.whatsapp).length !== 10) e.whatsapp = 'Enter a 10-digit WhatsApp number';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email ID';
  if (f.ugBatch && !/^\d{4}\s*-\s*\d{4}$/.test(f.ugBatch.trim())) e.ugBatch = 'Use the format 2022-2026';
  if (f.passingYear && !/^\d{4}$/.test(String(f.passingYear).trim())) e.passingYear = 'Enter a 4-digit year';
  if (f.dob) {
    const age = (Date.now() - new Date(f.dob).getTime()) / (365.25 * 864e5);
    if (!(age >= 14 && age <= 70)) e.dob = 'Check your date of birth';
  }
  if (!f.referralSources?.length) e.referralSources = 'Tell us how you heard about us';
  else if (f.referralSources.includes('Other') && !f.referralOther.trim()) e.referralSources = 'Tell us where you heard about us';
  if (!f.photo) e.photo = 'Upload your passport-size photo';
  if (!f.signature) e.signature = 'Add your signature';
  if (!f.declarationAccepted) e.declarationAccepted = 'Accept the declaration';
  return e;
};

// ---- Images (kept small: they're stored inside the Firestore form document)

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('That file is not a valid image.'));
  img.src = src;
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the selected file.'));
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

export const MAX_IMAGE_MB = 10;

const readImageFile = async (file) => {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).');
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`The image must be under ${MAX_IMAGE_MB} MB.`);
  return loadImage(await fileToDataUrl(file));
};

// Passport photo: centre-cropped to 3.5 x 4.5 and saved as a ~30 KB JPEG
const PHOTO_W = 350;
const PHOTO_H = 450;
export const processPhoto = async (file) => {
  const img = await readImageFile(file);
  const ratio = PHOTO_W / PHOTO_H;
  let sw = img.width;
  let sh = img.height;
  if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
  // Faces sit in the upper part of a photo, so a tall picture is cropped from nearer the top
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.3, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  return canvas.toDataURL('image/jpeg', 0.85);
};

// Square profile picture made from the passport photo (same size StudentProfile uses)
export const photoToAvatar = async (photoUrl) => {
  const img = await loadImage(photoUrl);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const side = Math.min(img.width, img.height);
  canvas.getContext('2d').drawImage(img, (img.width - side) / 2, 0, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
};

// Signature: the paper background becomes transparent and the ink is cropped tight, so a phone
// photo of a signature sits cleanly on the signature line. Works on a drawn (transparent) canvas too.
const SIG_MAX_W = 600;
const SIG_MAX_H = 200;
const signatureFromImage = (img) => {
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Brightness of each pixel as seen on white paper
  const lum = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    const r = px[i * 4] * a + 255 * (1 - a);
    const g = px[i * 4 + 1] * a + 255 * (1 - a);
    const b = px[i * 4 + 2] * a + 255 * (1 - a);
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    hist[Math.min(255, Math.round(lum[i]))] += 1;
  }
  // The paper is most of the picture: take the brightness that 60% of pixels reach as the background
  let acc = 0;
  let paper = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= w * h * 0.4) { paper = v; break; }
  }
  const full = Math.max(10, paper - 90); // this dark or darker = solid ink
  const none = Math.max(full + 10, paper - 30); // this light or lighter = paper

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    const alpha = lum[i] >= none ? 0 : lum[i] <= full ? 1 : (none - lum[i]) / (none - full);
    // Deepen the ink a little so a faint pen photo still reads clearly
    px[i * 4] = Math.round(px[i * 4] * 0.55);
    px[i * 4 + 1] = Math.round(px[i * 4 + 1] * 0.55);
    px[i * 4 + 2] = Math.round(px[i * 4 + 2] * 0.6);
    px[i * 4 + 3] = Math.round(alpha * 255);
    if (alpha > 0.25) {
      const x = i % w;
      const y = (i - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(data, 0, 0);
  if (maxX < 0 || (maxX - minX) * (maxY - minY) < 40) {
    throw new Error("We couldn't find a signature in that image. Use a clear photo of your signature on plain white paper.");
  }

  const pad = 6;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w, maxX + pad + 1) - sx;
  const sh = Math.min(h, maxY + pad + 1) - sy;
  const out = Math.min(1, SIG_MAX_W / sw, SIG_MAX_H / sh);
  const result = document.createElement('canvas');
  result.width = Math.max(1, Math.round(sw * out));
  result.height = Math.max(1, Math.round(sh * out));
  result.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, result.width, result.height);
  return result.toDataURL('image/png');
};

export const processSignatureFile = async (file) => signatureFromImage(await readImageFile(file));
export const processSignatureCanvas = (canvas) => signatureFromImage(canvas);

// The first image in a paste event (a screenshot or a copied picture), or null
export const imageFromClipboard = (event) => {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
};

// ---- Saving

// Next sequential form number (MSGA-2026-0001); a time-based one if the counter can't be updated
const nextFormNo = async () => {
  const year = new Date().getFullYear();
  try {
    const n = await runTransaction(db, async (tx) => {
      const ref = doc(db, 'site_settings', 'admission_forms');
      const snap = await tx.get(ref);
      const next = (snap.exists() ? Number(snap.data().lastFormNumber) || 0 : 0) + 1;
      tx.set(ref, { lastFormNumber: next }, { merge: true });
      return next;
    });
    return `MSGA-${year}-${String(n).padStart(4, '0')}`;
  } catch (e) {
    console.warn('Form number counter unavailable, using a time-based number', e);
    return `MSGA-${year}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }
};

// Saves the signed form and marks the student record as submitted. studentId may be null for a
// student with no joined_students record yet - one is created. Resolves with { formNo, studentId }.
export const submitAdmissionForm = async (studentId, form, { existingAvatar } = {}) => {
  const formNo = await nextFormNo();
  const studentRef = studentId ? doc(db, 'joined_students', studentId) : doc(collection(db, 'joined_students'));
  const applicationDate = todayIso();
  const referral = form.referralSources.map(s => (s === 'Other' ? `Other: ${form.referralOther.trim()}` : s));
  const clean = (s) => String(s || '').trim();

  const record = {
    studentId: studentRef.id,
    formNo,
    applicationDate,
    signedDate: applicationDate,
    ugBatch: clean(form.ugBatch).replace(/\s*-\s*/, '-'),
    fullName: clean(form.fullName),
    dob: form.dob,
    gender: form.gender,
    mobile: digits(form.mobile),
    whatsapp: digits(form.whatsapp),
    email: clean(form.email).toLowerCase(),
    loginEmail: sessionStorage.getItem('auth_email') || '',
    address: clean(form.address),
    degreeBranch: clean(form.degreeBranch),
    college: clean(form.college),
    currentYear: form.currentYear,
    passingYear: clean(form.passingYear),
    cgpa: clean(form.cgpa),
    gatePaper: form.gatePaper,
    gateYear: form.gateYear,
    referralSources: form.referralSources,
    referralOther: clean(form.referralOther),
    declarationAccepted: true,
    photo: form.photo,
    signature: form.signature,
    submittedAt: serverTimestamp(),
  };

  const studentUpdate = {
    admissionFormSubmitted: true,
    admissionFormNo: formNo,
    admissionSubmittedAt: serverTimestamp(),
    name: record.fullName,
    mobileNumber: record.mobile,
    whatsappNumber: record.whatsapp,
    department: record.gatePaper,
    collegeName: record.college,
    yearOfStudy: record.currentYear,
    batch: record.ugBatch,
    cgpa: record.cgpa,
    referralSource: referral.join(', '),
    onboardingCompleted: true,
  };
  if (!existingAvatar) {
    try { studentUpdate.avatarUrl = await photoToAvatar(form.photo); } catch { /* keep no avatar */ }
  }

  const batch = writeBatch(db);
  batch.set(doc(db, ADMISSION_FORMS, studentRef.id), record);
  if (studentId) {
    batch.update(studentRef, studentUpdate);
  } else {
    batch.set(studentRef, {
      ...studentUpdate,
      email: record.loginEmail || record.email,
      joinedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Active',
      lastLogin: serverTimestamp(),
    });
  }
  await batch.commit();
  return { formNo, studentId: studentRef.id };
};

export const fetchAdmissionForm = async (studentId) => {
  const snap = await getDoc(doc(db, ADMISSION_FORMS, studentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ---- Draft kept in this browser so a refresh doesn't lose what was typed

const draftKey = (email) => `admission_draft_${(email || '').toLowerCase()}`;
export const loadDraft = (email) => {
  try { return JSON.parse(localStorage.getItem(draftKey(email)) || 'null'); } catch { return null; }
};
export const saveDraft = (email, form) => {
  try { localStorage.setItem(draftKey(email), JSON.stringify(form)); } catch { /* storage full or blocked */ }
};
export const clearDraft = (email) => {
  try { localStorage.removeItem(draftKey(email)); } catch { /* ignore */ }
};
