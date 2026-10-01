const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Keep in sync with QUIZ_KEEP_DAYS in src/utils/postClassQuiz.js
const QUIZ_KEEP_DAYS = 3;

// Daily: a post-class quiz is kept for 3 days after its class ended, then the quiz and every
// student's result are deleted (the class session itself stays), and so are students' live test /
// quiz reports older than 3 days. (Teachers' Live Classes page and students' Live Sessions page
// also remove their own expired ones as they load - this catches everyone else's.)
exports.cleanupPostClassQuizzes = onSchedule({ schedule: 'every day 03:00', timeZone: 'Asia/Kolkata' }, async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - QUIZ_KEEP_DAYS * 24 * 60 * 60 * 1000);
  // A single range filter needs no composite index; status is checked below
  const ended = await db.collection('live_sessions').where('endedAt', '<=', cutoff).get();

  let removed = 0;
  for (const session of ended.docs) {
    const data = session.data();
    if (data.status !== 'ended' || !data.postClassQuiz) continue;
    try {
      const results = await session.ref.collection('quiz_results').get();
      for (let i = 0; i < results.docs.length; i += 450) {
        const batch = db.batch();
        results.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await session.ref.update({ postClassQuiz: admin.firestore.FieldValue.delete() });
      removed += 1;
    } catch (err) {
      console.error(`Failed to delete the post-class quiz of session ${session.id}:`, err);
    }
  }
  console.log(`Deleted ${removed} post-class quiz(zes) older than ${QUIZ_KEEP_DAYS} days.`);

  // Students' live test / post-class quiz reports (src/utils/liveReports.js) past their 3 days
  const expiredReports = await db.collection('live_reports')
    .where('expiresAt', '<=', admin.firestore.Timestamp.now())
    .get();
  for (let i = 0; i < expiredReports.docs.length; i += 450) {
    const batch = db.batch();
    expiredReports.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`Deleted ${expiredReports.size} expired student report(s).`);
});
