import * as B from './shared/backend.js';
import { HANDOFF_DEF, COURIER_DEF, parseAreas } from './shared/areas.js';
import { $, $$, esc, eur, toast, sheet, ago, copy, monthKey, fmtDay, waNumber } from './shared/ui.js';

const CFG = globalThis.GEWY_CONFIG || {};
const S = {
  view: 'home', user: null, products: [], requests: [], orders: [], subs: [], devices: [], settings: {},
  ofilter: 'active', stops: [], threadRedraw: null,
};
const digits = (s) => String(s || '').replace(/\D/g, '');
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const ORDER_CHIP = { new: 'blue', making: 'acc', ready: 'warn', delivered: 'ok', cancelled: 'bad' };
const ORDER_LBL = { new: 'New', making: 'Printing', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled' };
const REQ_CHIP = { new: 'blue', discussing: 'acc', quoted: 'warn', approved: 'ok', printing: 'acc', done: 'ok', closed: 'bad' };
const REQ_LBL = { new: 'New', discussing: 'In talks', quoted: 'Quote sent', approved: 'Approved', printing: 'Printing', done: 'Done', closed: 'Closed' };
const REQ_OPEN = (r) => !['done', 'closed'].includes(r.status);
const needsReply = (r) => REQ_OPEN(r) && r.lastFrom === 'customer' && r.status !== 'approved';
const isPaid = (o) => o.payStatus === 'paid' && o.status !== 'cancelled';
const isDep = (o) => o.payStatus === 'deposit' && o.status !== 'cancelled';
const owed = (o) => (o.payStatus === 'paid' ? 0 : o.payStatus === 'deposit' ? Math.max(0, o.total - (o.paidAmount || 0)) : o.total);

/* ---------------------------------------------------------------- frame */
function frame(title, body, { back = true } = {}) {
  $('#app').innerHTML = `
    <header class="top"><div class="wrap">
      ${back ? '<button class="iconbtn" data-act="home" aria-label="Back">←</button>' : ''}
      <div class="logo grow">${back ? '' : '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="17" width="18" height="3" rx="1.5" fill="currentColor" opacity=".35"/><rect x="3" y="12" width="18" height="3" rx="1.5" fill="currentColor" opacity=".6"/><rect x="3" y="7" width="18" height="3" rx="1.5" fill="currentColor" opacity=".85"/><rect x="3" y="2" width="18" height="3" rx="1.5" style="fill:var(--acc)"/></svg>'}<span>${back ? esc(title) : 'GEWY <b>ADMIN</b>'}</span></div>
      ${B.mode === 'demo' ? '<span class="chip blue">DEMO</span>' : ''}
      <button class="iconbtn" data-act="go" data-v="settings" aria-label="Settings">⚙️</button>
    </div></header>
    <main class="wrap" style="padding-bottom:60px">${body}</main>`;
}

function render() {
  if (!S.user) return renderLogin();
  ({ home: viewHome, products: viewProducts, requests: viewRequests, orders: viewOrders, money: viewMoney, audience: viewAudience, notify: viewNotify, settings: viewSettings }[S.view] || viewHome)();
}

/* ---------------------------------------------------------------- login */
function renderLogin() {
  $('#app').innerHTML = `<main class="wrap" style="padding-top:12vh">
    <div class="logo" style="font-size:22px"><svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="17" width="18" height="3" rx="1.5" fill="currentColor" opacity=".35"/><rect x="3" y="12" width="18" height="3" rx="1.5" fill="currentColor" opacity=".6"/><rect x="3" y="7" width="18" height="3" rx="1.5" fill="currentColor" opacity=".85"/><rect x="3" y="2" width="18" height="3" rx="1.5" style="fill:var(--acc)"/></svg><span>GEWY <b>ADMIN</b></span></div>
    <p class="mut">Sign in to manage your shop.</p>
    ${B.mode === 'demo' ? '<div class="banner demo">🧪 <span><b>DEMO MODE</b> — any email and password works. Data stays in this browser.</span></div>' : ''}
    <label class="f"><span>Email</span><input class="in" id="lE" type="email" autocomplete="username" inputmode="email"></label>
    <label class="f"><span>Password</span><input class="in" id="lP" type="password" autocomplete="current-password"></label>
    <div class="gap"></div><button class="btn pri block" data-act="login">Sign in</button></main>`;
}

/* ----------------------------------------------------------------- home */
function viewHome() {
  const openReq = S.requests.filter(needsReply).length;
  const newOrders = S.orders.filter((o) => o.status === 'new').length;
  const m = moneyStats();
  const tile = (v, ic, tt, st, bd) => `<button class="tile" data-act="go" data-v="${v}">${bd ? `<span class="bd">${bd}</span>` : ''}<span class="ic">${ic}</span><span><div class="tt">${tt}</div><div class="st">${st}</div></span></button>`;
  frame('', `<div class="gap"></div>
    ${pushNudge()}
    <div class="tiles">
      ${tile('products', '🧩', 'PRODUCTS', `${S.products.filter((p) => p.published !== false).length} live`, 0)}
      ${tile('requests', '✏️', 'REQUESTS', openReq ? `${openReq} waiting for you` : 'all answered', openReq)}
      ${tile('orders', '📦', 'ORDERS', `${S.orders.filter((o) => ['new', 'making', 'ready'].includes(o.status)).length} active`, newOrders)}
      ${tile('money', '💶', 'MONEY', `${eur(m.profit)} profit`, 0)}
      ${tile('audience', '👥', 'AUDIENCE', `${S.devices.length} people · ${S.devices.filter((d) => d.installed).length} installed`, 0)}
      ${B.pushAvailable ? tile('notify', '🔔', 'NOTIFY', B.mode === 'demo' ? 'send an alert' : `${S.subs.filter((x) => x.role === 'shop').length} phones`, 0) : ''}
      ${tile('settings', '⚙️', 'SETTINGS', S.settings.payLink ? 'payments set up' : 'set up payments', S.settings.payLink ? 0 : '!')}
    </div>
    <p class="mut sm" style="text-align:center;margin-top:20px">Customer shop: <a href="./" target="_blank">${esc(new URL('./', location.href).href)}</a></p>`, { back: false });
}

function pushNudge() {
  if (!B.pushAvailable || B.pushEnabled('admin')) return '';
  return `<div class="banner">🔔 <span class="grow">Get an alert on this phone for new orders and messages.</span><button class="btn sm pri" data-act="pushAdmin">Turn on</button></div><div class="gap"></div>`;
}

/* ------------------------------------------------------------- products */
function viewProducts() {
  const rows = [...S.products].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  frame('PRODUCTS', `<div class="gap"></div><button class="btn pri block" data-act="editProd" data-id="">＋ Add product</button><div class="gap"></div>
    ${rows.length ? rows.map((p) => {
      const margin = p.cost ? ` · profit ${eur(p.price - p.cost)}` : '';
      return `<button class="card prod" style="padding:10px" data-act="editProd" data-id="${esc(p.id)}"><div class="row">
        <div style="width:64px;height:64px;border-radius:12px;overflow:hidden;background:var(--bg3);flex:none">${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" style="width:100%;height:100%;object-fit:cover" alt="">` : '<div class="noimg">🧩</div>'}</div>
        <div class="grow"><b>${esc(p.name)}</b><div class="mono mut sm">${eur(p.price)}${margin}</div>
        <div class="chips" style="margin-top:4px">${p.published === false ? '<span class="chip warn">hidden</span>' : '<span class="chip ok">live</span>'}${p.soldOut ? '<span class="chip bad">sold out</span>' : ''}</div></div></div></button>`;
    }).join('') : `<div class="empty">No products yet. Tap “Add product”.</div>${B.mode === 'demo' ? '<div class="gap"></div><button class="btn block" data-act="seed">Load 3 demo products</button>' : ''}`}`);
}

function placeholderImg(label, c1, c2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><g fill="rgba(0,0,0,.18)">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="90" y="${150 + i * 38}" width="420" height="14" rx="7"/>`).join('')}</g><text x="300" y="320" font-family="monospace" font-size="56" font-weight="700" text-anchor="middle" fill="#fff">${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
async function seedDemo() {
  const now = Date.now();
  const items = [
    ['Hoodie Bunny', 8, 1.6, 'Cute desk figurine', ['Pink', 'Mint', 'Black'], '#ff9ec4', '#ff6a1a'],
    ['Phone Stand', 6, 1.1, 'Stable stand, any phone', ['Black', 'Orange'], '#4da3ff', '#2a4a78'],
    ['Cable Organizer', 4, 0.6, 'Keeps your desk tidy', ['Grey', 'White'], '#35d07f', '#0e5a3a'],
  ];
  for (const [name, price, cost, description, colors, c1, c2] of items) {
    await B.add('products', { name, price, cost, description, colors, category: 'Demo', images: [placeholderImg(name.split(' ')[0], c1, c2)], published: true, soldOut: false, createdAt: now, updatedAt: now });
  }
  toast('Demo products added');
}

function openProductEditor(id) {
  const old = S.products.find((p) => p.id === id);
  const p = old || { name: '', price: '', cost: '', category: '', colors: [], description: '', images: [], published: true, soldOut: false };
  const imgs = [...(p.images || [])];
  const files = [];
  const s = sheet(`
    <div class="hd"><div class="ttl">${old ? 'Edit product' : 'New product'}</div><button class="xbtn" data-close>✕</button></div>
    <div class="h2">Photos</div><div class="thumbs" id="eTh"></div><input type="file" id="eF" accept="image/*" multiple class="hide">
    <label class="f"><span>Name</span><input class="in" id="eN" value="${esc(p.name)}"></label>
    <div class="two"><label class="f"><span>Price (${esc(CFG.currency || 'EUR')})</span><input class="in" id="eP" inputmode="decimal" value="${esc(p.price)}"></label>
    <label class="f"><span>Cost to make</span><input class="in" id="eC" inputmode="decimal" value="${esc(p.cost)}"></label></div>
    <label class="f"><span>Colors (comma separated)</span><input class="in" id="eCo" placeholder="Black, Orange, Pink" value="${esc((p.colors || []).join(', '))}"></label>
    <label class="f"><span>Category</span><input class="in" id="eCa" value="${esc(p.category || '')}"></label>
    <label class="f"><span>Description</span><textarea class="in" id="eD">${esc(p.description || '')}</textarea></label>
    <label class="check"><input type="checkbox" id="eV" ${p.published !== false ? 'checked' : ''}> <span>Visible in the shop</span></label>
    <label class="check"><input type="checkbox" id="eS" ${p.soldOut ? 'checked' : ''}> <span>Mark as sold out</span></label>
    ${B.pushAvailable ? `<label class="check"><input type="checkbox" id="eNo" ${old ? '' : 'checked'}> <span>🔔 Notify customers about this product</span></label>` : ''}
    <div class="gap"></div><button class="btn pri block" data-a="save">${old ? 'Save changes' : 'Publish product'}</button>
    ${old ? '<div class="gap-s"></div><button class="btn bad block" data-a="del">Delete product</button>' : ''}`);
  const draw = () => {
    $('#eTh', s.el).innerHTML = imgs.map((u, i) => `<div class="thumb"><img src="${esc(u)}" alt=""><button data-a="rmI" data-i="${i}">✕</button></div>`).join('') +
      files.map((f, i) => `<div class="thumb"><img src="${URL.createObjectURL(f)}" alt=""><button data-a="rmF" data-i="${i}">✕</button></div>`).join('') +
      (imgs.length + files.length < B.MAX_PHOTOS ? '<button class="addimg" data-a="pick">＋</button>' : '<span class="mut sm" style="align-self:center">max ' + B.MAX_PHOTOS + ' photos</span>');
  };
  draw();
  $('#eF', s.el).addEventListener('change', (e) => {
    const room = Math.max(0, B.MAX_PHOTOS - imgs.length - files.length);
    if (e.target.files.length > room) toast('Up to ' + B.MAX_PHOTOS + ' photos per product');
    files.push(...[...e.target.files].slice(0, room)); e.target.value = ''; draw();
  });
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'pick') $('#eF', s.el).click();
    if (a === 'rmI') { imgs.splice(+b.dataset.i, 1); draw(); }
    if (a === 'rmF') { files.splice(+b.dataset.i, 1); draw(); }
    if (a === 'del') {
      if (!confirm('Delete this product for good?')) return;
      await B.del('products', id); s.close(); toast('Deleted');
    }
    if (a === 'save') {
      const name = $('#eN', s.el).value.trim();
      const price = num($('#eP', s.el).value);
      if (!name || !price) return toast('Add a name and a price');
      b.disabled = true; b.textContent = 'Saving…';
      try {
        const urls = [...imgs];
        for (const f of files) urls.push(await B.uploadImage(f, 'products'));
        const published = $('#eV', s.el).checked;
        const data = {
          name, price, cost: num($('#eC', s.el).value), category: $('#eCa', s.el).value.trim(),
          colors: $('#eCo', s.el).value.split(',').map((x) => x.trim()).filter(Boolean),
          description: $('#eD', s.el).value.trim(), images: urls, published, soldOut: $('#eS', s.el).checked, updatedAt: Date.now(),
        };
        let pid = id;
        if (old) await B.set('products', id, data);
        else pid = await B.add('products', { ...data, createdAt: Date.now() });
        if ($('#eNo', s.el) && $('#eNo', s.el).checked && published && !data.soldOut) {
          await B.add('broadcasts', { title: (old ? 'Update: ' : 'New: ') + name, body: `${eur(price)}${data.description ? ' · ' + data.description.slice(0, 80) : ''}`, productId: pid, at: Date.now() });
          toast('Saved · customers notified 🔔');
        } else toast('Saved');
        s.close();
      } catch (err) { console.error(err); toast('Could not save: ' + (err.code || err.message)); b.disabled = false; b.textContent = 'Save changes'; }
    }
  });
}

/* ------------------------------------------------------------- requests */
async function deleteRequest(id) {
  const msgs = await B.getAll('messages', { where: [['requestId', '==', id]] });
  for (const m of msgs) await B.del('messages', m.id);
  await B.del('requests', id);
}

function viewRequests() {
  const rows = [...S.requests].sort((a, b) => (needsReply(b) - needsReply(a)) || (b.updatedAt || 0) - (a.updatedAt || 0));
  frame('REQUESTS', `<div class="gap"></div>${rows.length ? rows.map((r) => `<div class="row" style="align-items:stretch;gap:8px;margin-bottom:10px"><button class="card prod grow" style="padding:14px;margin:0" data-act="thread" data-id="${esc(r.id)}">
      <div class="row between"><b>${esc(r.title)}</b><span class="chip ${REQ_CHIP[r.status] || ''}">${esc(REQ_LBL[r.status] || r.status)}</span></div>
      <div class="mut sm">${esc(r.name)} · ${esc(ago(r.updatedAt))}${needsReply(r) ? ' · <span style="color:var(--acc2)">● needs reply</span>' : ''}</div></button>
      <button class="btn bad" style="width:48px" data-act="delreq" data-id="${esc(r.id)}" aria-label="Delete">🗑</button></div>`).join('')
    : '<div class="empty">No custom requests yet. When a customer asks for something, it shows up here.</div>'}`);
}

function openThread(id) {
  const getReq = () => S.requests.find((r) => r.id === id);
  if (!getReq()) return;
  let msgs = [];
  const s = sheet(`<div class="hd"><div class="ttl" id="tTitle"></div><button class="xbtn" data-close>✕</button></div>
    <div id="tInfo"></div><div class="chat" id="tChat"></div>
    <div class="composer"><button class="iconbtn" data-a="att" aria-label="Photo">📷</button><input type="file" id="tF" accept="image/*" class="hide">
      <textarea id="tM" rows="1" placeholder="Reply…"></textarea><button class="btn pri" data-a="send">Send</button></div>`,
    { full: true, onClose: () => { un(); S.threadRedraw = null; } });
  const drawInfo = () => {
    const r = getReq();
    if (!r) return;
    $('#tTitle', s.el).textContent = r.title;
    const q = r.quote;
    $('#tInfo', s.el).innerHTML = `<div class="card"><div class="row between"><b>${esc(r.name)}</b>
        <span class="row"><a class="btn sm" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">📞</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${waNumber(r.phone)}">💬</a></span></div>
      <div class="mono mut sm">${esc(r.phone)}</div>
      ${r.area ? `<div>📍 ${esc(r.area)}</div>` : ''}
      <div style="white-space:pre-wrap;margin-top:6px">${esc(r.desc)}</div>
      ${r.budget ? `<div class="mut sm" style="margin-top:4px">Budget: ${esc(r.budget)}</div>` : ''}
      ${(r.refImages || []).length ? `<div class="thumbs">${r.refImages.map((u) => `<div class="thumb"><img src="${esc(u)}" data-zoom alt=""></div>`).join('')}</div>` : ''}
      <div class="gap-s"></div>
      <div class="two"><select class="in" id="tSt">${Object.keys(REQ_LBL).map((k) => `<option value="${k}"${k === r.status ? ' selected' : ''}>${REQ_LBL[k]}</option>`).join('')}</select>
        <button class="btn" data-a="quote">${q ? `Quote ${eur(q.price)} · edit` : '💶 Send price'}</button></div>
      <div class="gap-s"></div><button class="btn bad sm block" data-a="delreq">🗑 Delete this request (spam)</button></div>`;
    $('#tSt', s.el).onchange = (e) => B.set('requests', id, { status: e.target.value, updatedAt: Date.now() });
  };
  const drawChat = () => {
    const box = $('#tChat', s.el);
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = [...msgs].sort((a, b) => a.at - b.at).map((m) => `<div class="bub${m.from === 'admin' ? ' me' : ''}">${m.image ? `<img src="${esc(m.image)}" data-zoom alt="">` : ''}${m.text ? esc(m.text) : ''}<div class="t">${m.from === 'admin' ? 'You' : esc(getReq()?.name || 'Customer')} · ${esc(ago(m.at))}</div></div>`).join('');
    if (atEnd) box.scrollTop = box.scrollHeight;
  };
  const un = B.watch('messages', (rows) => { msgs = rows; drawChat(); }, { where: [['requestId', '==', id]] });
  S.threadRedraw = () => { drawInfo(); drawChat(); };
  drawInfo();
  const post = async (text, image, extra = {}) => {
    const now = Date.now();
    await B.add('messages', { requestId: id, ownerUid: getReq().ownerUid, from: 'admin', text: text || '', image: image || '', at: now });
    const r = getReq();
    await B.set('requests', id, { updatedAt: now, lastFrom: 'admin', ...(r.status === 'new' ? { status: 'discussing' } : {}), ...extra });
  };
  const send = async () => {
    const ta = $('#tM', s.el);
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    try { await post(text); } catch (e) { console.error(e); toast('Could not send'); }
  };
  $('#tF', s.el).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { toast('Uploading preview…'); await post($('#tM', s.el).value.trim(), await B.uploadImage(f, 'previews')); $('#tM', s.el).value = ''; } catch (err) { console.error(err); toast('Upload failed'); }
  });
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'att') $('#tF', s.el).click();
    if (b.dataset.a === 'delreq') {
      if (!confirm('Delete this request and its whole chat for good?')) return;
      try { await deleteRequest(id); s.close(); toast('Deleted'); } catch (err) { console.error(err); toast('Failed: ' + (err.code || err.message)); }
    }
    if (b.dataset.a === 'send') send();
    if (b.dataset.a === 'quote') {
      const r = getReq();
      const q = sheet(`<div class="hd"><div class="ttl">Send price</div><button class="xbtn" data-close>✕</button></div>
        <p class="mut sm">The customer will see the price and an “Approve and order” button. They pay nothing until they approve.</p>
        <label class="f"><span>Price (${esc(CFG.currency || 'EUR')})</span><input class="in" id="qP" inputmode="decimal" value="${esc(r.quote ? r.quote.price : '')}"></label>
        <label class="f"><span>Note (optional)</span><input class="in" id="qN" placeholder="e.g. ready in 3 days" value="${esc(r.quote ? r.quote.note || '' : '')}"></label>
        <div class="gap"></div><button class="btn pri block" data-a="go">Send to customer</button>`);
      q.el.addEventListener('click', async (ev) => {
        if (!ev.target.closest('[data-a=go]')) return;
        const price = num($('#qP', q.el).value);
        if (!price) return toast('Enter a price');
        const note = $('#qN', q.el).value.trim();
        try { await post(`💶 Price: ${eur(price)}${note ? ' — ' + note : ''}`, '', { quote: { price, note, at: Date.now() }, status: 'quoted' }); q.close(); toast('Price sent'); }
        catch (err) { console.error(err); toast('Could not send'); }
      });
    }
  });
  $('#tM', s.el).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } });
}

/* --------------------------------------------------------------- orders */
function viewOrders() {
  const F = {
    active: (o) => ['new', 'making', 'ready'].includes(o.status),
    unpaid: (o) => o.payStatus !== 'paid' && o.status !== 'cancelled',
    done: (o) => o.status === 'delivered' || o.status === 'cancelled',
    all: () => true,
  };
  const rows = S.orders.filter(F[S.ofilter]).sort((a, b) => b.createdAt - a.createdAt);
  frame('ORDERS', `<div class="gap"></div><div class="chips">${Object.keys(F).map((k) => `<button class="pill${S.ofilter === k ? ' on' : ''}" data-act="ofilter" data-v="${k}">${k[0].toUpperCase() + k.slice(1)} (${S.orders.filter(F[k]).length})</button>`).join('')}</div><div class="gap"></div>
    ${rows.length ? rows.map((o) => `<button class="card prod" style="padding:14px" data-act="order" data-id="${esc(o.id)}">
      <div class="row between"><b class="mono">${esc(o.no)}</b><span class="chip ${ORDER_CHIP[o.status] || ''}">${esc(ORDER_LBL[o.status] || o.status)}</span></div>
      <div>${esc(o.customer?.name || '—')} · <span class="mono">${eur(o.total)}</span></div>
      <div class="mut sm">${o.items.map((i) => esc(i.name) + ' ×' + i.qty).join(', ')}</div>
      <div class="chips" style="margin-top:6px"><span class="chip ${o.payStatus === 'paid' ? 'ok' : 'warn'}">${o.payStatus === 'paid' ? 'paid' : o.payStatus === 'deposit' ? 'deposit paid · ' + eur(owed(o)) + ' left' : o.payMethod === 'deposit' ? 'waiting for deposit' : o.payMethod === 'online' ? 'waiting for payment' : 'pay at handoff'}</span><span class="chip">${esc(ago(o.createdAt))}</span></div></button>`).join('')
      : '<div class="empty">Nothing here.</div>'}`);
}

function openOrder(id) {
  const o = S.orders.find((x) => x.id === id);
  if (!o) return;
  const c = o.customer || {};
  const s = sheet(`
    <div class="hd"><div class="ttl mono">${esc(o.no)}</div><span class="chip ${ORDER_CHIP[o.status] || ''}">${esc(ORDER_LBL[o.status] || o.status)}</span><button class="xbtn" data-close>✕</button></div>
    <div class="card"><b>${esc(c.name || '—')}</b>
      <div class="row" style="margin:6px 0"><a class="btn sm grow" href="tel:${esc(String(c.phone || '').replace(/[^\d+]/g, ''))}">📞 ${esc(c.phone || '')}</a>
      <a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${waNumber(c.phone)}">💬</a></div>
      ${c.area ? `<div>📍 ${esc(c.area)}</div>` : ''}
      <div>${o.delivery === 'boxnow' ? '📦 Box Now locker: ' : o.delivery === 'deliver' ? '🚚 Deliver to: ' : '🤝 Meet-up: '}${esc(c.address || '—')}</div>
      ${c.note ? `<div class="mut" style="margin-top:4px">“${esc(c.note)}”</div>` : ''}
      <div class="mut sm" style="margin-top:6px">${esc(fmtDay(o.createdAt))}${o.source === 'manual' ? ' · manual sale' : ''}</div></div>
    <div class="h2">Items</div>
    <div class="card">${o.items.map((i) => `<div class="row between"><span>${esc(i.name)} × ${i.qty}</span><b class="mono">${eur(i.price * i.qty)}</b></div>`).join('')}
      ${o.fee ? `<div class="row between mut"><span>Delivery fee</span><span class="mono">${eur(o.fee)}</span></div>` : ''}
      <div class="sep"></div><div class="row between"><b>Total</b><b class="mono" style="font-size:20px">${eur(o.total)}</b></div></div>
    <div class="h2">Payment</div>
    <div class="card"><div class="row between"><span>${o.payMethod === 'deposit' ? 'Box Now: deposit + rest at locker' : o.payMethod === 'online' ? 'Online prepay' : 'Pay at handoff'}</span><span class="chip ${o.payStatus === 'paid' ? 'ok' : 'warn'}">${o.payStatus === 'paid' ? 'PAID' : o.payStatus === 'deposit' ? 'DEPOSIT PAID' : 'NOT PAID'}</span></div>
      ${o.payMethod === 'deposit' ? `<div class="row between" style="margin-top:6px"><span class="mut">Deposit (card, now)</span><b class="mono">${eur(o.deposit)}</b></div>
        <div class="row between"><span class="mut">Rest (Box Now COD)</span><b class="mono">${eur(o.balance)}</b></div>
        ${o.payStatus !== 'paid' ? `<p class="mut sm" style="margin:8px 0 0">Create the Box Now COD shipment for <b class="mono">${eur(o.balance)}</b>. Ship only after the deposit is in.</p>` : ''}` : ''}
      <div class="gap-s"></div>${o.payStatus === 'paid'
        ? `<div class="mut sm">Paid ${esc(fmtDay(o.paidAt || o.createdAt))}</div><div class="gap-s"></div><button class="btn sm ghost" data-a="unpay">Undo paid</button>`
        : o.payMethod === 'deposit' && o.payStatus === 'unpaid'
          ? `<button class="btn ok block" data-a="paydep">✅ Deposit received (${eur(o.deposit)})</button>`
          : o.payStatus === 'deposit'
            ? `<button class="btn ok block" data-a="pay">✅ Rest received from Box Now (${eur(o.balance)}) · fully paid</button><div class="gap-s"></div><button class="btn sm ghost" data-a="unpay">Undo deposit</button>`
            : '<button class="btn ok block" data-a="pay">✅ Mark as paid</button>'}
      <label class="f"><span>What it cost you to make (${esc(CFG.currency || 'EUR')})</span><div class="row"><input class="in grow" id="oC" inputmode="decimal" value="${esc(o.costTotal ?? 0)}"><button class="btn" data-a="cost">Save</button></div></label></div>
    <div class="h2">Status</div>
    <div class="chips">${['new', 'making', 'ready', 'delivered'].map((k) => `<button class="pill${o.status === k ? ' on' : ''}" data-a="st" data-v="${k}">${ORDER_LBL[k]}</button>`).join('')}</div>
    <div class="gap"></div><div class="row"><button class="btn bad grow" data-a="cancel">Cancel order</button><button class="btn ghost" data-a="rm">🗑</button></div>`);
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    try {
      if (a === 'paydep') await B.set('orders', id, { payStatus: 'deposit', paidAmount: o.deposit, depositAt: Date.now() });
      if (a === 'pay') await B.set('orders', id, { payStatus: 'paid', paidAt: Date.now(), paidAmount: o.total });
      if (a === 'unpay') await B.set('orders', id, { payStatus: 'unpaid', paidAt: null, paidAmount: null });
      if (a === 'cost') { await B.set('orders', id, { costTotal: num($('#oC', s.el).value) }); toast('Saved'); return; }
      if (a === 'st') {
        const v = b.dataset.v;
        const extra = {};
        if (v === 'delivered' && o.payStatus !== 'paid' && confirm(o.payStatus === 'deposit' ? 'Delivered. Did Box Now pay you the rest? Tap OK to mark as fully paid.' : 'Delivered. Did the customer pay you? Tap OK to mark as paid.')) Object.assign(extra, { payStatus: 'paid', paidAt: Date.now(), paidAmount: o.total });
        await B.set('orders', id, { status: v, ...extra });
      }
      if (a === 'cancel') { if (!confirm('Cancel this order?')) return; await B.set('orders', id, { status: 'cancelled' }); }
      if (a === 'rm') { if (!confirm('Delete this order record for good?')) return; await B.del('orders', id); }
      s.close();
    } catch (err) { console.error(err); toast('Failed: ' + (err.code || err.message)); }
  });
}

/* ---------------------------------------------------------------- money */
function moneyStats() {
  const paid = S.orders.filter(isPaid);
  const paidSum = paid.reduce((n, o) => n + (o.paidAmount ?? o.total), 0);
  const deposits = S.orders.filter(isDep).reduce((n, o) => n + (o.paidAmount || 0), 0);
  const costs = paid.reduce((n, o) => n + (o.costTotal || 0), 0);
  const waiting = S.orders.filter((o) => o.status !== 'cancelled').reduce((n, o) => n + owed(o), 0);
  return { paid, received: paidSum + deposits, costs, profit: paidSum - costs, waiting };
}

function viewMoney() {
  const m = moneyStats();
  const months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push({ key: monthKey(x), label: x.toLocaleDateString('en-GB', { month: 'short' }), rev: 0, profit: 0 });
  }
  m.paid.forEach((o) => {
    const mm = months.find((q) => q.key === monthKey(o.paidAt || o.createdAt));
    if (mm) { mm.rev += o.paidAmount ?? o.total; mm.profit += (o.paidAmount ?? o.total) - (o.costTotal || 0); }
  });
  const max = Math.max(1, ...months.map((q) => q.rev));
  const byProd = {};
  m.paid.forEach((o) => o.items.forEach((i) => { const k = i.name; byProd[k] = byProd[k] || { n: 0, rev: 0 }; byProd[k].n += i.qty; byProd[k].rev += i.price * i.qty; }));
  const top = Object.entries(byProd).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
  const cur = months[months.length - 1];
  frame('MONEY', `<div class="gap"></div>
    <div class="stats">
      <div class="stat"><div class="l">Received</div><div class="v">${eur(m.received)}</div></div>
      <div class="stat"><div class="l">Profit</div><div class="v" style="color:var(--ok)">${eur(m.profit)}</div></div>
      <div class="stat"><div class="l">Costs</div><div class="v">${eur(m.costs)}</div></div>
      <div class="stat"><div class="l">Still to collect</div><div class="v" style="color:var(--warn)">${eur(m.waiting)}</div></div>
    </div>
    <div class="h2">Last 6 months · sales</div>
    <div class="card"><div class="bars">${months.map((q) => `<div class="b"><small>${q.rev ? Math.round(q.rev) : ''}</small><i style="height:${Math.max(2, (q.rev / max) * 90)}%"></i><small>${esc(q.label)}</small></div>`).join('')}</div>
      <div class="mut sm" style="margin-top:8px">This month: ${eur(cur.rev)} sales · ${eur(cur.profit)} profit</div></div>
    <div class="h2">Best sellers</div>
    ${top.length ? `<div class="card">${top.map(([k, v]) => `<div class="row between"><span>${esc(k)} <span class="mut sm">×${v.n}</span></span><b class="mono">${eur(v.rev)}</b></div>`).join('<div class="sep" style="margin:8px 0"></div>')}</div>` : '<div class="empty">No paid orders yet.</div>'}
    <div class="gap"></div><button class="btn pri block" data-act="manual">＋ Add a sale I made myself</button>
    <div class="gap-s"></div><button class="btn block" data-act="csv">⬇ Download sales (CSV for your accountant)</button>
    <p class="mut sm">Profit counts only orders marked as paid. Set “cost to make” on each product and it is filled in automatically.</p>`);
}

function openManualSale() {
  const s = sheet(`<div class="hd"><div class="ttl">Add a sale</div><button class="xbtn" data-close>✕</button></div>
    <label class="f"><span>What did you sell?</span><input class="in" id="mI"></label>
    <div class="two"><label class="f"><span>Price</span><input class="in" id="mP" inputmode="decimal"></label><label class="f"><span>Cost to make</span><input class="in" id="mC" inputmode="decimal"></label></div>
    <label class="f"><span>Customer (optional)</span><input class="in" id="mN"></label>
    <label class="check"><input type="checkbox" id="mPd" checked><span>Already paid</span></label>
    <div class="gap"></div><button class="btn pri block" data-a="go">Add sale</button>`);
  s.el.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-a=go]')) return;
    const name = $('#mI', s.el).value.trim();
    const price = num($('#mP', s.el).value);
    if (!name || !price) return toast('Add what you sold and the price');
    const paid = $('#mPd', s.el).checked;
    const now = Date.now();
    await B.add('orders', { uid: B.uid(), no: 'GB-M' + Math.random().toString(36).slice(2, 5).toUpperCase(), items: [{ id: null, name, price, cost: num($('#mC', s.el).value), qty: 1, color: '', image: '' }], total: price, costTotal: num($('#mC', s.el).value), customer: { name: $('#mN', s.el).value.trim(), phone: '', address: '', note: '' }, delivery: 'meetup', payMethod: 'handoff', payStatus: paid ? 'paid' : 'unpaid', paidAt: paid ? now : null, paidAmount: paid ? price : null, status: 'delivered', requestId: null, source: 'manual', createdAt: now });
    s.close(); toast('Sale added');
  });
}

function downloadCsv() {
  const q = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const rows = [['Date', 'Order', 'Customer', 'Items', 'Total', 'Cost', 'Paid', 'Status', 'Payment method']];
  [...S.orders].sort((a, b) => a.createdAt - b.createdAt).forEach((o) => rows.push([new Date(o.createdAt).toISOString().slice(0, 10), o.no, o.customer?.name || '', o.items.map((i) => `${i.name} x${i.qty}`).join('; '), o.total, o.costTotal || 0, o.payStatus, o.status, o.payMethod]));
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gewy-builds-sales.csv';
  a.click();
}

/* ------------------------------------------------------------- audience */
const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function viewAudience() {
  const D = S.devices;
  const now = Date.now(), DAY = 86400000;
  const total = D.length;
  const installed = D.filter((d) => d.installed).length;
  const newWeek = D.filter((d) => now - d.firstSeen < 7 * DAY).length;
  const active = D.filter((d) => now - d.lastSeen < 7 * DAY).length;
  const back = D.filter((d) => (d.visits || 0) > 1).length;
  const pct = (n) => (total ? Math.round((n / total) * 100) + '%' : '0%');
  const plat = { android: 0, ios: 0, desktop: 0 };
  D.forEach((d) => { plat[d.platform] = (plat[d.platform] || 0) + 1; });
  const days = [];
  for (let i = 13; i >= 0; i--) { const t0 = new Date(now - i * DAY); days.push({ key: dayKey(t0), label: String(t0.getDate()), n: 0, inst: 0 }); }
  D.forEach((d) => {
    const x = days.find((q) => q.key === dayKey(d.firstSeen)); if (x) x.n++;
    if (d.installedAt) { const y = days.find((q) => q.key === dayKey(d.installedAt)); if (y) y.inst++; }
  });
  const max = Math.max(1, ...days.map((q) => q.n));
  frame('AUDIENCE', `<div class="gap"></div>
    <div class="stats">
      <div class="stat"><div class="l">People</div><div class="v">${total}</div></div>
      <div class="stat"><div class="l">Installed</div><div class="v" style="color:var(--ok)">${installed}</div><div class="mut sm">${pct(installed)} of people</div></div>
      <div class="stat"><div class="l">New this week</div><div class="v">${newWeek}</div></div>
      <div class="stat"><div class="l">Active this week</div><div class="v">${active}</div></div>
    </div>
    <div class="h2">New people per day · last 14 days</div>
    <div class="card"><div class="bars">${days.map((q) => `<div class="b"><small>${q.n || ''}</small><i style="height:${Math.max(2, (q.n / max) * 90)}%"></i><small>${esc(q.label)}</small></div>`).join('')}</div>
      <div class="mut sm" style="margin-top:8px">Installs in the last 14 days: ${days.reduce((n, q) => n + q.inst, 0)}</div></div>
    <div class="h2">Phones</div>
    <div class="card"><div class="row between"><span>Android</span><b class="mono">${plat.android || 0}</b></div><div class="sep" style="margin:8px 0"></div>
      <div class="row between"><span>iPhone</span><b class="mono">${plat.ios || 0}</b></div><div class="sep" style="margin:8px 0"></div>
      <div class="row between"><span>Computer</span><b class="mono">${plat.desktop || 0}</b></div></div>
    <div class="h2">Loyalty</div>
    <div class="card"><div class="row between"><span>Came back at least once</span><b class="mono">${back} · ${pct(back)}</b></div></div>
    <p class="mut sm">A "person" is one phone or browser, so someone with two devices counts twice. "Installed" means they added it with the install button or opened it from the home screen icon, so iPhones are counted too. Your own test phones are included: use the button below to reset the counts before you launch.</p>
    <div class="gap-s"></div><button class="btn bad block" data-act="resetAudience">Reset all counts</button>`);
}

/* --------------------------------------------------------------- notify */
function viewNotify() {
  const subs = S.subs.filter((x) => x.role === 'shop').length;
  frame('NOTIFY', `<div class="gap"></div>
    <div class="card"><div class="h2" style="margin-top:0">Reach</div>${B.mode === 'demo'
      ? '<div>Demo mode: alerts show up in the shop app on this device.</div>'
      : `<div><b class="mono" style="font-size:24px">${subs}</b> phones will get your alert</div>`}</div>
    <div class="h2">Send an alert to all customers</div>
    <label class="f"><span>Title</span><input class="in" id="nT" placeholder="🔥 New print just dropped"></label>
    <label class="f"><span>Message</span><textarea class="in" id="nB" placeholder="Limited stock — grab yours"></textarea></label>
    <label class="f"><span>About a product (optional)</span><select class="in" id="nP"><option value="">—</option>${S.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
    <div class="gap"></div><button class="btn pri block" data-act="sendNotify">Send alert</button>
    <p class="mut sm">Tip: new products notify automatically when you publish them. Use this for sales, restocks or news. Do not overdo it, one or two alerts a week keeps people happy.</p>`);
}

/* ------------------------------------------------------------- settings */
function viewSettings() {
  const st = S.settings;
  frame('SETTINGS', `<div class="gap"></div>
    <div class="h2" style="margin-top:0">Shop info</div>
    <label class="f"><span>Shop name</span><input class="in" id="sN" value="${esc(st.shopName || '')}" placeholder="${esc(CFG.shopName || 'GEWY BUILDS')}"></label>
    <label class="f"><span>Short intro (shown on the shop home)</span><textarea class="in" id="sA">${esc(st.about || '')}</textarea></label>
    <label class="f"><span>Your phone / WhatsApp (with country code, e.g. 3069…)</span><input class="in" id="sPh" inputmode="tel" value="${esc(st.phone || '')}"></label>
    <div class="h2">How customers can pay</div>
    <label class="check"><input type="checkbox" id="sH" ${st.payHandoff !== false ? 'checked' : ''}><span><b>Pay at handoff</b><br><span class="mut sm">No payment in the app. They pay you when they receive it.</span></span></label>
    <label class="f"><span>Handoff note (optional)</span><input class="in" id="sHN" value="${esc(st.handoffNote || '')}" placeholder="Cash or Revolut at the door"></label>
    <label class="check"><input type="checkbox" id="sO" ${st.payOnline !== false ? 'checked' : ''}><span><b>Pay online now</b><br><span class="mut sm">Customer is sent to a hosted payment page (PayPal, Revolut, Stripe, Viva…). Needs a payment link below.</span></span></label>
    <label class="f"><span>Payment link</span><input class="in" id="sL" inputmode="url" value="${esc(st.payLink || '')}" placeholder="https://www.paypal.me/yourname/{amount}EUR"></label>
    <div class="chips" style="margin-top:8px"><button class="pill" data-act="presetPaypal">PayPal.me</button><button class="pill" data-act="presetRevolut">Revolut</button><button class="pill" data-act="presetOther">Stripe / Viva / other</button></div>
    <label class="f"><span>Label shown to customers</span><input class="in" id="sLb" value="${esc(st.payLabel || '')}" placeholder="Card / PayPal / Revolut"></label>
    <p class="mut sm">In the link, <span class="mono">{amount}</span> becomes the order total (e.g. 12.50), <span class="mono">{order}</span> the order number. PayPal.me links with {amount} open with the amount filled in. A plain Revolut or Stripe link works too: the app shows the customer the exact amount and order number to use. These pages do not tell the app when someone paid, so you mark orders as paid yourself.</p>
    <div class="h2">Where you deliver</div>
    <label class="f"><span>Areas for hand-off / my own delivery (one per line)</span><textarea class="in" id="sHA" rows="3">${esc(parseAreas(st.handoffAreas, HANDOFF_DEF).join('\n'))}</textarea></label>
    <label class="f"><span>Areas for Box Now / ACS courier (one per line, Greece only)</span><textarea class="in" id="sCA" rows="8">${esc(parseAreas(st.courierAreas, COURIER_DEF).join('\n'))}</textarea></label>
    <p class="mut sm">Customers must pick one of these before they can order or send a request. Places not on the list (other countries, far areas) simply cannot be chosen.</p>
    <div class="h2">Box Now delivery</div>
    <label class="check"><input type="checkbox" id="sB" ${st.boxnow ? 'checked' : ''}><span><b>Offer Box Now locker delivery</b><br><span class="mut sm">Customer pays a deposit online now (needs the payment link above). The rest is collected by Box Now COD when the parcel is in the locker.</span></span></label>
    <label class="f"><span>Deposit is</span><select class="in" id="sDM"><option value="cost"${st.depositMode !== 'percent' ? ' selected' : ''}>What it cost you to make (from each product's cost)</option><option value="percent"${st.depositMode === 'percent' ? ' selected' : ''}>A percentage of the price</option></select></label>
    <label class="f"><span>Percentage (used for "percentage", and for products with no cost set)</span><input class="in" id="sDP" inputmode="numeric" value="${esc(st.depositPct || 30)}"></label>
    <label class="f"><span>Delivery fee added to the order (${esc(CFG.currency || 'EUR')}, 0 = none)</span><input class="in" id="sBF" inputmode="decimal" value="${esc(st.boxFee || 0)}"></label>
    <div class="gap"></div><button class="btn pri block" data-act="saveSettings">Save settings</button>
    <div class="h2">This phone</div>
    ${B.pushAvailable ? `<button class="btn block" data-act="pushAdmin">${B.pushEnabled('admin') ? '🔔 Alerts are on' : '🔔 Turn on alerts for new orders & messages'}</button><div class="gap-s"></div>` : ''}<button class="btn block" data-act="copyShop">🔗 Copy customer shop link</button>
    <div class="gap-s"></div><button class="btn bad block" data-act="logout">Sign out</button>
    ${B.mode === 'demo' ? `<div class="gap-s"></div><button class="btn ghost block sm" data-act="wipe">Reset demo data</button>` : ''}`);
}

/* --------------------------------------------------------------- events */
document.addEventListener('click', async (e) => {
  const z = e.target.closest('img[data-zoom]');
  if (z) { sheet(`<img src="${esc(z.src)}" alt="" style="width:100%;border-radius:14px"><div class="gap-s"></div><button class="btn block" data-close>✕</button>`); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  try {
    if (a === 'login') {
      b.disabled = true;
      try { await B.adminLogin($('#lE').value.trim(), $('#lP').value); }
      catch (err) { toast('Sign-in failed. Check email and password.'); b.disabled = false; }
    }
    if (a === 'home') { S.view = 'home'; render(); }
    if (a === 'go') { S.view = b.dataset.v; render(); scrollTo(0, 0); }
    if (a === 'editProd') openProductEditor(b.dataset.id);
    if (a === 'seed') await seedDemo();
    if (a === 'thread') openThread(b.dataset.id);
    if (a === 'delreq') {
      if (!confirm('Delete this request and its whole chat for good?')) return;
      await deleteRequest(b.dataset.id); toast('Deleted');
    }
    if (a === 'order') openOrder(b.dataset.id);
    if (a === 'ofilter') { S.ofilter = b.dataset.v; render(); }
    if (a === 'manual') openManualSale();
    if (a === 'csv') downloadCsv();
    if (a === 'logout') await B.adminLogout();
    if (a === 'wipe') { if (confirm('Delete ALL demo data in this browser?')) { Object.keys(localStorage).filter((k) => k.startsWith('gewy:')).forEach((k) => localStorage.removeItem(k)); location.reload(); } }
    if (a === 'resetAudience') {
      if (!confirm('Reset all audience counts to zero? Orders and products are not affected.')) return;
      for (const d of [...S.devices]) await B.del('devices', d.id);
      toast('Counts reset');
    }
    if (a === 'openShop') window.open(new URL('./', location.href).href, '_blank');
    if (a === 'copyShop') { await copy(new URL('./', location.href).href); toast('Shop link copied'); }
    if (a === 'pushAdmin') {
      const r = await B.enablePush('admin');
      toast(r.ok ? '🔔 Alerts on' : r.reason === 'denied' ? 'Alerts are blocked in your phone settings' : r.reason === 'no-vapid' ? 'Add your vapidKey to config.js first' : 'Alerts are not available here. On iPhone: Share > Add to Home Screen, then open from there.', 5000);
      render();
    }
    if (a === 'presetPaypal') {
      const u = prompt('Your PayPal.me name (the part after paypal.me/)');
      if (u) { $('#sL').value = `https://www.paypal.me/${u.trim().replace(/^.*paypal\.me\//i, '')}/{amount}${CFG.currency || 'EUR'}`; if (!$('#sLb').value) $('#sLb').value = 'PayPal'; }
    }
    if (a === 'presetRevolut') {
      const u = prompt('Your revolut.me name (the part after revolut.me/)');
      if (u) { $('#sL').value = `https://revolut.me/${u.trim().replace(/^.*revolut\.me\//i, '')}`; if (!$('#sLb').value) $('#sLb').value = 'Revolut'; }
    }
    if (a === 'presetOther') {
      const u = prompt('Paste your payment link (Stripe Payment Link, Viva, etc.). You can use {amount} and {order} in it.');
      if (u) $('#sL').value = u.trim();
    }
    if (a === 'saveSettings') {
      const link = $('#sL').value.trim();
      if (link && !/^https:\/\//i.test(link)) return toast('The payment link must start with https://');
      await B.set('settings', 'shop', {
        shopName: $('#sN').value.trim(), about: $('#sA').value.trim(), phone: $('#sPh').value.trim(),
        payHandoff: $('#sH').checked, handoffNote: $('#sHN').value.trim(), payOnline: $('#sO').checked,
        payLink: link, payLabel: $('#sLb').value.trim(),
        handoffAreas: $('#sHA').value.split('\n').map((x) => x.trim()).filter(Boolean).join('\n'), courierAreas: $('#sCA').value.split('\n').map((x) => x.trim()).filter(Boolean).join('\n'),
        boxnow: $('#sB').checked, depositMode: $('#sDM').value, depositPct: Math.min(100, Math.max(5, num($('#sDP').value) || 30)), boxFee: Math.max(0, num($('#sBF').value) || 0),
        updatedAt: Date.now(),
      });
      toast('Settings saved ✓');
    }
    if (a === 'sendNotify') {
      const title = $('#nT').value.trim();
      if (!title) return toast('Add a title');
      const pid = $('#nP').value;
      b.disabled = true;
      await B.add('broadcasts', { title, body: $('#nB').value.trim(), productId: pid || '', at: Date.now() });
      toast('Alert sent 🔔'); $('#nT').value = ''; $('#nB').value = ''; b.disabled = false;
    }
  } catch (err) { console.error(err); toast('Error: ' + (err.code || err.message)); }
});
globalThis.addEventListener('gewy:push', (e) => toast('🔔 ' + [e.detail.title, e.detail.body].filter(Boolean).join(' — '), 6000));
// Re-draw the current screen after a sheet closes, so it shows anything that changed meanwhile.
document.addEventListener('gewy:sheetclosed', () => { if (S.user && !document.querySelector('.sheet-back') && S.view !== 'settings' && S.view !== 'notify') render(); });

/* ----------------------------------------------------------------- data */
function startData() {
  stopData();
  const known = { orders: null, requests: null };
  S.stops.push(B.watch('products', (r) => { S.products = r; refresh(['home', 'products']); }));
  S.stops.push(B.watch('devices', (r) => { S.devices = r; refresh(['home', 'audience']); }));
  S.stops.push(B.watchDoc('settings', 'shop', (d) => { S.settings = d || {}; refresh(['home']); }));
  S.stops.push(B.watch('orders', (r) => {
    if (known.orders) r.filter((o) => !known.orders.has(o.id) && o.source !== 'manual').forEach((o) => toast(`📦 New order ${o.no} · ${eur(o.total)}`, 6000));
    known.orders = new Set(r.map((o) => o.id));
    S.orders = r; refresh(['home', 'orders', 'money']);
  }));
  S.stops.push(B.watch('requests', (r) => {
    if (known.requests) {
      r.forEach((q) => {
        const prev = known.requests.get(q.id);
        if (!prev) toast(`✏️ New custom request: ${q.title}`, 6000);
        else if (q.lastFrom === 'customer' && (q.updatedAt || 0) > prev) toast(`💬 ${q.name}: new message`, 5000);
      });
    }
    known.requests = new Map(r.map((q) => [q.id, q.updatedAt || 0]));
    S.requests = r; refresh(['home', 'requests']);
    S.threadRedraw && S.threadRedraw();
  }));
  if (B.mode === 'live' && B.pushAvailable) S.stops.push(B.watch('subscribers', (r) => { S.subs = r; refresh(['home', 'notify']); }));
}
function stopData() { S.stops.forEach((f) => f && f()); S.stops = []; }
function refresh(views) {
  if (S.user && views.includes(S.view) && !document.querySelector('.sheet-back')) render();
}

(async function boot() {
  render();
  try { await B.init({ role: 'admin' }); } catch (err) { console.error(err); $('#app').innerHTML = '<div class="wrap"><div class="empty">Could not start. Check config.js</div></div>'; return; }
  B.onAdmin((u) => { S.user = u; if (u) startData(); else stopData(); render(); });
  if (B.pushAvailable) B.enablePush('admin', { silent: true });
})();
