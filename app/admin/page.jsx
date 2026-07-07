'use client';

// オーナー専用ダッシュボード — 閲覧数(Netlify Blobs)とStripe売上を一画面で。
// STATS_KEY を知っている人だけがデータを見られる(キーはlocalStorageに保存)。

import { useEffect, useMemo, useState } from 'react';

const KEY_STORE = 'pl_stats_key';

function fmtYen(n) {
  return '¥' + Number(n || 0).toLocaleString();
}

function dayLabel(d) {
  return d.slice(5).replace('-', '/');
}

function sumDay(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0);
}

function ViewsChart({ days }) {
  // days: [{date, total}] 昇順30日 — 単一系列・棒・ホバーツールチップ付き
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const BW = 18, GAP = 2, H = 160, PAD_L = 8, PAD_B = 20, PAD_T = 18;
  const w = PAD_L * 2 + days.length * (BW + GAP);
  const maxIdx = days.reduce((mi, d, i) => (d.total > days[mi].total ? i : mi), 0);
  const lastIdx = days.length - 1;

  return (
    <div className="scroll-x" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${H + PAD_B + PAD_T}`} className="chart-svg" style={{ minWidth: Math.min(w, 680) }}>
        <line x1={PAD_L} y1={H + PAD_T} x2={w - PAD_L} y2={H + PAD_T} stroke="var(--line)" strokeWidth="1" />
        {days.map((d, i) => {
          const h = Math.max(2, (d.total / max) * (H - 8));
          const x = PAD_L + i * (BW + GAP);
          const y = H + PAD_T - h;
          const showLabel = i === maxIdx || i === lastIdx;
          return (
            <g key={d.date}
               onMouseEnter={() => setHover({ i, x: x + BW / 2, date: d.date, total: d.total })}
               onMouseLeave={() => setHover(null)}>
              {/* hit target larger than the mark */}
              <rect x={x - GAP / 2} y={PAD_T} width={BW + GAP} height={H} fill="transparent" />
              <path d={`M${x},${y + 4} a4,4 0 0 1 4,-4 h${BW - 8} a4,4 0 0 1 4,4 v${h - 4} h${-BW} z`}
                    fill={hover && hover.i === i ? '#4338ca' : '#4f46e5'} />
              {showLabel && (
                <text x={x + BW / 2} y={y - 5} textAnchor="middle" fontSize="10.5" fill="#334155" fontWeight="700">
                  {d.total}
                </text>
              )}
              {i % 5 === 0 && (
                <text x={x + BW / 2} y={H + PAD_T + 13} textAnchor="middle" fontSize="9.5" fill="#64748b">
                  {dayLabel(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', left: Math.min(hover.x, 600), top: 0,
          background: '#1e293b', color: '#f1f5f9', borderRadius: 8,
          padding: '4px 10px', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {hover.date}: {hover.total} views
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [key, setKey] = useState('');
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORE) || '';
    if (saved) { setKey(saved); setInput(saved); }
  }, []);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setErr('');
    fetch(`/.netlify/functions/stats?key=${encodeURIComponent(key)}`)
      .then((r) => {
        if (r.status === 401) throw new Error('unauthorized');
        return r.json();
      })
      .then((d) => { setData(d); localStorage.setItem(KEY_STORE, key); })
      .catch((e) => setErr(e.message === 'unauthorized' ? 'キーが違います' : '取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [key]);

  const days = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ date: d, byPath: (data && data.views && data.views[d]) || {}, total: sumDay(data && data.views && data.views[d]) });
    }
    return out;
  }, [data]);

  const today = days[days.length - 1];
  const last7 = days.slice(-7).reduce((a, d) => a + d.total, 0);
  const last30 = days.reduce((a, d) => a + d.total, 0);
  const stripe = data && data.stripe;

  return (
    <div className="container db-wrap">
      <div className="db-head">
        <span className="brand"><span className="brand-mark">P</span>ProfitLens 管理</span>
        <a className="lang-toggle" href="/">サイトへ戻る</a>
      </div>

      {!data && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h2>アクセスキー</h2>
          <p className="note" style={{ marginBottom: 10 }}>STATS_KEYを入力してください(この端末に記憶されます)。</p>
          <div className="toolbar">
            <input
              type="password"
              style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setKey(input.trim())}
            />
            <button className="btn small" onClick={() => setKey(input.trim())} disabled={loading}>表示</button>
          </div>
          {err && <p className="note" style={{ color: 'var(--red)', marginTop: 8 }}>{err}</p>}
          {loading && <p className="note" style={{ marginTop: 8 }}>読み込み中…</p>}
        </div>
      )}

      {data && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="label">今日の閲覧</div><div className="value">{today ? today.total : 0}</div></div>
            <div className="kpi"><div className="label">7日間</div><div className="value">{last7}</div></div>
            <div className="kpi"><div className="label">30日間</div><div className="value">{last30}</div></div>
            <div className="kpi"><div className="label">販売数</div><div className="value">{stripe ? stripe.count : '—'}</div></div>
            <div className="kpi"><div className="label">売上合計</div><div className={`value ${stripe && stripe.totalJPY > 0 ? 'pos' : ''}`}>{stripe ? fmtYen(stripe.totalJPY) : '—'}</div></div>
          </div>

          <div className="panel">
            <h2>日別閲覧数(30日)</h2>
            <ViewsChart days={days} />
          </div>

          <div className="panel">
            <h2>日別内訳</h2>
            <div className="scroll-x">
              <table className="data">
                <thead><tr>
                  <th>日付</th><th className="num-cell">トップ</th><th className="num-cell">ダッシュボード</th>
                  <th className="num-cell">購入完了</th><th className="num-cell">その他</th><th className="num-cell">合計</th>
                </tr></thead>
                <tbody>
                  {[...days].reverse().filter((d) => d.total > 0).map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td className="num-cell">{d.byPath['/'] || 0}</td>
                      <td className="num-cell">{d.byPath['/dashboard/'] || 0}</td>
                      <td className="num-cell">{d.byPath['/thanks/'] || 0}</td>
                      <td className="num-cell">{d.byPath['/other/'] || 0}</td>
                      <td className="num-cell" style={{ fontWeight: 700 }}>{d.total}</td>
                    </tr>
                  ))}
                  {days.every((d) => d.total === 0) && (
                    <tr><td colSpan={6} className="note">まだ閲覧データがありません(計測は本日開始)</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>最近の売上(Stripe)</h2>
            {stripe && stripe.recent && stripe.recent.length > 0 ? (
              <table className="data">
                <thead><tr><th>日付</th><th className="num-cell">金額</th></tr></thead>
                <tbody>
                  {stripe.recent.map((s, i) => (
                    <tr key={i}><td>{s.date}</td><td className="num-cell pos">{fmtYen(s.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="note">まだ売上はありません。最初の1件を待ちましょう。</p>
            )}
          </div>

          <div className="panel">
            <h2>各プラットフォームの数字(手動確認リンク)</h2>
            <p className="note" style={{ marginBottom: 10 }}>APIが無いサービスは公式ダッシュボードで確認します。</p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 8, fontSize: 14 }}>
              <li>📗 <a href="https://note.com/sitesettings/stats" target="_blank" rel="noopener noreferrer">note アクセス状況</a></li>
              <li>🐦 <a href="https://x.com/KITSUNEFOX777" target="_blank" rel="noopener noreferrer">X プロフィール(投稿の表示回数)</a></li>
              <li>🛒 <a href="https://coconala.com/mypage/dashboard_provider" target="_blank" rel="noopener noreferrer">ココナラ 出品者ダッシュボード</a></li>
              <li>💳 <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">Stripe ダッシュボード</a></li>
              <li>🌐 <a href="https://app.netlify.com/projects/getprofitlens" target="_blank" rel="noopener noreferrer">Netlify(サイト運用)</a></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
