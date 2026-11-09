const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { sendWebhookEmailToEach } = require('./emailWebhook');

// Same Google Apps Script email webhook as the solution-release emails (functions/.env GAS_WEBHOOK_URL)
const GAS_WEBHOOK_URL = defineString('GAS_WEBHOOK_URL', { default: '' });

// Optional link to the site in the emails, e.g. https://msgateacademy.web.app (functions/.env SITE_URL)
const SITE_URL = defineString('SITE_URL', { default: '' });

const REMINDER_WINDOW_MS = 30 * 60 * 1000;
// Tests store scheduledTime as the admin's local time with no zone ("2026-10-02T10:00"). The
// academy runs on Indian time, so the server reads it as IST (UTC+5:30, no daylight saving).
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parseIst = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const ms = Date.parse(`${value.slice(0, 16)}:00${IST_OFFSET}`);
  return Number.isNaN(ms) ? null : ms;
};

// "YYYY-MM-DDTHH:mm" for a moment, in IST - the same string format scheduledTime uses
const istString = (ms) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);

const formatIst = (ms) => new Date(ms).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
});

// "Chemical (CH)" and "Chemical Engineering (CH)" and "CHEMICAL ENGINEERING" are the same department
const deptCode = (name) => ((name || '').match(/\(([^)]+)\)/) || [])[1]?.trim().toLowerCase() || '';
const baseName = (name) => (name || '').replace(/\([^)]*\)/g, '').trim().toLowerCase().replace(/\s+engineering$/, '').trim();
const sameDept = (a, b) => {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  if (/ap+titude/.test(x) && /ap+titude/.test(y)) return true;
  if ((x.includes('mathematics') || x.includes('maths')) && (y.includes('mathematics') || y.includes('maths'))) return true;
  const cx = deptCode(a);
  const cy = deptCode(b);
  if ((!!cx && (cx === y || cx === cy)) || (!!cy && cy === x)) return true;
  const bx = baseName(a);
  return !!bx && bx === baseName(b);
};

const isCommonDeptName = (name) => {
  const n = (name || '').trim().toLowerCase();
  return n === 'engineering mathematics' || /ap+titude/.test(n) || n.includes('mathematics') || n.includes('maths');
};

const FULL_BUNDLE_PERMISSIONS = ['tests', 'live_classes', 'recordings', 'notes'];
// Elite: owns a bundle with every resource ticked (keep in sync with src/utils/membership.js)
const isElite = (student, bundles) => {
  if (student?.isPro === true) return true;
  const purchased = Array.isArray(student.purchasedBundles) ? student.purchasedBundles : [];
  return (bundles || []).some(b => {
    if (!purchased.includes(b.id)) return false;
    const isNamedElite = b.tier === 'elite' || b.isElite === true || /elite/i.test(b.name || '');
    const isFull = (!b.permissions || FULL_BUNDLE_PERMISSIONS.every(p => b.permissions.includes(p))) || isNamedElite;
    if (!isFull) return false;
    return b.department === 'General' || b.department === 'All' || !student.department || sameDept(b.department, student.department);
  });
};

// Keep in sync with canAccessTest() in src/utils/testAccess.js
const canAccessTest = (test, student, bundles) => {
  if (student?.isPro === true) return true;
  if (test.bundleId === 'free') return true;
  if (test.bundleId === undefined && (test.createdBy === 'Admin' || test.createdBy === 'MS Academy Admin')) return true;

  // Elite students get common tests (Aptitude & Mathematics) across all departments, and tests for their own department
  if (isElite(student, bundles)) {
    if (isCommonDeptName(test.department) || test.department === 'All' || test.department === 'General' || !student.department || sameDept(student.department, test.department)) {
      return true;
    }
  }

  // Limited to specific bundles: bundleIds (any one unlocks it), or the older single bundleId
  const onlyBundles = Array.isArray(test.bundleIds) && test.bundleIds.length ? test.bundleIds : (test.bundleId && test.bundleId !== 'free' ? [test.bundleId] : []);
  const purchased = Array.isArray(student.purchasedBundles) ? student.purchasedBundles : [];
  if (onlyBundles.length && onlyBundles.some(id => purchased.includes(id))) return true;

  return (bundles || []).some(b =>
    purchased.includes(b.id) &&
    (sameDept(b.department, test.department) || (isCommonDeptName(test.department) && (isCommonDeptName(b.department) || b.department === 'General' || b.department === 'All'))) &&
    (!b.permissions || b.permissions.includes('tests'))
  );
};

