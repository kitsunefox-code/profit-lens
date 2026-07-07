// Owner-only stats endpoint — returns page views (Netlify Blobs) and
// Stripe sales (via STRIPE_SECRET_KEY, server-side only).
// Protected by the STATS_KEY environment variable.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') || '';
  const expected = process.env.STATS_KEY;
  if (!expected || key !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  // --- page views: last 30 days ---
  const store = getStore('analytics');
  const views = {};
  const jobs = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    jobs.push(
      store.get(`views:${d}`, { type: 'json' }).then((v) => { if (v) views[d] = v; }).catch(() => {})
    );
  }
  await Promise.all(jobs);

  // --- Stripe sales ---
  let stripe = null;
  const sk = process.env.STRIPE_SECRET_KEY;
  if (sk) {
    try {
      const res = await fetch('https://api.stripe.com/v1/charges?limit=100', {
        headers: { Authorization: `Bearer ${sk}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const paid = data.data.filter((c) => c.status === 'succeeded' && !c.refunded);
        stripe = {
          count: paid.length,
          totalJPY: paid.reduce((a, c) => a + (c.currency === 'jpy' ? c.amount : 0), 0),
          recent: paid.slice(0, 10).map((c) => ({
            date: new Date(c.created * 1000).toISOString().slice(0, 10),
            amount: c.amount,
            currency: c.currency,
          })),
        };
      }
    } catch { /* stripe unreachable — return views only */ }
  }

  return new Response(JSON.stringify({ views, stripe }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
