'use client';

// バーチャルオフィス — PC内カンパニーの社員(自動化エージェント)の働きぶりを可視化する。
// データ: /admin と同じ STATS_KEY (localStorage) で stats + agent-report を取得。

import { useEffect, useMemo, useState } from 'react';

const KEY_STORE = 'pl_stats_key';

const STAFF = [
  {
    id: 'xbot', emoji: '📣', name: '広報キツネ',
    role: 'X自動投稿(トレンド連動)',
    schedule: [[12, 0, 12, 40]],
    idleNote: '次の投稿は毎日12時ごろ',
  },
  {
    id: 'inbox', emoji: '📮', name: '受付キツネ',
    role: 'ココナラ/CW/ランサーズ巡回・返信下書き',
    schedule: [[9, 0, 9, 40], [15, 0, 15, 40]],
    idleNote: '巡回は毎日9時・15時',
  },
  {
    id: 'system', emoji: '🧮', name: '経理キツネ',
    role: '閲覧数・売上の集計(24時間勤務)',
    schedule: 'always',
    idleNote: '',
  },
  {
    id: 'dev', emoji: '🛠️', name: '開発キツネ',
    role: 'アプリ開発・改修(チャットで出勤)',
    schedule: null,
    idleNote: '社長に呼ばれたら出勤',
  },
];

function isWorking(staff, now) {
  if (staff.schedule === 'always') return true;
  if (!staff.schedule) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return staff.schedule.some(([h1, m1, h2, m2]) => mins >= h1 * 60 + m1 && mins <= h2 * 60 + m2);
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function sumDay(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0);
}

export default function Office() {
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
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unauthorized'))))
        .then(setStats)
        .catch(() => setErr('認証エラー: 先に /admin でアクセスキーを入力してください'));
      fetch(`/.netlify/functions/agent-report?key=${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : { activity: [] }))
        .then((d) => setActivity(d.activity || []))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [key]);

  const todayViews = useMemo(() => {
    if (!stats || !stats.views) return 0;
    const d = new Date().toISOString().slice(0, 10);
    return sumDay(stats.views[d]);
  }, [stats]);

  const lastByAgent = useMemo(() => {
    const map = {};
    for (const a of activity) if (!map[a.agent]) map[a.agent] = a;
    return map;
  }, [activity]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0f172a, #1e2a4a)', color: '#e2e8f0', padding: '28px 16px' }}>
      <style>{`
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,.5); } 70% { box-shadow: 0 0 0 14px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
        @keyframes blink { 0%,90%,100% { opacity: 1; } 95% { opacity: .3; } }
        .desk { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 20px; text-align: center; }
        .avatar { width: 74px; height: 74px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 38px; margin: 0 auto 10px; background: rgba(79,70,229,.25); }
        .working .avatar { animation: bob 1.6s ease-in-out infinite, pulse-ring 2s infinite; background: rgba(16,185,129,.25); }
        .idle .avatar { animation: blink 6s infinite; filter: saturate(.6); }
        .badge { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 2px 10px; }
        .badge.on { background: rgba(16,185,129,.2); color: #34d399; }
        .badge.off { background: rgba(148,163,184,.15); color: #94a3b8; }
      `}</style>

      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>🏢 KITSUNE FOX 商会 <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>— PCの中の会社</span></h1>
          <a href="/admin/" style={{ color: '#a5b4fc', fontSize: 13 }}>📊 経理室(/admin)へ</a>
        </div>

        <div style={{ display: 'flex', gap: 14, margin: '16px 0 22px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>本日の来客: <b style={{ color: '#e2e8f0' }}>{todayViews}</b> 人</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>累計売上: <b style={{ color: '#34d399' }}>¥{(stats && stats.stripe ? stats.stripe.totalJPY : 0).toLocaleString()}</b>（{stats && stats.stripe ? stats.stripe.count : 0}件）</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 現在</div>
        </div>

        {err && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 14 }}>{err}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {STAFF.map((s) => {
            const working = isWorking(s, now);
            const last = lastByAgent[s.id];
            return (
              <div key={s.id} className={`desk ${working ? 'working' : 'idle'}`}>
                <div className="avatar">{s.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>🦊 {s.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 8px' }}>{s.role}</div>
                <span className={`badge ${working ? 'on' : 'off'}`}>{working ? '勤務中…' : '待機中'}</span>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 8, minHeight: 30 }}>
                  {last ? `${timeAgo(last.ts)}: ${last.action}` : s.idleNote}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>📋 業務日報（最新）</h2>
          {activity.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>まだ報告がありません。社員は次の勤務時間に最初の日報を提出します。</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6 }}>
              {activity.slice(0, 15).map((a, i) => {
                const st = STAFF.find((x) => x.id === a.agent);
                return (
                  <li key={i} style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                    <span style={{ color: '#64748b' }}>{timeAgo(a.ts)}</span>
                    {' '}<b>{st ? st.name : a.agent}</b>: {a.action}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: '#475569', marginTop: 18, textAlign: 'center' }}>
          社長の仕事: 週1回この画面を眺めて、キツネたちの日報にハンコを押すこと🦊
        </p>
      </div>
    </div>
  );
}
