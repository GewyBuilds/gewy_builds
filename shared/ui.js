// Small helpers shared by both apps.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const SYMBOL = { EUR: '€', USD: '$', GBP: '£' };
export function eur(n) {
  const cur = (globalThis.GEWY_CONFIG && globalThis.GEWY_CONFIG.currency) || 'EUR';
  const v = Math.round((+n || 0) * 100) / 100;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return (SYMBOL[cur] || cur + ' ') + s;
}

export function ago(ts, lang = 'en') {
  if (!ts) return '';
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  const el = lang === 'el';
  if (s < 60) return el ? 'τώρα' : 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return el ? `${m} λ πριν` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return el ? `${h} ώ πριν` : `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return el ? `${d} μ πριν` : `${d}d ago`;
  return new Date(ts).toLocaleDateString(el ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' });
}

export function toast(msg, ms = 2800) {
  let box = $('#toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  while (box.children.length >= 3) box.firstChild.remove(); // never stack more than 3
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

// Bottom sheet. Returns { el, close }. Any element with [data-close] closes it.
export function sheet(html, { full = false, onClose } = {}) {
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `<div class="sheet${full ? ' full' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => back.classList.add('in'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove('in');
    setTimeout(() => {
      back.remove();
      if (!$('.sheet-back')) document.body.classList.remove('noscroll');
      document.dispatchEvent(new CustomEvent('gewy:sheetclosed'));
    }, 180);
    onClose && onClose();
  };
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-close]')) close();
  });
  return { el: back.firstElementChild, close };
}

export function copy(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const t = document.createElement('textarea');
  t.value = text;
  document.body.appendChild(t);
  t.select();
  document.execCommand('copy');
  t.remove();
}

export const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const monthKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

// Replace {amount} {amount_cents} {order} {currency} in a payment-link template.
export function fillPayLink(tpl, order) {
  const cur = (globalThis.GEWY_CONFIG && globalThis.GEWY_CONFIG.currency) || 'EUR';
  const amt = (Math.round(order.total * 100) / 100).toFixed(2);
  return String(tpl || '')
    .replaceAll('{amount}', amt)
    .replaceAll('{amount_cents}', String(Math.round(order.total * 100)))
    .replaceAll('{order}', encodeURIComponent(order.no || ''))
    .replaceAll('{currency}', cur);
}

// WhatsApp wants the country code. Greek numbers typed as 69xxxxxxxx or 2xxxxxxxxx get 30 in front.
export function waNumber(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 10 && /^[26]/.test(d)) d = '30' + d;
  return d;
}
