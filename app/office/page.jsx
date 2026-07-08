'use client';

// バーチャルオフィス(ドット絵・見下ろし型) — PC内カンパニー「KITSUNE FOX商会」
// キツネの社員(自動化エージェント)が机で働く様子を Canvas で描画。
// データは /admin と同じ STATS_KEY で stats + agent-report を取得。

import { useEffect, useRef, useState, useMemo } from 'react';

const KEY_STORE = 'pl_stats_key';

// 社員定義。deskは論理座標(BASE_W x BASE_H 内)。
const STAFF = [
  { id: 'xbot',   name: '広報キツネ', role: 'X投稿担当',   accent: '#4f46e5', desk: { x: 46,  y: 74 },  schedule: [[12, 0, 12, 40]], task: '集客ポスト.md' },
  { id: 'inbox',  name: '受付キツネ', role: '受信箱担当',  accent: '#0ea5e9', desk: { x: 110, y: 74 },  schedule: [[9, 0, 9, 40], [15, 0, 15, 40]], task: '返信下書き.md' },
  { id: 'system', name: '経理キツネ', role: '集計担当',    accent: '#059669', desk: { x: 46,  y: 118 }, schedule: 'always', task: '売上レポート' },
  { id: 'dev',    name: '開発キツネ', role: '開発担当',    accent: '#d97706', desk: { x: 110, y: 118 }, schedule: null, task: '待機中' },
];

const BASE_W = 256;
const BASE_H = 176;

function isWorking(staff, now) {
  if (staff.schedule === 'always') return true;
  if (!staff.schedule) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return staff.schedule.some(([h1, m1, h2, m2]) => mins >= h1 * 60 + m1 && mins <= h2 * 60 + m2);
}
function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'たった今'; if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}
function sumDay(o) { return Object.values(o || {}).reduce((a, b) => a + b, 0); }

// ---- pixel drawing helpers ----
function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

function drawRoom(ctx) {
  // 床(木目)
  for (let y = 28; y < BASE_H; y += 16) {
    for (let x = 0; x < BASE_W; x += 32) {
      const base = (Math.floor(x / 32) + Math.floor(y / 16)) % 2 ? '#7a4a28' : '#855230';
      px(ctx, x, y, 32, 16, base);
      px(ctx, x, y, 32, 1, 'rgba(0,0,0,.18)');
      px(ctx, x, y, 1, 16, 'rgba(0,0,0,.12)');
    }
  }
  // 上壁
  px(ctx, 0, 0, BASE_W, 28, '#3b4a6b');
  px(ctx, 0, 26, BASE_W, 2, '#2a3550');
  // 本棚(左右)
  drawShelf(ctx, 10); drawShelf(ctx, 150);
  // 観葉植物
  drawPlant(ctx, 120, 6); drawPlant(ctx, 236, 6);
  // 応接スペース(右下・チェッカー床)
  for (let y = 120; y < 168; y += 8) for (let x = 176; x < 248; x += 8)
    px(ctx, x, y, 8, 8, ((x + y) / 8) % 2 ? '#c9cdd6' : '#e8ebf0');
  // ソファ + テーブル
  px(ctx, 186, 118, 52, 8, '#b5485a'); px(ctx, 186, 160, 52, 8, '#b5485a');
  px(ctx, 200, 136, 24, 16, '#caa46a'); px(ctx, 202, 138, 20, 4, '#e0c088');
}
function drawShelf(ctx, x) {
  px(ctx, x, 4, 96, 20, '#5a3a22');
  const cols = ['#c65', '#6a9', '#c9a24a', '#7a6ad0', '#4f9', '#e88'];
  for (let i = 0; i < 22; i++) px(ctx, x + 3 + i * 4, 6, 3, i % 3 ? 16 : 12, cols[i % cols.length]);
  px(ctx, x, 13, 96, 2, '#4a2e1a');
}
function drawPlant(ctx, x, y) {
  px(ctx, x + 3, y + 12, 8, 6, '#6b4a2a');           // 鉢
  px(ctx, x + 2, y + 4, 10, 9, '#2f8f4f');            // 葉
  px(ctx, x + 5, y, 4, 8, '#37a35c');
}

// キツネ社員(見下ろし)。t=時間, working, sit
function drawFox(ctx, cx, cy, accent, t, working) {
  const bob = working ? Math.round(Math.sin(t / 260 + cx) * 1) : 0;
  const y = cy + bob;
  // 影
  px(ctx, cx - 6, y + 13, 12, 3, 'rgba(0,0,0,.22)');
  // 尻尾(左右に揺れ)
  const sway = Math.round(Math.sin(t / 320 + cx) * 2);
  px(ctx, cx - 10 + sway, y + 4, 5, 7, '#e8833a');
  px(ctx, cx - 11 + sway, y + 8, 4, 3, '#f5e6d0');
  // 体(アクセント色の服)
  px(ctx, cx - 6, y + 3, 12, 10, accent);
  px(ctx, cx - 6, y + 3, 12, 2, 'rgba(255,255,255,.25)');
  // 耳
  px(ctx, cx - 6, y - 9, 4, 5, '#e8833a'); px(ctx, cx - 5, y - 8, 2, 2, '#eba');
  px(ctx, cx + 2, y - 9, 4, 5, '#e8833a'); px(ctx, cx + 3, y - 8, 2, 2, '#eba');
  // 頭
  px(ctx, cx - 6, y - 5, 12, 9, '#e8833a');
  px(ctx, cx - 4, y - 1, 8, 5, '#f5e6d0');           // 顔
  // 目(まばたき)
  const blink = (Math.floor(t / 180) % 20 === 0);
  const eh = blink ? 1 : 2;
  px(ctx, cx - 3, y, 2, eh, '#2a2a2a'); px(ctx, cx + 2, y, 2, eh, '#2a2a2a');
  px(ctx, cx - 1, y + 3, 2, 1, '#3a2a2a');           // 鼻
}

