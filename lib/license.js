'use client';

// Stripe決済の検証・ライセンス有効化。
// 「ライセンスキー」= 購入完了時のStripe Checkout Session ID (cs_live_... / cs_test_...)。
// 検証はNetlify Functions経由(lib/config.js の VERIFY_ENDPOINT)で行う。
// 秘密鍵はサーバー側(Netlify環境変数)にのみ存在し、ブラウザには一切渡らない。

import { STRIPE } from './config';

const PRO_FLAG = 'pl_pro_v1';
const KEY_STORE = 'pl_license_v1';

export function looksLikeKey(key) {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test((key || '').trim());
}

export function isProStored() {
  try { return localStorage.getItem(PRO_FLAG) === 'true'; } catch { return false; }
}
export function storedKey() {
  try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
}
function persistPro(key) {
  localStorage.setItem(PRO_FLAG, 'true');
  localStorage.setItem(KEY_STORE, key);
}
export function clearPro() {
  localStorage.removeItem(PRO_FLAG);
  localStorage.removeItem(KEY_STORE);
}

// キーを検証してロック解除する。
// 戻り値: { ok: boolean, message?: string }
export async function activate(key) {
  const k = (key || '').trim();
  if (!k) return { ok: false, message: 'empty' };
  if (!looksLikeKey(k)) return { ok: false, message: 'invalid' };

  try {
    const res = await fetch(STRIPE.VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: k }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data && data.valid) {
      persistPro(k);
      return { ok: true };
    }
    return { ok: false, message: (data && data.error) || 'invalid' };
  } catch (e) {
    // ネットワーク不通など。オフライン救済として、以前このキーで解除済みなら通す。
    if (looksLikeKey(k) && storedKey() === k && isProStored()) {
      return { ok: true };
    }
    return { ok: false, message: 'network' };
  }
}
