import './globals.css';
import Analytics from '../components/Analytics';

const SITE_URL = 'https://getprofitlens.netlify.app/';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'ProfitLens — 物販・せどりの利益がすぐわかる無料ダッシュボード | Profit dashboard for resellers',
  description:
    '売れた取引を貼るだけで売上・仕入・手数料・利益率を自動集計。メルカリ/Amazon/eBay対応、登録不要・ブラウザ完結の無料ツール。Free profit tracker for marketplace sellers.',
  openGraph: {
    title: 'ProfitLens — 「結局いくら儲かった？」に3分で答えが出る',
    description: '物販・せどりの利益ダッシュボード。無料・登録不要・データはブラウザ内だけ。',
    url: SITE_URL,
    siteName: 'ProfitLens',
    images: [{ url: 'og.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProfitLens — 物販の利益がすぐわかる無料ダッシュボード',
    description: '売れた取引を貼るだけで利益率まで自動集計。無料・登録不要。',
    images: ['og.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