export default function Office() {
  const canvasRef = useRef(null);
  const [key, setKey] = useState('');
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setKey(localStorage.getItem(KEY_STORE) || '');
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!key) return;
    const load = () => {
      fetch(`/.netlify/functions/stats?key=${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('x'))))
        .then(setStats).catch(() => setErr('認証エラー: 先に /admin でアクセスキーを入力してください'));
      fetch(`/.netlify/functions/agent-report?key=${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : { activity: [] })).then((d) => setActivity(d.activity || [])).catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [key]);

  const lastByAgent = useMemo(() => {
    const m = {}; for (const a of activity) if (!m[a.agent]) m[a.agent] = a; return m;
  }, [activity]);

  // canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const SCALE = 3;
    canvas.width = BASE_W * SCALE * dpr;
    canvas.height = BASE_H * SCALE * dpr;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let raf;
    const nowRef = new Date();
    const render = (t) => {
      ctx.save();
      ctx.scale(SCALE * dpr, SCALE * dpr);
      ctx.clearRect(0, 0, BASE_W, BASE_H);
      drawRoom(ctx);
      for (const s of STAFF) {
        const working = isWorking(s, nowRef);
        // 机 + モニタ
        px(ctx, s.desk.x - 14, s.desk.y + 8, 28, 12, '#6a4326');
        px(ctx, s.desk.x - 14, s.desk.y + 8, 28, 2, '#7d5230');
        px(ctx, s.desk.x - 9, s.desk.y + 1, 14, 9, '#2b2b33');
        px(ctx, s.desk.x - 8, s.desk.y + 2, 12, 7, working ? '#8fe0b0' : '#33415a');
        if (working) { // 画面のテキスト風
          px(ctx, s.desk.x - 7, s.desk.y + 3, 8, 1, '#2b6b4a');
          px(ctx, s.desk.x - 7, s.desk.y + 5, 6, 1, '#2b6b4a');
        }
        drawFox(ctx, s.desk.x, s.desk.y - 6, s.accent, t, working);
      }
      ctx.restore();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [now]);

  // ラベルのスクリーン座標(SCALE=3, CSSは100%幅なので%で配置)
  const labelStyle = (s) => ({
    position: 'absolute',
    left: `${(s.desk.x / BASE_W) * 100}%`,
    top: `${((s.desk.y - 26) / BASE_H) * 100}%`,
    transform: 'translate(-50%, -100%)',
    whiteSpace: 'nowrap', pointerEvents: 'none',
  });

  const todayViews = useMemo(() => {
    if (!stats?.views) return 0;
    return sumDay(stats.views[new Date().toISOString().slice(0, 10)]);
  }, [stats]);

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#e2e8f0', padding: '24px 14px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>🦊 KITSUNE FOX 商会 <span style={{ fontSize: 12, color: '#94a3b8' }}>— PCの中の会社</span></h1>
          <a href="/admin/" style={{ color: '#a5b4fc', fontSize: 13 }}>📊 経理室(/admin)</a>
        </div>
        <div style={{ display: 'flex', gap: 14, margin: '10px 0 14px', flexWrap: 'wrap', fontSize: 13, color: '#94a3b8' }}>
          <span>本日の来客 <b style={{ color: '#e2e8f0' }}>{todayViews}</b></span>
          <span>累計売上 <b style={{ color: '#34d399' }}>¥{(stats?.stripe?.totalJPY || 0).toLocaleString()}</b>（{stats?.stripe?.count || 0}件）</span>
          <span>{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {err && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{err}</p>}

        {/* オフィス画面 */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 768, margin: '0 auto', aspectRatio: `${BASE_W}/${BASE_H}`, border: '3px solid #1e293b', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 50px -20px rgba(0,0,0,.6)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
          {STAFF.map((s) => {
            const working = isWorking(s, now);
            const last = lastByAgent[s.id];
            const status = working ? (last ? last.action : `作業中: ${s.task}`) : '待機中';
            return (
              <div key={s.id} style={labelStyle(s)}>
                <div style={{ background: 'rgba(15,23,42,.92)', border: `1px solid ${s.accent}`, borderRadius: 5, padding: '2px 6px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#fff' }}>{s.name}<span style={{ color: '#94a3b8', fontWeight: 600 }}>〈{s.role}〉</span></div>
                  <div style={{ fontSize: 10, color: working ? '#fbbf24' : '#64748b', marginTop: 1, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {working ? '● ' : '○ '}{status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 日報 */}
        <div style={{ marginTop: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, maxWidth: 768, marginInline: 'auto' }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>📋 業務日報（最新）</h2>
          {activity.length === 0 ? (
            <p style={{ fontSize: 12.5, color: '#64748b' }}>まだ報告がありません。社員は次の勤務時間に日報を提出します。</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 5 }}>
              {activity.slice(0, 12).map((a, i) => {
                const st = STAFF.find((x) => x.id === a.agent);
                return <li key={i} style={{ fontSize: 12, color: '#cbd5e1' }}><span style={{ color: '#64748b' }}>{timeAgo(a.ts)}</span> <b>{st ? st.name : a.agent}</b>: {a.action}</li>;
              })}
            </ul>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#475569', marginTop: 16, textAlign: 'center' }}>社長の仕事: 週1回この画面を眺めて、キツネたちの日報にハンコを押すこと🦊</p>
      </div>
    </div>
  );
}
