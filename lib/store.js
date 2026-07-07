'use client';

// ---------- constants ----------
export const FREE_TX_LIMIT = 100;

export const MARKETS = [
  { id: 'mercari', label: { ja: 'メルカリ', en: 'Mercari' }, rate: 10 },
  { id: 'amazon', label: { ja: 'Amazon', en: 'Amazon' }, rate: 15 },
  { id: 'ebay', label: { ja: 'eBay', en: 'eBay' }, rate: 13.25 },
  { id: 'yahoo', label: { ja: 'ヤフオク/Yahoo!フリマ', en: 'Yahoo JP' }, rate: 10 },
  { id: 'rakuten', label: { ja: '楽天', en: 'Rakuten' }, rate: 10 },
  { id: 'etsy', label: { ja: 'Etsy', en: 'Etsy' }, rate: 9.5 },
  { id: 'base', label: { ja: 'BASE', en: 'BASE' }, rate: 6.6 },
  { id: 'other', label: { ja: 'その他', en: 'Other' }, rate: 0 },
];

const TX_KEY = 'pl_transactions_v1';
const SETTINGS_KEY = 'pl_settings_v1';
const LICENSE_KEY = 'pl_license_v1';

// ---------- storage ----------
export function loadTx() {
  try { return JSON.parse(localStorage.getItem(TX_KEY) || '[]'); } catch { return []; }
}
export function saveTx(list) {
  localStorage.setItem(TX_KEY, JSON.stringify(list));
}
export function loadSettings() {
  const def = { currency: '¥', rates: Object.fromEntries(MARKETS.map((m) => [m.id, m.rate])) };
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (!s) return def;
    return { ...def, ...s, rates: { ...def.rates, ...(s.rates || {}) } };
  } catch { return def; }
}
export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
export function loadLicense() {
  try { return localStorage.getItem(LICENSE_KEY) || ''; } catch { return ''; }
}
export function saveLicense(k) { localStorage.setItem(LICENSE_KEY, k); }

// Placeholder validation — wire to a real license API (e.g. Lemon Squeezy) before launch.
export function isValidLicense(key) {
  return /^PL-[A-Z0-9]{4,}(-[A-Z0-9]+)*$/i.test((key || '').trim());
}

// ---------- calculations ----------
export function txFee(tx, settings) {
  if (tx.fee !== '' && tx.fee != null && !Number.isNaN(Number(tx.fee))) return Number(tx.fee);
  const rate = settings.rates[tx.market] ?? 0;
  return Math.round(Number(tx.sale || 0) * rate) / 100;
}
export function txProfit(tx, settings) {
  return Number(tx.sale || 0) - Number(tx.cost || 0) - txFee(tx, settings) - Number(tx.shipping || 0);
}

export function monthlySummary(list, settings) {
  const map = new Map();
  for (const tx of list) {
    const m = (tx.date || '').slice(0, 7) || '—';
    if (!map.has(m)) map.set(m, { month: m, revenue: 0, costs: 0, fees: 0, shipping: 0, profit: 0, count: 0 });
    const row = map.get(m);
    row.revenue += Number(tx.sale || 0);
    row.costs += Number(tx.cost || 0);
    row.fees += txFee(tx, settings);
    row.shipping += Number(tx.shipping || 0);
    row.profit += txProfit(tx, settings);
    row.count += Number(tx.qty || 1);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function productSummary(list, settings) {
  const map = new Map();
  for (const tx of list) {
    const k = (tx.name || '').trim() || '—';
    if (!map.has(k)) map.set(k, { name: k, revenue: 0, costs: 0, fees: 0, profit: 0, count: 0 });
    const row = map.get(k);
    row.revenue += Number(tx.sale || 0);
    row.costs += Number(tx.cost || 0);
    row.fees += txFee(tx, settings);
    row.profit += txProfit(tx, settings);
    row.count += Number(tx.qty || 1);
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit);
}

export function fmt(n, currency) {
  const v = Math.round(Number(n || 0));
  return currency + v.toLocaleString();
}
export function pct(profit, revenue) {
  if (!revenue) return '—';
  return (Math.round((profit / revenue) * 1000) / 10).toFixed(1) + '%';
}

// ---------- CSV ----------
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQ = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const GUESS = {
  date: [/date/i, /日付/, /売買日/, /注文日/, /購入日/, /取引日/],
  name: [/name/i, /title/i, /item/i, /商品/, /品名/],
  sale: [/sale/i, /price/i, /amount/i, /販売/, /売上/, /価格/, /金額/],
  cost: [/cost/i, /仕入/, /原価/],
  fee: [/fee/i, /手数料/],
  shipping: [/ship/i, /送料/, /配送/],
  qty: [/qty/i, /quantity/i, /個数/, /数量/],
};

export function guessMapping(headers) {
  const map = { date: -1, name: -1, sale: -1, cost: -1, fee: -1, shipping: -1, qty: -1 };
  for (const key of Object.keys(GUESS)) {
    for (let i = 0; i < headers.length; i++) {
      if (map[key] === -1 && GUESS[key].some((re) => re.test(headers[i]))) {
        if (Object.values(map).includes(i)) continue;
        map[key] = i;
      }
    }
  }
  return map;
}

export function normalizeDate(v) {
  if (!v) return '';
  const s = String(v).trim().replace(/[./]/g, '-');
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

export function toNumber(v) {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[¥$,\s円]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export function exportCsv(list, settings) {
  const head = ['date', 'name', 'qty', 'sale', 'cost', 'fee', 'shipping', 'market', 'profit'];
  const lines = [head.join(',')];
  for (const tx of list) {
    const cells = [
      tx.date, tx.name, tx.qty || 1, tx.sale, tx.cost,
      txFee(tx, settings), tx.shipping || 0, tx.market, Math.round(txProfit(tx, settings) * 100) / 100,
    ].map((c) => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    });
    lines.push(cells.join(','));
  }
  // BOM so Excel opens UTF-8 CSV correctly
  return '﻿' + lines.join('\r\n');
}

export function download(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
