'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n';
import {
  FREE_TX_LIMIT, MARKETS,
  loadTx, saveTx, loadSettings, saveSettings,
  txFee, txProfit, monthlySummary, productSummary, fmt, pct,
  parseCsv, guessMapping, normalizeDate, toNumber, exportCsv, download, uid,
  buildAiPrompt,
} from '../../lib/store';
import { LEMONSQUEEZY, isCheckoutConfigured } from '../../lib/config';
import { activate as activateKey, isProStored, storedKey, clearPro } from '../../lib/license';

const EMPTY_FORM = { date: '', name: '', qty: 1, sale: '', cost: '', fee: '', shipping: '', market: 'mercari' };

function MonthChart({ rows, currency }) {
  if (!rows.length) return null;
  const shown = rows.slice(-12);
  const max = Math.max(...shown.map((r) => Math.max(r.revenue, r.profit, 1)));
  const bw = 26, gap = 18, groupW = bw * 2 + 6 + gap;
  const w = Math.max(320, shown.length * groupW + 50);
  const h = 190;
  return (
    <div className="scroll-x">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" style={{ minWidth: Math.min(w, 640) }}>
        {shown.map((r, i) => {
          const x = 30 + i * groupW;
          const rh = (Math.max(r.revenue, 0) / max) * 130;
          const ph = (Math.max(r.profit, 0) / max) * 130;
          return (
            <g key={r.month}>
              <rect x={x} y={155 - rh} width={bw} height={rh} rx={4} fill="#c7d2fe" />
              <rect x={x + bw + 6} y={155 - ph} width={bw} height={ph} rx={4} fill={r.profit >= 0 ? '#059669' : '#dc2626'} />
              <text x={x + bw + 3} y={172} textAnchor="middle" fontSize="10.5" fill="#64748b">{r.month.slice(2)}</text>
              <text x={x + bw + 3} y={148 - Math.max(rh, ph)} textAnchor="middle" fontSize="10" fill="#334155">
                {fmt(r.profit, currency)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { lang, toggle, t } = useLang();
  const [txs, setTxs] = useState([]);
  const [settings, setSettings] = useState({ currency: '¥', rates: {} });
  const [isPro, setIsPro] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');
  const [activating, setActivating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [csvState, setCsvState] = useState(null); // {headers, rows, map}
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);
  const jsonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTxs(loadTx());
    setSettings(loadSettings());
    setIsPro(isProStored());
    setLicenseInput(storedKey());
    const today = new Date();
    setForm((f) => ({ ...f, date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` }));
    setReady(true);
  }, []);

  const capReached = !isPro && txs.length >= FREE_TX_LIMIT;
  const checkoutHref = isCheckoutConfigured() ? LEMONSQUEEZY.CHECKOUT_URL : '/#pricing';

  const months = useMemo(() => monthlySummary(txs, settings), [txs, settings]);
  const products = useMemo(() => productSummary(txs, settings), [txs, settings]);
  const totals = useMemo(() => months.reduce(
    (a, r) => ({
      revenue: a.revenue + r.revenue, costs: a.costs + r.costs,
      fees: a.fees + r.fees, profit: a.profit + r.profit,
    }),
    { revenue: 0, costs: 0, fees: 0, profit: 0 },
  ), [months]);

  function persist(next) { setTxs(next); saveTx(next); }

  function addTx(e) {
    e.preventDefault();
    if (capReached) return;
    if (!form.date || !form.name || form.sale === '') return;
    persist([...txs, { ...form, id: uid(), qty: Number(form.qty || 1), sale: toNumber(form.sale), cost: toNumber(form.cost), shipping: toNumber(form.shipping) }]);
    setForm((f) => ({ ...EMPTY_FORM, date: f.date, market: f.market }));
    flash('✓');
  }

  function removeTx(id) { persist(txs.filter((x) => x.id !== id)); }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function onCsvFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''));
      if (rows.length < 2) return;
      setCsvState({ headers: rows[0], rows: rows.slice(1), map: guessMapping(rows[0]) });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function doImport() {
    const { headers, rows, map } = csvState;
    if (map.date < 0 || map.name < 0 || map.sale < 0) return;
    const pick = (row, idx) => (idx >= 0 && idx < row.length ? row[idx] : '');
    let added = [];
    for (const row of rows) {
      const date = normalizeDate(pick(row, map.date));
      const name = String(pick(row, map.name)).trim();
      if (!date || !name) continue;
      added.push({
        id: uid(), date, name,
        qty: Math.max(1, Math.round(toNumber(pick(row, map.qty)) || 1)),
        sale: toNumber(pick(row, map.sale)),
        cost: toNumber(pick(row, map.cost)),
        fee: map.fee >= 0 && String(pick(row, map.fee)).trim() !== '' ? toNumber(pick(row, map.fee)) : '',
        shipping: toNumber(pick(row, map.shipping)),
        market: form.market,
      });
    }
    let next = [...txs, ...added];
    if (!isPro && next.length > FREE_TX_LIMIT) next = next.slice(0, FREE_TX_LIMIT);
    persist(next);
    setCsvState(null);
    flash(`${Math.min(added.length, next.length - txs.length)} ${t('imported')}`);
  }

  async function activate() {
    const k = licenseInput.trim();
    if (!k) return;
    setActivating(true);
    setLicenseMsg('');
    const res = await activateKey(k);
    setActivating(false);
    if (res.ok) { setIsPro(true); setLicenseMsg(''); flash('✓'); }
    else setLicenseMsg(res.message === 'network' ? t('license_network') : t('invalid_key'));
  }

  function deactivate() {
    clearPro();
    setIsPro(false);
    setLicenseInput('');
  }

  function backup() {
    download('profitlens-backup.json', JSON.stringify({ v: 1, txs, settings }, null, 2), 'application/json');
  }
  function onRestore(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        if (Array.isArray(data.txs)) { persist(data.txs); }
        if (data.settings) { setSettings(data.settings); saveSettings(data.settings); }
        flash('✓');
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function updateRate(id, v) {
    const next = { ...settings, rates: { ...settings.rates, [id]: toNumber(v) } };
    setSettings(next); saveSettings(next);
  }
  function updateCurrency(v) {
    const next = { ...settings, currency: v };
    setSettings(next); saveSettings(next);
  }

  const marketLabel = (id) => {
    const m = MARKETS.find((x) => x.id === id);
    return m ? m.label[lang] : id;
  };

  const visibleProducts = isPro ? products : products.slice(0, 3);
  const cur = settings.currency;

  if (!ready) return null;

  return (
    <div className="container db-wrap">
      <div className="db-head">
        <span className="brand"><span className="brand-mark">P</span><Link href="/" style={{ color: 'inherit' }}>{t('app_name')}</Link></span>
        <div className="toolbar">
          {isPro ? <span className="pill gold" style={{ alignSelf: 'center' }}>★ {t('activated')}</span> : null}
          <button className="lang-toggle" onClick={toggle}>{lang === 'ja' ? 'EN' : '日本語'}</button>
        </div>
      </div>

      {capReached && (
        <div className="warn">{t('free_cap_note')} <a href={checkoutHref} target={isCheckoutConfigured() ? '_blank' : undefined} rel="noopener noreferrer">{t('upgrade')} →</a></div>
      )}

      <div className="kpis">
        <div className="kpi"><div className="label">{t('revenue')}</div><div className="value">{fmt(totals.revenue, cur)}</div></div>
        <div className="kpi"><div className="label">{t('costs')}</div><div className="value">{fmt(totals.costs, cur)}</div></div>
        <div className="kpi"><div className="label">{t('fees')}</div><div className="value">{fmt(totals.fees, cur)}</div></div>
        <div className="kpi"><div className="label">{t('profit')}</div><div className={`value ${totals.profit >= 0 ? 'pos' : 'neg'}`}>{fmt(totals.profit, cur)}</div></div>
        <div className="kpi"><div className="label">{t('margin')}</div><div className="value">{pct(totals.profit, totals.revenue)}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{t('add_tx')}</h2>
          <div className="toolbar">
            <button className="btn small ghost" onClick={() => fileRef.current && fileRef.current.click()}>📥 {t('import_csv')}</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onCsvFile} />
          </div>
        </div>
        <form onSubmit={addTx}>
          <div className="form-grid">
            <div className="field"><label>{t('date')}*</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><label>{t('name')}*</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>{t('qty')}</label><input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
            <div className="field"><label>{t('sale')}*</label><input type="number" step="any" required value={form.sale} onChange={(e) => setForm({ ...form, sale: e.target.value })} /></div>
            <div className="field"><label>{t('cost')}</label><input type="number" step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="field"><label>{t('fee')}</label><input type="number" step="any" placeholder={t('fee_ph')} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
            <div className="field"><label>{t('shipping')}</label><input type="number" step="any" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} /></div>
            <div className="field"><label>{t('market')}</label>
              <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
                {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label[lang]} ({settings.rates[m.id] ?? m.rate}%)</option>)}
              </select>
            </div>
            <div className="field" style={{ alignSelf: 'end' }}>
              <button className="btn" style={{ width: '100%' }} disabled={capReached}>{t('add')} {toast && <span> {toast}</span>}</button>
            </div>
          </div>
        </form>
      </div>

      {months.length > 0 && (
        <div className="panel">
          <h2>{t('chart_title')}</h2>
          <MonthChart rows={months} currency={cur} />
        </div>
      )}

      <div className="panel">
        <h2>{t('monthly')}</h2>
        {months.length === 0 ? <p className="note">{t('empty')}</p> : (
          <div className="scroll-x">
            <table className="data">
              <thead><tr>
                <th>{t('month')}</th><th className="num-cell">{t('sold')}</th><th className="num-cell">{t('revenue')}</th>
                <th className="num-cell">{t('costs')}</th><th className="num-cell">{t('fees')}</th>
                <th className="num-cell">{t('shipping')}</th><th className="num-cell">{t('profit')}</th><th className="num-cell">{t('margin')}</th>
              </tr></thead>
              <tbody>
                {months.map((r) => (
                  <tr key={r.month}>
                    <td>{r.month}</td>
                    <td className="num-cell">{r.count}</td>
                    <td className="num-cell">{fmt(r.revenue, cur)}</td>
                    <td className="num-cell">{fmt(r.costs, cur)}</td>
                    <td className="num-cell">{fmt(r.fees, cur)}</td>
                    <td className="num-cell">{fmt(r.shipping, cur)}</td>
                    <td className={`num-cell ${r.profit >= 0 ? 'pos' : 'neg'}`}>{fmt(r.profit, cur)}</td>
                    <td className="num-cell">{pct(r.profit, r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{t('products')} {!isPro && products.length > 3 ? <span className="pill gold">{t('top_products')}</span> : null}</h2>
          {!isPro && <a className="btn small gold" href={checkoutHref} target={isCheckoutConfigured() ? '_blank' : undefined} rel="noopener noreferrer">{t('upgrade')}</a>}
        </div>
        {products.length === 0 ? <p className="note">{t('empty')}</p> : (
          <div className="scroll-x">
            <table className="data">
              <thead><tr>
                <th>{t('product')}</th><th className="num-cell">{t('sold')}</th><th className="num-cell">{t('revenue')}</th>
                <th className="num-cell">{t('profit')}</th><th className="num-cell">{t('margin')}</th>
              </tr></thead>
              <tbody>
                {visibleProducts.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="num-cell">{r.count}</td>
                    <td className="num-cell">{fmt(r.revenue, cur)}</td>
                    <td className={`num-cell ${r.profit >= 0 ? 'pos' : 'neg'}`}>{fmt(r.profit, cur)}</td>
                    <td className="num-cell">{pct(r.profit, r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{t('tx_list')} <span className="pill">{txs.length}{!isPro ? ` / ${FREE_TX_LIMIT}` : ''}</span></h2>
          <div className="toolbar">
            <button className="btn small ghost" onClick={backup}>💾 {t('export_json')}</button>
            <button className="btn small ghost" onClick={() => jsonRef.current && jsonRef.current.click()}>📤 {t('import_json')}</button>
            <input ref={jsonRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onRestore} />
            <button className="btn small green" onClick={() => (isPro ? download('profitlens.csv', exportCsv(txs, settings), 'text/csv') : flash(t('pro_only')))}>
              ⬇ {t('export_csv')}{!isPro ? ' ★' : ''}
            </button>
          </div>
        </div>
        {txs.length === 0 ? <p className="note">{t('empty')}</p> : (
          <div className="scroll-x">
            <table className="data">
              <thead><tr>
                <th>{t('date')}</th><th>{t('name')}</th><th>{t('market')}</th>
                <th className="num-cell">{t('sale')}</th><th className="num-cell">{t('cost')}</th>
                <th className="num-cell">{t('fees')}</th><th className="num-cell">{t('profit')}</th><th></th>
              </tr></thead>
              <tbody>
                {[...txs].reverse().slice(0, 200).map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.date}</td>
                    <td>{tx.name}</td>
                    <td><span className="pill">{marketLabel(tx.market)}</span></td>
                    <td className="num-cell">{fmt(tx.sale, cur)}</td>
                    <td className="num-cell">{fmt(tx.cost, cur)}</td>
                    <td className="num-cell">{fmt(txFee(tx, settings), cur)}</td>
                    <td className={`num-cell ${txProfit(tx, settings) >= 0 ? 'pos' : 'neg'}`}>{fmt(txProfit(tx, settings), cur)}</td>
                    <td><button className="btn small ghost" onClick={() => removeTx(tx.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{t('ai_title')} <span className="pill gold">Pro</span></h2>
          {!isPro && <a className="btn small gold" href={checkoutHref} target={isCheckoutConfigured() ? '_blank' : undefined} rel="noopener noreferrer">{t('upgrade')}</a>}
        </div>
        <p className="note" style={{ marginBottom: 12 }}>{t('ai_desc')}</p>
        <div className="toolbar">
          {['review', 'loss', 'restock'].map((kind, i) => (
            <button
              key={kind}
              className="btn small ghost"
              onClick={() => {
                if (!isPro) { flash(t('pro_only')); return; }
                if (!months.length) { flash(t('ai_need_data')); return; }
                navigator.clipboard.writeText(buildAiPrompt(kind, months, products, settings, lang));
                flash(t('ai_copied'));
              }}
            >
              {t(`ai_p${i + 1}`)}{!isPro ? ' ★' : ''}
            </button>
          ))}
        </div>
        {toast && <p className="note" style={{ marginTop: 10, color: 'var(--green)' }}>{toast}</p>}
      </div>

      <div className="panel">
        <h2>{t('settings')}</h2>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>{t('currency')}</label>
            <select value={settings.currency} onChange={(e) => updateCurrency(e.target.value)}>
              <option value="¥">¥ (JPY)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
            </select>
          </div>
          {MARKETS.map((m) => (
            <div className="field" key={m.id}>
              <label>{m.label[lang]} (%)</label>
              <input type="number" step="any" value={settings.rates[m.id] ?? m.rate} onChange={(e) => updateRate(m.id, e.target.value)} />
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 8 }}>{t('pro_title')}</h2>
        <p className="note" style={{ marginBottom: 8 }}>{t('pro_desc')}</p>
        {isPro ? (
          <div className="toolbar">
            <span className="pill gold" style={{ alignSelf: 'center' }}>★ {t('activated')}</span>
            <button className="btn small ghost" onClick={deactivate}>{t('deactivate')}</button>
          </div>
        ) : (
          <>
            {isCheckoutConfigured() && (
              <p style={{ marginBottom: 10 }}>
                <a className="btn small gold" href={LEMONSQUEEZY.CHECKOUT_URL} target="_blank" rel="noopener noreferrer">{t('buy')} →</a>
                <span className="note" style={{ marginLeft: 10 }}>{t('after_purchase')}</span>
              </p>
            )}
            <div className="toolbar">
              <input
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 260 }}
                placeholder={t('license_ph')} value={licenseInput} onChange={(e) => setLicenseInput(e.target.value)}
              />
              <button className="btn small" onClick={activate} disabled={activating}>{activating ? '…' : t('activate')}</button>
              {licenseMsg && <span className="note" style={{ color: 'var(--red)', alignSelf: 'center' }}>{licenseMsg}</span>}
            </div>
            {!isCheckoutConfigured() && <p className="note" style={{ marginTop: 8 }}>{t('checkout_soon')}</p>}
          </>
        )}

        {lang === 'ja' && (
          <p className="note" style={{ marginTop: 16 }}>
            📗 <a href="https://coconala.com/contents_market/pictures/cmr8yo9gi01kx8i0hrve8r7ft" target="_blank" rel="noopener noreferrer">{t('cross_sell')}</a>
          </p>
        )}
      </div>

      {csvState && (
        <div className="modal-bg" onClick={() => setCsvState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('map_title')}</h3>
            <p className="note" style={{ marginBottom: 12 }}>{t('map_hint')}</p>
            <div className="form-grid">
              {['date', 'name', 'sale', 'cost', 'fee', 'shipping', 'qty'].map((key) => (
                <div className="field" key={key}>
                  <label>{t(key)}{['date', 'name', 'sale'].includes(key) ? '*' : ''}</label>
                  <select
                    value={csvState.map[key]}
                    onChange={(e) => setCsvState({ ...csvState, map: { ...csvState.map, [key]: Number(e.target.value) } })}
                  >
                    <option value={-1}>—</option>
                    {csvState.headers.map((hd, i) => <option key={i} value={i}>{hd || `(${i + 1})`}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="note" style={{ margin: '12px 0' }}>{csvState.rows.length} rows</p>
            <div className="toolbar">
              <button className="btn" onClick={doImport} disabled={csvState.map.date < 0 || csvState.map.name < 0 || csvState.map.sale < 0}>{t('do_import')}</button>
              <button className="btn ghost" onClick={() => setCsvState(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
