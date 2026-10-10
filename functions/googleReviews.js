const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Copies the academy's Google reviews into Firestore 'google_reviews', where the homepage's
// student feedback section reads them (src/components/Home.jsx).
//
// Google's Places API (New) returns at most 5 reviews - the ones Google ranks most relevant, not
// necessarily the newest - so this runs daily and keeps every review it has seen; the collection
// grows as new reviews reach that list. A review edited on Google is updated here; one deleted on
// Google stays until it is removed from Firestore by hand.
//
// Setup:  firebase functions:secrets:set GOOGLE_PLACES_API_KEY   (a key restricted to "Places API (New)")
const GOOGLE_PLACES_API_KEY = defineSecret('GOOGLE_PLACES_API_KEY');
const GOOGLE_PLACE_ID = defineString('GOOGLE_PLACE_ID', { default: 'ChIJWaVtGGBFqDsR3_X2lB1W4gA' });

// "places/<placeId>/reviews/<reviewId>" -> "<reviewId>" (stable per review, safe as a document id)
const reviewId = (r) => (r.name || '').split('/').pop();

exports.syncGoogleReviews = onSchedule({
  schedule: 'every day 06:00',
  timeZone: 'Asia/Kolkata',
  secrets: [GOOGLE_PLACES_API_KEY],
}, async () => {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(GOOGLE_PLACE_ID.value())}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY.value(),
      'X-Goog-FieldMask': 'reviews',
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google Places: ${res.status} ${data.error?.status || ''} ${data.error?.message || ''}`.trim());
  }

  const reviews = (data.reviews || []).filter(reviewId);
  const db = admin.firestore();
  const batch = db.batch();
  reviews.forEach(r => {
    const publishedMs = Date.parse(r.publishTime || '');
    batch.set(db.collection('google_reviews').doc(reviewId(r)), {
      name: r.authorAttribution?.displayName || 'Google User',
      rating: r.rating || 0,
      // The reviewer's own words, not Google's translation
      text: r.originalText?.text || r.text?.text || '',
      time: Number.isNaN(publishedMs) ? 0 : Math.floor(publishedMs / 1000), // seconds since 1970
      authorUrl: r.authorAttribution?.uri || '',
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
  console.log(`Synced ${reviews.length} Google reviews`);
});
