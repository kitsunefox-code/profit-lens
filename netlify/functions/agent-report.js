// Virtual-office agent activity feed.
// POST: agents (scheduled tasks on the owner's PC) report what they just did.
//       Whitelisted agent names + capped action length; cosmetic data only.
// GET:  returns recent activity — requires STATS_KEY (same as /admin).

import { getStore } from '@netlify/blobs';

const AGENTS = new Set(['xbot', 'inbox', 'dev', 'system']);
const KEY = 'agent-activity';

export default async (req) => {
  const store = getStore('analytics');

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }
    const agent = String(body.agent || '');
    const action = String(body.action || '').slice(0, 100);
    if (!AGENTS.has(agent) || !action) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }
    const list = (await store.get(KEY, { type: 'json' })) || [];
    list.unshift({ agent, action, ts: new Date().toISOString() });
    await store.setJSON(KEY, list.slice(0, 50));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (!process.env.STATS_KEY || url.searchParams.get('key') !== process.env.STATS_KEY) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
    const list = (await store.get(KEY, { type: 'json' })) || [];
    return new Response(JSON.stringify({ activity: list }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  return new Response('', { status: 405 });
};