const testEmail = (kind, test, startMs) => {
  const closeMs = parseIst(test.closesAt);
  const title = escapeHtml(test.title || 'Test');
  const siteUrl = SITE_URL.value();
  const heading = kind === 'reminder'
    ? `Your test starts in 30 minutes`
    : kind === 'rescheduled' ? 'A test has been rescheduled' : 'A new test has been scheduled';
  const subject = kind === 'reminder'
    ? `Starting in 30 minutes: ${test.title}`
    : kind === 'rescheduled' ? `Test rescheduled: ${test.title}` : `New test scheduled: ${test.title}`;
  const rows = [
    ['Test', title],
    ['Subject', escapeHtml(test.subject || '-')],
    ['Opens at', escapeHtml(formatIst(startMs))],
    closeMs !== null ? ['Closes at', escapeHtml(formatIst(closeMs))] : null,
    ['Duration', `${escapeHtml(test.duration || 0)} minutes`],
    ['Questions', escapeHtml(Array.isArray(test.questions) ? test.questions.length : 0)],
  ].filter(Boolean);
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">${heading}</h2>
      <table style="border-collapse: collapse; margin: 8px 0 16px;">
        ${rows.map(([k, v]) => `<tr><td style="padding: 4px 16px 4px 0; color: #64748b;">${k}</td><td style="padding: 4px 0; font-weight: bold;">${v}</td></tr>`).join('')}
      </table>
      <p>${kind === 'reminder'
        ? 'Log in to your MS Academy dashboard and open the Tests tab - the test unlocks at the time above.'
        : 'The test can only be started from the time above. You will get another reminder 30 minutes before it opens.'}</p>
      ${siteUrl ? `<p><a href="${escapeHtml(siteUrl)}/student" style="color: #2563eb; font-weight: bold;">Open MS Academy</a></p>` : ''}
    </div>
  `;
  return { subject, html };
};

const sendEmails = async (emails, { subject, html }) => {
  // One email per student (no shared recipient list); only replies of { status: 'success' } count
  const webhookUrl = GAS_WEBHOOK_URL.value();
  if (!webhookUrl) {
    console.warn(`GAS_WEBHOOK_URL is not set - skipped "${subject}" for ${emails.length} student(s).`);
    return 0;
  }
  return sendWebhookEmailToEach(webhookUrl, emails, { subject, html });
};

// Every 5 minutes: email the students who can take each upcoming test
//   - once when it is scheduled (or moved to a new time): "New test scheduled" / "Test rescheduled"
//   - once when it is 30 minutes or less from opening: "Starting in 30 minutes"
// The test document remembers which scheduledTime each email went out for (scheduleNotifiedFor /
// reminderSentFor), so nothing is sent twice and a reschedule triggers fresh emails.
exports.sendTestNotifications = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Asia/Kolkata' }, async () => {
  const db = admin.firestore();
  const now = Date.now();

  // Only tests that haven't opened yet (scheduledTime strings sort chronologically)
  const upcoming = await db.collection('tests').where('scheduledTime', '>', istString(now)).get();
  if (upcoming.empty) return;

  let bundles = null;
  let allStudentsCache = null;
  const studentsByDept = {};

  for (const testDoc of upcoming.docs) {
    const test = testDoc.data();
    const startMs = parseIst(test.scheduledTime);
    if (startMs === null || startMs <= now) continue;

    const reminderDue = startMs - now <= REMINDER_WINDOW_MS && test.reminderSentFor !== test.scheduledTime;
    const scheduleDue = !reminderDue && test.scheduleNotifiedFor !== test.scheduledTime;
    if (!reminderDue && !scheduleDue) continue;
    const kind = reminderDue ? 'reminder' : test.scheduleNotifiedFor ? 'rescheduled' : 'scheduled';

    // Claim first so an overlapping run (or a retry) can never send the same email twice.
    // A reminder also covers the "scheduled" notice for a test set up less than 30 minutes ahead.
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(testDoc.ref);
      const data = fresh.data();
      if (!fresh.exists || data.scheduledTime !== test.scheduledTime) return false;
      if (reminderDue && data.reminderSentFor === test.scheduledTime) return false;
      if (scheduleDue && data.scheduleNotifiedFor === test.scheduledTime) return false;
      tx.update(testDoc.ref, reminderDue
        ? { reminderSentFor: test.scheduledTime, scheduleNotifiedFor: test.scheduledTime }
        : { scheduleNotifiedFor: test.scheduledTime });
      return true;
    });
    if (!claimed) continue;

    try {
      if (bundles === null) {
        const snap = await db.collection('course_bundles').get();
        bundles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      if (!allStudentsCache) {
        const snap = await db.collection('joined_students').get();
        allStudentsCache = snap.docs.map(d => d.data());
      }
      
      let candidateStudents = [];
      if (isCommonDeptName(test.department) || test.department === 'All' || test.department === 'General') {
        candidateStudents = allStudentsCache;
      } else {
        candidateStudents = allStudentsCache.filter(s => sameDept(s.department, test.department));
      }

      const emails = [...new Set(candidateStudents
        .filter(s => s.email && canAccessTest(test, s, bundles))
        .map(s => s.email.trim().toLowerCase()))];
      if (emails.length === 0) continue;

      const sent = await sendEmails(emails, testEmail(kind, test, startMs));
      console.log(`Test ${testDoc.id} ("${test.title}"): ${kind} email sent to ${sent}/${emails.length} student(s).`);
    } catch (err) {
      console.error(`Test ${testDoc.id}: ${kind} notification failed:`, err);
    }
  }
});
