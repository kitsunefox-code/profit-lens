// Page-view counter — stores daily counts in Netlify Blobs (free tier, no external service).
// Called by the site itself on each page view. No cookies, no personal data.

import { getStore } from '@netlify/blobs';

const ALLOWED = new Set(['/', '/dashboard/', '/thanks/']);

export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });

  let path = '';
  try {
    ({ path } = await req.json());
  } catch {
    return new Response('', { status: 400 });
  }
  path = String(path || '').slice(0, 64);
  if (!path.endsWith('/')) path += '/';
  if (!ALLOWED.has(path)) path = '/other/';

  const day = new Date().toISOString().slice(0, 10);
  const store = getStore('analytics');
  const key = `views:${day}`;
  const data = (await store.get(key, { type: 'json' })) || {};
  data[path] = (data[path] || 0) + 1;
  await store.setJSON(key, data);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
