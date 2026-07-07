'use client';

import Link from 'next/link';
import { useLang } from '../lib/i18n';
import { LEMONSQUEEZY, isCheckoutConfigured } from '../lib/config';

function DemoPreview({ t }) {
  const rows = [
    { m: '2026-04', r: 84200, p: 26890 },
    { m: '2026-05', r: 96500, p: 31240 },
    { m: '2026-06', r: 128400, p: 44810 },
  ];
  const max = 130000;
  return (
    <div className="demo-card" aria-hidden>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <strong style={{ fontSize: 14 }}>{t('monthly')}</strong>
        <span className="pill">{t('margin')} 34.9%</span>
      </div>
      <svg viewBox="0 0 640 180" className="chart-svg">
        {rows.map((row, i) => {
          const x = 60 + i * 200;
          const rh = (row.r / max) * 130;
          const ph = (row.p / max) * 130;
          return (
            <g key={row.m}>
              <rect x={x} y={150 - rh} width={54} height={rh} rx={6} fill="#c7d2fe" />
              <rect x={x + 62} y={150 - ph} width={54} height={ph} rx={6} fill="#059669" />
              <text x={x + 58} y={168} textAnchor="middle" fontSize="12" fill="#64748b">{row.m}</text>
            </g>
          );
        })}
        <g fontSize="11" fill="#64748b">
          <rect x={470} y={6} width={10} height={10} rx={2} fill="#c7d2fe" />
          <text x={485} y={15}>{t('revenue')}</text>
          <rect x={545} y={6} width={10} height={10} rx={2} fill="#059669" />
          <text x={560} y={15}>{t('profit')}</text>
        </g>
      </svg>
    </div>
  );
}

export default function Landing() {
  const { lang, toggle, t } = useLang();

  return (
    <div>
      <div className="container">
        <nav className="nav">
          <span className="brand"><span className="brand-mark">P</span>{t('app_name')}</span>
          <span className="nav-actions">
            <button className="lang-toggle" onClick={toggle}>{lang === 'ja' ? 'EN' : '日本語'}</button>
            <Link className="btn small" href="/dashboard">{t('nav_dashboard')}</Link>
          </span>
        </nav>

        <header className="hero">
          <span className="badge">{t('hero_badge')}</span>
          <h1 style={{ whiteSpace: 'pre-line' }}>{t('hero_title')}</h1>
          <p className="sub">{t('hero_sub')}</p>
          <div className="cta-row">
            <Link className="btn" href="/dashboard" style={{ padding: '13px 26px', fontSize: 15 }}>{t('cta_start')}</Link>
          </div>
          <p className="cta-note">{t('cta_note')}</p>
          <DemoPreview t={t} />
        </header>

        <section className="section">
          <div className="grid3">
            <div className="card"><div className="icon">📋</div><h3>{t('feat1_t')}</h3><p>{t('feat1_d')}</p></div>
            <div className="card"><div className="icon">🧮</div><h3>{t('feat2_t')}</h3><p>{t('feat2_d')}</p></div>
            <div className="card"><div className="icon">🔒</div><h3>{t('feat3_t')}</h3><p>{t('feat3_d')}</p></div>
          </div>
        </section>

        <section className="section">
          <h2>{t('how_t')}</h2>
          <div className="steps">
            {[t('how1'), t('how2'), t('how3')].map((s, i) => (
              <div className="step" key={i}><span className="num">{i + 1}</span><p style={{ fontSize: 14 }}>{s}</p></div>
            ))}
          </div>
        </section>

        <section className="section" id="pricing">
          <h2>{t('pricing_t')}</h2>
          <div className="pricing">
            <div className="plan">
              <h3>{t('plan_free')}</h3>
              <div className="price">{t('price_free')}</div>
              <ul>
                <li>{t('free_f1')}</li><li>{t('free_f2')}</li><li>{t('free_f3')}</li><li>{t('free_f4')}</li>
              </ul>
              <Link className="btn ghost" href="/dashboard" style={{ width: '100%', textAlign: 'center' }}>{t('cta_start')}</Link>
            </div>
            <div className="plan featured">
              <span className="tag">{t('tag_pro')}</span>
              <h3>{t('plan_pro')}</h3>
              <div className="price">{t('price_pro')} <small>{t('price_pro_note')}</small></div>
              <ul>
                <li>{t('pro_f1')}</li><li>{t('pro_f2')}</li><li>{t('pro_f3')}</li><li>{t('pro_f4')}</li><li>{t('pro_f5')}</li>
              </ul>
              {isCheckoutConfigured() ? (
                <a className="btn" href={LEMONSQUEEZY.CHECKOUT_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center' }}>{t('buy')}</a>
              ) : (
                <Link className="btn" href="/dashboard" style={{ display: 'block', textAlign: 'center' }}>{t('buy')}</Link>
              )}
              <p className="note" style={{ marginTop: 10 }}>{t('buy_note')}</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>{t('faq_t')}</h2>
          <div className="faq">
            {[1, 2, 3].map((i) => (
              <div className="qa" key={i}>
                <div className="q">{t(`faq${i}_q`)}</div>
                <div className="a">{t(`faq${i}_a`)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">{t('footer_note')}</div>
      </footer>
    </div>
  );
}
