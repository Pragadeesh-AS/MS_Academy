const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Keep in sync with QUIZ_KEEP_DAYS in src/utils/postClassQuiz.js
const QUIZ_KEEP_DAYS = 3;

// Daily: a post-class quiz is kept for 3 days after its class ended, then the quiz and every
// student's result are deleted. The class session itself stays. (Teachers' own Live Classes page
// also removes their expired quizzes as it loads - this catches everyone else's.)
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
});
