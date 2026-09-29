const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Same Google Apps Script webhook the admin site uses for the manual unlock email
// (VITE_GAS_WEBHOOK_URL). Set in functions/.env as GAS_WEBHOOK_URL=...
const GAS_WEBHOOK_URL = defineString('GAS_WEBHOOK_URL', { default: '' });

const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Keep in sync with solutionsEmail() in src/utils/solutionRelease.js
const solutionsEmail = (testTitle) => ({
  subject: `Solutions Unlocked: ${testTitle}`,
  html: `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Solutions are now available!</h2>
      <p>The solutions and explanations for the test <strong>${escapeHtml(testTitle)}</strong> have been unlocked by your teacher.</p>
      <p>You can now log in to your dashboard and review your detailed performance.</p>
    </div>
  `
});

const emailStudents = async (db, testId, testTitle) => {
  const attempts = await db.collection('test_attempts').where('testId', '==', testId).get();
  const emails = [...new Set(attempts.docs.map(d => d.data().studentEmail).filter(Boolean))];
  if (emails.length === 0) return 0;

  const webhookUrl = GAS_WEBHOOK_URL.value();
  if (!webhookUrl) {
    console.warn(`GAS_WEBHOOK_URL is not set - released test ${testId} without emailing ${emails.length} student(s).`);
    return 0;
  }

  const { subject, html } = solutionsEmail(testTitle);
  let sent = 0;
  // One email per student (no shared recipient list), a few at a time so the webhook isn't flooded
  for (let i = 0; i < emails.length; i += 10) {
    const results = await Promise.allSettled(emails.slice(i, i + 10).map(email => fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ to_email: email, subject, message_html: html })
    })));
    results.forEach((r, k) => {
      if (r.status === 'fulfilled' && r.value.ok) sent += 1;
      else console.error('Solution email failed for', emails[i + k], r.reason || r.value?.status);
    });
  }
  return sent;
};

// Unlocks the solutions of every test whose scheduled release time has passed and emails the
// students who took it. Students already see the solutions from the release time onwards (the site
// checks solutionsReleaseAt itself), so running every 5 minutes only delays the email a little.
exports.releaseScheduledSolutions = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Asia/Kolkata' }, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const pending = await db.collection('tests').where('solutionsReleasePending', '==', true).get();

  for (const testDoc of pending.docs) {
    const test = testDoc.data();
    const at = test.solutionsReleaseAt?.toMillis?.();
    if (test.solutionsReleaseMode !== 'scheduled' || !at || at > now) continue;

    // Claim the release first so an overlapping run (or a retry) can never email twice
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(testDoc.ref);
      const data = fresh.data();
      if (!fresh.exists || data.solutionsReleasePending !== true || data.solutionsReleaseMode !== 'scheduled') return false;
      if ((data.solutionsReleaseAt?.toMillis?.() ?? Infinity) > Date.now()) return false;
      tx.update(testDoc.ref, {
        solutionsUnlocked: true,
        solutionsReleasePending: false,
        solutionsReleasedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    });
    if (!claimed) continue;

    try {
      const sent = await emailStudents(db, testDoc.id, test.title);
      console.log(`Released solutions for test ${testDoc.id} ("${test.title}"), emailed ${sent} student(s).`);
    } catch (err) {
      console.error(`Released solutions for test ${testDoc.id} but emailing failed:`, err);
    }
  }
});
