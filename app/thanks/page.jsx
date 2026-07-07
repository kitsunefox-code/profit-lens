'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '../../lib/i18n';

function ThanksInner() {
  const { lang, toggle, t } = useLang();
  const params = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.setItem('pl_license_v1', sessionId);
      } catch { /* ignore */ }
    }
  }, [sessionId]);

  function copy() {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="container">
      <nav className="nav">
        <span className="brand"><span className="brand-mark">P</span>{t('app_name')}</span>
        <button className="lang-toggle" onClick={toggle}>{lang === 'ja' ? 'EN' : '日本語'}</button>
      </nav>

      <div className="demo-card" style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 10 }}>🎉</div>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>{t('thanks_title')}</h1>

        {sessionId ? (
          <>
            <p className="note" style={{ marginBottom: 16 }}>{t('thanks_desc')}</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>
              {t('thanks_code_label')}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={sessionId}
                onFocus={(e) => e.target.select()}
                style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace' }}
              />
              <button className="btn small" onClick={copy}>{copied ? t('thanks_copied') : t('thanks_copy')}</button>
            </div>
          </>
        ) : (
          <p className="note" style={{ color: 'var(--red)' }}>{t('thanks_missing')}</p>
        )}

        <div style={{ marginTop: 24 }}>
          <Link className="btn" href="/dashboard">{t('thanks_go')}</Link>
        </div>
      </div>
    </div>
  );
}

export default function Thanks() {
  return (
    <Suspense fallback={null}>
      <ThanksInner />
    </Suspense>
  );
}
