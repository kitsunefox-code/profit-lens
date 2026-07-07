// ============================================================
//  ProfitLens 決済・ライセンス設定
//  Lemon Squeezy でアカウント+商品を作成後、下の3項目を埋めるだけで
//  Pro版の販売が有効になります（コードの再修正は不要）。
//
//  手順（本人・約5分）:
//   1. https://lemonsqueezy.com でアカウント作成（無料）
//   2. Store を作成
//   3. Products → New product → 価格を設定（例: $12 / ¥1,480 相当）
//   4. その product の Settings で「License keys」を ON にする
//   5. product の「Share」からチェックアウトURLをコピー → CHECKOUT_URL に貼る
//   6. 保存してデプロイ（git push）で自動反映
// ============================================================

export const LEMONSQUEEZY = {
  // 例: 'https://profitlens.lemonsqueezy.com/buy/xxxxxxxx-xxxx-...'
  // ここが空文字のうちは「準備中」表示になり、購入ボタンは料金ページ案内のままです。
  CHECKOUT_URL: '',

  // 購入完了後に成功パラメータ付きで戻したい場合の任意設定（未使用でも可）
  // Lemon Squeezy 側の product 設定 > Redirect URL に本番URLを入れておくと親切です。
};

// 決済が構成済みか（CHECKOUT_URL が入っていれば true）
export function isCheckoutConfigured() {
  return typeof LEMONSQUEEZY.CHECKOUT_URL === 'string' && LEMONSQUEEZY.CHECKOUT_URL.startsWith('http');
}
