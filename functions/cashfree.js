const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Secrets (set with: firebase functions:secrets:set CASHFREE_APP_ID / CASHFREE_SECRET_KEY)
const CASHFREE_APP_ID = defineSecret('CASHFREE_APP_ID');
const CASHFREE_SECRET_KEY = defineSecret('CASHFREE_SECRET_KEY');
// 'sandbox' (default) or 'production' - set in functions/.env as CASHFREE_ENV=production
const CASHFREE_ENV = defineString('CASHFREE_ENV', { default: 'sandbox' });

const API_VERSION = '2023-08-01';
const SITE_URL = 'https://msgate-5bad9.web.app';
const SECRETS = [CASHFREE_APP_ID, CASHFREE_SECRET_KEY];

const isProd = () => CASHFREE_ENV.value() === 'production';
const baseUrl = () => (isProd() ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

const cfFetch = async (path, options = {}) => {
  const res = await fetch(baseUrl() + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': CASHFREE_APP_ID.value(),
      'x-client-secret': CASHFREE_SECRET_KEY.value(),
      ...(options.headers || {})
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Cashfree API error', res.status, body);
    throw new Error(body.message || `Cashfree request failed (${res.status})`);
  }
  return body;
};

const parseAmount = (v) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

// Look up the student's joined_students document from their verified login email
const findStudentDoc = async (email) => {
  const db = admin.firestore();
  for (const candidate of [...new Set([email, email.toLowerCase()])]) {
    const snap = await db.collection('joined_students').where('email', '==', candidate).limit(1).get();
    if (!snap.empty) return snap.docs[0];
  }
  return null;
};

/**
 * Asks Cashfree for the real order status and, if it is PAID, unlocks the bundle.
 * Safe to call repeatedly (client return + webhook): the payments doc is updated in a transaction.
 */
const fulfillOrder = async (orderId) => {
  const db = admin.firestore();
  const paymentRef = db.collection('payments').doc(orderId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) throw new Error('Unknown order');

  const order = await cfFetch(`/orders/${encodeURIComponent(orderId)}`);
  const status = order.order_status; // ACTIVE | PAID | EXPIRED | TERMINATED ...

  if (status !== 'PAID') {
    if (status === 'EXPIRED' || status === 'TERMINATED') {
      await paymentRef.set({ status: 'FAILED', cfOrderStatus: status }, { merge: true });
      return { status: 'FAILED' };
    }
    return { status: 'PENDING' };
  }

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(paymentRef);
    const payment = fresh.data();
    if (payment.status === 'PAID') return; // already fulfilled

    // Guard against tampering: the amount Cashfree collected must match what we asked for
    if (Number(order.order_amount) !== Number(payment.amount)) {
      throw new Error('Paid amount does not match the order amount');
    }

    const studentRef = db.collection('joined_students').doc(payment.studentDocId);
    if (payment.itemType === 'subject') {
      tx.update(studentRef, { purchasedSubjects: admin.firestore.FieldValue.arrayUnion(payment.itemId) });
    } else if (payment.itemType === 'notebundle') {
      tx.update(studentRef, { purchasedNoteBundles: admin.firestore.FieldValue.arrayUnion(payment.itemId) });
    } else {
      // orders created before subjects existed only have bundleId
      tx.update(studentRef, { purchasedBundles: admin.firestore.FieldValue.arrayUnion(payment.itemId || payment.bundleId) });
    }
    tx.update(paymentRef, {
      status: 'PAID',
      cfOrderStatus: status,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { status: 'PAID' };
};

// 1) Student clicks "Buy Now" -> create a Cashfree order for a bundle or a single notes subject
exports.createCashfreeOrder = onCall({ secrets: SECRETS }, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Please log in to purchase.');
  }
  const { bundleId, subjectId, noteBundleId } = request.data || {};
  const itemType = noteBundleId ? 'notebundle' : subjectId ? 'subject' : 'bundle';
  const itemId = noteBundleId || subjectId || bundleId;
  if (!itemId || typeof itemId !== 'string') {
    throw new HttpsError('invalid-argument', 'bundleId, subjectId or noteBundleId is required.');
  }

  const db = admin.firestore();
  const email = request.auth.token.email;
  const studentDoc = await findStudentDoc(email);
  if (!studentDoc) throw new HttpsError('not-found', 'Student profile not found.');
  const student = studentDoc.data();

  let itemName;
  let amount;

  if (itemType === 'notebundle') {
    if ((student.purchasedNoteBundles || []).includes(itemId)) {
      throw new HttpsError('already-exists', 'You already own this notes bundle.');
    }
    const nbSnap = await db.collection('note_bundles').doc(itemId).get();
    if (!nbSnap.exists) throw new HttpsError('not-found', 'Notes bundle not found.');
    const nb = nbSnap.data();
    if (nb.department !== student.department) {
      throw new HttpsError('permission-denied', 'This notes bundle is not part of your department.');
    }
    itemName = `${nb.department} - ${nb.name}`;
    amount = parseAmount(nb.discountedPrice || nb.price);
    if (amount < 1) throw new HttpsError('failed-precondition', 'This notes bundle is not available for purchase.');
  } else if (itemType === 'subject') {
    if ((student.purchasedSubjects || []).includes(itemId)) {
      throw new HttpsError('already-exists', 'You already have access to this subject.');
    }
    const folderSnap = await db.collection('note_folders').doc(itemId).get();
    if (!folderSnap.exists) throw new HttpsError('not-found', 'Subject not found.');
    const folder = folderSnap.data();
    // Only top-level (subject) folders can be sold, and only inside the student's own department
    if (folder.parentId) throw new HttpsError('failed-precondition', 'Only whole subjects can be purchased.');
    if (folder.department !== student.department) {
      throw new HttpsError('permission-denied', 'This subject is not part of your department.');
    }
    itemName = `${folder.department} - ${folder.name}`;
    amount = parseAmount(folder.discountedPrice || folder.price);
    if (amount < 1) throw new HttpsError('failed-precondition', 'This subject is not available for individual purchase.');
  } else {
    if ((student.purchasedBundles || []).includes(itemId)) {
      throw new HttpsError('already-exists', 'You already own this bundle.');
    }
    const bundleSnap = await db.collection('course_bundles').doc(itemId).get();
    if (!bundleSnap.exists) throw new HttpsError('not-found', 'Bundle not found.');
    const bundle = bundleSnap.data();
    itemName = bundle.name || 'Course bundle';
    // Price is always read on the server, never taken from the browser
    amount = parseAmount(bundle.discountedPrice || bundle.price);
    if (amount < 1) throw new HttpsError('failed-precondition', 'This bundle has no valid price.');
  }

  const orderId = `MSA_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const phone = String(student.phone || '').replace(/\D/g, '').slice(-10);

  let order;
  try {
    order = await cfFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: studentDoc.id,
          customer_name: student.name || 'Student',
          customer_email: email,
          customer_phone: phone.length === 10 ? phone : '9999999999'
        },
        order_meta: { return_url: `${SITE_URL}/student?order_id={order_id}` },
        order_note: itemName.slice(0, 200)
      })
    });
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Could not create payment order.');
  }

  await db.collection('payments').doc(orderId).set({
    orderId,
    studentDocId: studentDoc.id,
    studentEmail: email,
    studentName: student.name || '',
    itemType,
    itemId,
    itemName,
    // kept for older readers of this collection
    bundleId: itemType === 'bundle' ? itemId : '',
    bundleName: itemType === 'bundle' ? itemName : '',
    amount,
    currency: 'INR',
    status: 'CREATED',
    env: isProd() ? 'production' : 'sandbox',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { orderId, paymentSessionId: order.payment_session_id, mode: isProd() ? 'production' : 'sandbox' };
});

// 2) After checkout closes, the browser asks the server to confirm with Cashfree
exports.verifyCashfreeOrder = onCall({ secrets: SECRETS }, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Please log in.');
  }
  const orderId = request.data && request.data.orderId;
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required.');

  const paymentSnap = await admin.firestore().collection('payments').doc(orderId).get();
  if (!paymentSnap.exists || paymentSnap.data().studentEmail !== request.auth.token.email) {
    throw new HttpsError('permission-denied', 'Order not found.');
  }

  try {
    return await fulfillOrder(orderId);
  } catch (err) {
    console.error('verifyCashfreeOrder failed', err);
    throw new HttpsError('internal', err.message || 'Could not verify payment.');
  }
});

// 3) Cashfree -> server webhook (backup if the student closes the tab before returning)
exports.cashfreeWebhook = onRequest({ secrets: SECRETS }, async (req, res) => {
  try {
    const signature = req.get('x-webhook-signature');
    const timestamp = req.get('x-webhook-timestamp');
    if (!signature || !timestamp || !req.rawBody) return res.status(400).send('Bad request');

    const expected = crypto
      .createHmac('sha256', CASHFREE_SECRET_KEY.value())
      .update(timestamp + req.rawBody.toString('utf8'))
      .digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).send('Invalid signature');

    const orderId = req.body && req.body.data && req.body.data.order && req.body.data.order.order_id;
    if (orderId) {
      // The payload is only a hint: fulfillOrder re-checks the real status with Cashfree
      try {
        await fulfillOrder(orderId);
      } catch (err) {
        console.error('Webhook fulfil failed for', orderId, err.message);
        if (err.message === 'Unknown order') return res.status(200).send('ignored');
        return res.status(500).send('retry');
      }
    }
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook error', err);
    return res.status(500).send('error');
  }
});
