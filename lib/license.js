'use client';

// Lemon Squeezy のライセンスキー検証・有効化（クライアントから直接呼べる公開API）
// docs: https://docs.lemonsqueezy.com/help/licensing/license-api
//
// 完全クライアントサイドのソフトゲートです。厳密な保護ではありませんが、
// この価格帯のデジタル商品としては十分（購入者の利便性を優先）。

const API = 'https://api.lemonsqueezy.com/v1/licenses';

const PRO_FLAG = 'pl_pro_v1';
const KEY_STORE = 'pl_license_v1';

// フォーマットの見た目チェック（オフライン簡易判定・オフライン開発/デモ用フォールバック）
export function looksLikeKey(key) {
  const k = (key || '').trim();
  // Lemon Squeezy の標準キーは XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX 形式（UUID風）
  return /^[0-9A-Za-z]{6,}(-[0-9A-Za-z]+){2,}$/.test(k);
}

// ローカルに保存された Pro 状態（オフラインでもロック解除を維持）
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

  try {
    const res = await fetch(`${API}/validate`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ license_key: k }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data && data.valid) {
      persistPro(k);
      return { ok: true };
    }
    // valid でない / エラー
    return { ok: false, message: (data && (data.error || (data.license_key && data.license_key.status))) || 'invalid' };
  } catch (e) {
    // ネットワーク不通など。オフライン救済として、以前このキーで解除済みなら通す。
    if (looksLikeKey(k) && storedKey() === k && isProStored()) {
      return { ok: true };
    }
    return { ok: false, message: 'network' };
  }
}
