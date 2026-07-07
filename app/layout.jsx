import './globals.css';

export const metadata = {
  title: 'ProfitLens — 物販・せどりの利益がすぐわかる無料ダッシュボード | Profit dashboard for resellers',
  description:
    '売れた取引を貼るだけで売上・仕入・手数料・利益率を自動集計。メルカリ/Amazon/eBay対応、登録不要・ブラウザ完結の無料ツール。Free profit tracker for marketplace sellers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
