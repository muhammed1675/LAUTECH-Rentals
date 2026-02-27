// ── Korapay Inline Checkout Helper ─────────────────────────────
// Loads the Korapay script once, then calls window.Korapay.initialize()

const KORAPAY_SCRIPT_URL =
  'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';

function loadKorapayScript() {
  return new Promise((resolve, reject) => {
    if (window.Korapay) { resolve(); return; }
    const existing = document.querySelector(`script[src="${KORAPAY_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = KORAPAY_SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Korapay script'));
    document.body.appendChild(script);
  });
}

/**
 * Opens the Korapay inline checkout popup.
 * @param {object} opts
 * @param {string} opts.reference   - Unique transaction reference
 * @param {number} opts.amount      - Amount in Naira (NOT kobo)
 * @param {string} opts.email       - Customer email
 * @param {string} opts.name        - Customer name
 * @param {string} opts.narration   - Payment description shown in modal
 * @param {function} opts.onSuccess - Called with data when payment succeeds
 * @param {function} opts.onFailed  - Called with data when payment fails
 * @param {function} opts.onClose   - Called when modal is closed
 */
export async function openKorapayCheckout({ reference, amount, email, name, narration, onSuccess, onFailed, onClose }) {
  await loadKorapayScript();

  const key = import.meta.env.VITE_KORAPAY_PUBLIC_KEY
    || process.env.REACT_APP_KORALPAY_PUBLIC_KEY
    || process.env.REACT_APP_KORAPAY_PUBLIC_KEY;

  if (!key) {
    throw new Error('Korapay public key not configured. Add VITE_KORAPAY_PUBLIC_KEY to your environment variables.');
  }

  window.Korapay.initialize({
    key,
    reference,
    amount,
    currency: 'NGN',
    narration: narration || 'LAUTECH Rentals Payment',
    customer: { name: name || 'Customer', email },
    onSuccess: (data) => { if (onSuccess) onSuccess(data); },
    onFailed:  (data) => { if (onFailed)  onFailed(data);  },
    onClose:   ()     => { if (onClose)   onClose();       },
  });
}
