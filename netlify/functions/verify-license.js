// Netlify serverless function — verifies a Stripe Checkout Session server-side.
//
// Why this exists: ProfitLens is a fully static site (no server), but verifying
// a Stripe payment requires the Stripe *secret* key, which must never be exposed
// to the browser. This tiny function holds that secret (as a Netlify env var)
// and the client calls this endpoint instead of talking to Stripe directly.
//
// The customer's "license key" is simply their Stripe Checkout Session ID
// (visible in the success-page URL as `?session_id=cs_test_...` / `cs_live_...`).
// We just ask Stripe "was this session actually paid?" and answer yes/no.
//
// Required Netlify environment variable (set by the site owner, never in code):
//   STRIPE_SECRET_KEY = sk_live_... (or sk_test_... while testing)

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ valid: false, error: 'method_not_allowed' }) };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ valid: false, error: 'server_not_configured' }) };
  }

  let sessionId;
  try {
    ({ sessionId } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ valid: false, error: 'bad_request' }) };
  }
  if (!sessionId || !/^cs_(test|live)_/.test(sessionId)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ valid: false, error: 'invalid_session_format' }) };
  }

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const session = await res.json();
    if (!res.ok) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ valid: false, error: session.error?.message || 'not_found' }) };
    }
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ valid: !!paid, email: session.customer_details?.email || null }),
    };
  } catch (e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ valid: false, error: 'stripe_unreachable' }) };
  }
};
