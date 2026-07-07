// ============================================================
//  ProfitLens 決済・ライセンス設定 (Stripe版)
//
//  手順（本人・Stripeの本人確認完了後）:
//   1. Stripeダッシュボード → 商品カタログ → 商品を作成
//      (例: 「ProfitLens Pro」買い切り ¥1,480 / $12)
//   2. その商品の「決済リンクを作成」→ 成功時のリダイレクト先を
//      `https://getprofitlens.netlify.app/thanks/?session_id={CHECKOUT_SESSION_ID}`
//      に設定（{CHECKOUT_SESSION_ID} はStripeが自動で実際の値に置換します）
//   3. 発行された決済リンクURLを下の PAYMENT_LINK_URL に貼る
//   4. Netlifyの環境変数に STRIPE_SECRET_KEY (sk_live_...) を設定
//      (Netlify管理画面 > Site configuration > Environment variables。
//       これは秘密情報なのでコードには絶対に書かない)
//   5. git push で自動デプロイ → Pro版の販売が有効になります
// ============================================================

export const STRIPE = {
  // 例: 'https://buy.stripe.com/xxxxxxxxxxxx'
  // ここが空文字のうちは「準備中」表示になり、購入ボタンは料金ページ案内のままです。
  PAYMENT_LINK_URL: 'https://buy.stripe.com/4gMdRa1jm68C9VNfuG4ko00',

  // Netlify Functionのエンドポイント（サイトと同一オリジンなので通常は変更不要）
  VERIFY_ENDPOINT: '/.netlify/functions/verify-license',
};

// 決済が構成済みか（PAYMENT_LINK_URL が入っていれば true）
export function isCheckoutConfigured() {
  return typeof STRIPE.PAYMENT_LINK_URL === 'string' && STRIPE.PAYMENT_LINK_URL.startsWith('http');
}
