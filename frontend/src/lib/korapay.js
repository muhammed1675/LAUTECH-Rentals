import { paymentAPI } from './api';

// ── Korapay Inline Checkout ─────────────────────────────────────
const SCRIPT_URL =
  'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Korapay) { resolve(); return; }
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load payment script. Check your connection.'));
    document.body.appendChild(script);
  });
}

/**
 * Opens the Korapay inline payment popup and handles completion.
 *
 * @param {object}   opts
 * @param {string}   opts.reference   - Unique transaction reference from DB
 * @param {number}   opts.amount      - Amount in Naira
 * @param {string}   opts.email       - Customer email
 * @param {string}   opts.name        - Customer name
 * @param {string}   opts.narration   - Description shown in modal
 * @param {function} opts.onSuccess   - Called after payment confirmed in DB
 * @param {function} opts.onFailed    - Called when payment fails
 * @param {function} opts.onClose     - Called when modal is dismissed
 */
export async function openKorapayCheckout({
  reference, amount, email, name, narration,
  onSuccess, onFailed, onClose,
}) {
  await loadScript();

  const key = import.meta.env?.VITE_KORAPAY_PUBLIC_KEY
    || process.env?.REACT_APP_KORAPAY_PUBLIC_KEY;

  if (!key) {
    throw new Error(
      'Korapay public key not found. Add VITE_KORAPAY_PUBLIC_KEY to your Vercel environment variables.'
    );
  }

  window.Korapay.initialize({
    key,
    reference,
    amount,
    currency: 'NGN',
    narration: narration || 'Rentora',
    customer: {
      name: name || 'Customer',
      email,
    },

    onSuccess: async (data) => {
      try {
        // Confirm in DB: mark transaction complete + credit wallet/inspection
        await paymentAPI.confirmPayment(reference);
        if (onSuccess) onSuccess(data);
      } catch (err) {
        console.error('Failed to confirm payment in DB:', err);
        // Still call onSuccess — payment went through, DB sync can be retried
        if (onSuccess) onSuccess(data);
      }
    },

    onFailed: (data) => {
      if (onFailed) onFailed(data);
    },

    onClose: () => {
      if (onClose) onClose();
    },
  });
}
