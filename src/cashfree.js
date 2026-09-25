import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app);
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

// Loads Cashfree's official checkout script once
const loadCashfreeSdk = () => new Promise((resolve, reject) => {
  if (window.Cashfree) return resolve(window.Cashfree);
  const existing = document.querySelector(`script[src="${SDK_URL}"]`);
  const script = existing || document.createElement('script');
  script.addEventListener('load', () => resolve(window.Cashfree));
  script.addEventListener('error', () => reject(new Error('Could not load the payment gateway. Check your connection and try again.')));
  if (!existing) {
    script.src = SDK_URL;
    document.head.appendChild(script);
  }
});

export const verifyOrder = async (orderId) => {
  const { data } = await httpsCallable(functions, 'verifyCashfreeOrder')({ orderId });
  return data.status; // 'PAID' | 'PENDING' | 'FAILED'
};

/**
 * Starts a Cashfree checkout for a bundle or a single notes subject.
 * Resolves with { status: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED', orderId }.
 * The bundle is only unlocked by the server after it confirms the payment with Cashfree.
 */
export const buyItem = async (item) => {
  // item is { bundleId }, { subjectId } or { noteBundleId }
  const { data } = await httpsCallable(functions, 'createCashfreeOrder')(item);
  const Cashfree = await loadCashfreeSdk();
  const cashfree = Cashfree({ mode: data.mode });

  const result = await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_modal' });
  if (result && result.error && !result.paymentDetails) {
    // Closed or failed before paying; still ask the server in case a payment went through
    const status = await verifyOrder(data.orderId).catch(() => 'PENDING');
    return { status: status === 'PAID' ? 'PAID' : 'CANCELLED', orderId: data.orderId, message: result.error.message };
  }
  return { status: await verifyOrder(data.orderId), orderId: data.orderId };
};

export const buyBundle = (bundleId) => buyItem({ bundleId });
export const buySubject = (subjectId) => buyItem({ subjectId });
export const buyNoteBundle = (noteBundleId) => buyItem({ noteBundleId });
