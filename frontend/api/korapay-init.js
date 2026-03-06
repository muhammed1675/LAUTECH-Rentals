// api/korapay-init.js
// Vercel serverless function — runs server-side, secret key never exposed to browser

export default async function handler(req, res) {
  // Allow CORS from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, amount, currency, customer, redirect_url, channels } = req.body;

  if (!reference || !amount || !customer?.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const secretKey = process.env.KORALPAY_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    const koraRes = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference,
        amount,
        currency: currency || 'NGN',
        customer,
        redirect_url,
        channels: channels || ['card', 'bank_transfer'],
      }),
    });

    const data = await koraRes.json();

    if (!koraRes.ok) {
      return res.status(koraRes.status).json({ error: data?.message || 'Korapay error', data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Korapay init error:', err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
}
