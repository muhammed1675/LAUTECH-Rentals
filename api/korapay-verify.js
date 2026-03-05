// api/korapay-verify.js
// Vercel serverless function — verifies payment server-side

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ error: 'Missing reference' });
  }

  const secretKey = process.env.KORALPAY_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    const koraRes = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${reference}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await koraRes.json();

    if (!koraRes.ok) {
      return res.status(koraRes.status).json({ error: data?.message || 'Korapay error', data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Korapay verify error:', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
}
