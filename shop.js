import * as B from './shared/backend.js';
import { HANDOFF_DEF, COURIER_DEF, parseAreas } from './shared/areas.js';
import { $, $$, esc, eur, toast, sheet, ago, copy, fillPayLink, waNumber } from './shared/ui.js';

const CFG = globalThis.GEWY_CONFIG || {};

/* ------------------------------------------------------------ translations */
const DICT = {
  en: {
    shop: 'Shop', custom: 'Custom', orders: 'My orders', new: 'NEW', soldOut: 'Sold out',
    heroTitle: 'Printed here. Handed to you.',
    heroSub: '3D printed products made locally — or ask for something made just for you.',
    noProducts: 'Nothing here yet. Check back soon, new prints are on the way.',
    notifyBtn: 'Tell me when new products drop', notifyOn: 'Notifications are on',
    notifyDenied: 'Notifications are blocked. Allow them in your browser/phone settings.',
    notifyIos: 'On iPhone: tap Share, then "Add to Home Screen". Open the app from your home screen and turn notifications on.',
    notifyThanks: 'Done! You will get a notification for new products.',
    add: 'Add to cart', buyNow: 'Buy now', color: 'Color', added: 'Added to cart',
    cart: 'Your cart', cartEmpty: 'Your cart is empty.', total: 'Total', checkout: 'Checkout', remove: 'Remove',
    yourName: 'Your name', phone: 'Phone', phoneHint: 'So I can reach you about delivery',
    how: 'How do you want to get it?', deliver: 'Deliver to me', deliverDesc: 'I bring it to you.',
    meetup: 'Meet up / pick up', meetupDesc: 'We agree on a spot.',
    address: 'Address or area', meetWhere: 'Where / when could we meet?', note: 'Notes (optional)',
    payHow: 'How do you want to pay?',
    payHandoff: 'Pay at handoff', payHandoffDesc: 'Nothing to pay now. Pay when you get it: cash, or card/Revolut at the door.',
    payOnline: 'Pay online now', payOnlineDesc: 'Secure payment page ({label}). Your order is confirmed once I see the payment.',
    placeOrder: 'Place order', fillRequired: 'Please add your name and phone.', needAddress: 'Please add an address or area.',
    orderPlaced: 'Order placed!', orderNo: 'Order number', payNow: 'Pay now', payAmount: 'Amount to pay',
    payNote: 'Write the order number in the payment note, so I can match it.',
    handoffThanks: 'I will message you to arrange the handoff. You pay when you receive it.',
    savedInOrders: 'Your order is saved in "My orders" — you can pay from there any time.',
    done: 'Done', contact: 'Contact', call: 'Call', whatsapp: 'WhatsApp',
    noOrders: 'No orders yet.',
    st_new: 'Received', st_making: 'Printing', st_ready: 'Ready', st_delivered: 'Delivered', st_cancelled: 'Cancelled',
    paid: 'Paid', unpaid: 'Not paid yet', atHandoff: 'Pay at handoff', depPaid: 'Deposit paid',
    area: 'Your area', chooseArea: 'Choose your area…', areaNeeded: 'Please choose your area first',
    areaHint: 'Delivery by me: Salamina and Athens only.', areaHintBox: 'Box Now / ACS: Greece only, from the areas in the list.',
    reqLimit: 'You can send up to {n} custom requests per day. Please try again tomorrow.',
    boxnow: 'Box Now / ACS courier', boxnowDesc: 'Courier or Box Now locker, anywhere in the listed areas of Greece.', boxWhere: 'Which Box Now locker? (name or area)',
    deposit: 'Pay now (deposit)', balance: 'Pay at the locker', fee: 'Delivery fee',
    boxExplain: 'You pay a small deposit now. The rest you pay online when your parcel arrives in the locker (Box Now sends you the link).',
    depNote: 'Pay the deposit now. The rest is paid when the parcel arrives in the Box Now locker.',
    balLeft: 'Left to pay at the locker',
    customTitle: 'Want something made just for you?',
    customSub: 'Describe it and add a photo if you have one. I will send you a preview of how it would look and a price. Like it? Approve and order. You pay nothing until you approve.',
    newReq: 'New custom request', noReqs: 'No custom requests yet.',
    reqTitle: 'What do you want made?', reqTitleP: 'e.g. Name sign for my room',
    reqDesc: 'Describe it', reqDescP: 'Size, colors, text, what it is for...',
    reqBudget: 'Budget (optional)', reqPhoto: 'Reference photos', sendReq: 'Send request', sent: 'Request sent!',
    rq_new: 'Sent', rq_discussing: 'In talks', rq_quoted: 'Preview and price ready', rq_approved: 'Approved',
    rq_printing: 'Printing', rq_done: 'Done', rq_closed: 'Closed',
    msgP: 'Write a message...', send: 'Send', quoteReady: 'Price for your item', approve: 'Approve and order',
    quoteHint: 'Not what you imagined? Just reply below and I will change it.',
    you: 'You', maker: 'Gewy Builds', details: 'Details', trust: 'Handmade on the island · hand delivery · pay when you receive it',
    install: 'Install the app', installTitle: 'Install on iPhone', installDone: 'Installed!',
    installSteps: '1. Tap the Share button at the bottom of Safari (the square with an arrow).\n2. Scroll down and tap "Add to Home Screen".\n3. Tap "Add". The Gewy Builds icon appears on your home screen.',
    err: 'Something went wrong. Please try again.', sending: 'Sending...',
  },
  el: {
    shop: 'Κατάστημα', custom: 'Custom', orders: 'Παραγγελίες', new: 'ΝΕΟ', soldOut: 'Εξαντλήθηκε',
    heroTitle: 'Τυπωμένο εδώ. Παραδίδεται σε σένα.',
    heroSub: 'Προϊόντα 3D εκτύπωσης φτιαγμένα τοπικά — ή ζήτα κάτι φτιαγμένο ειδικά για σένα.',
    noProducts: 'Δεν υπάρχει τίποτα ακόμα. Ξαναπέρασε σύντομα, έρχονται νέα προϊόντα.',
    notifyBtn: 'Ειδοποίησέ με για νέα προϊόντα', notifyOn: 'Οι ειδοποιήσεις είναι ενεργές',
    notifyDenied: 'Οι ειδοποιήσεις είναι μπλοκαρισμένες. Επίτρεψέ τες από τις ρυθμίσεις του κινητού/προγράμματος περιήγησης.',
    notifyIos: 'Σε iPhone: πάτα Κοινοποίηση και μετά "Προσθήκη στην οθόνη Αφετηρίας". Άνοιξε την εφαρμογή από εκεί και ενεργοποίησε τις ειδοποιήσεις.',
    notifyThanks: 'Έτοιμο! Θα λαμβάνεις ειδοποίηση για κάθε νέο προϊόν.',
    add: 'Προσθήκη στο καλάθι', buyNow: 'Αγορά τώρα', color: 'Χρώμα', added: 'Προστέθηκε στο καλάθι',
    cart: 'Το καλάθι σου', cartEmpty: 'Το καλάθι είναι άδειο.', total: 'Σύνολο', checkout: 'Ολοκλήρωση', remove: 'Αφαίρεση',
    yourName: 'Όνομα', phone: 'Τηλέφωνο', phoneHint: 'Για να επικοινωνήσω μαζί σου για την παράδοση',
    how: 'Πώς θες να το παραλάβεις;', deliver: 'Παράδοση σε μένα', deliverDesc: 'Θα στο φέρω εγώ.',
    meetup: 'Συνάντηση / παραλαβή', meetupDesc: 'Συμφωνούμε ένα σημείο.',
    address: 'Διεύθυνση ή περιοχή', meetWhere: 'Πού / πότε μπορούμε να βρεθούμε;', note: 'Σημειώσεις (προαιρετικό)',
    payHow: 'Πώς θες να πληρώσεις;',
    payHandoff: 'Πληρωμή κατά την παράδοση', payHandoffDesc: 'Δεν πληρώνεις τώρα. Πληρώνεις όταν το παραλάβεις: μετρητά ή κάρτα/Revolut.',
    payOnline: 'Πληρωμή online τώρα', payOnlineDesc: 'Ασφαλής σελίδα πληρωμής ({label}). Η παραγγελία επιβεβαιώνεται μόλις δω την πληρωμή.',
    placeOrder: 'Ολοκλήρωση παραγγελίας', fillRequired: 'Συμπλήρωσε όνομα και τηλέφωνο.', needAddress: 'Συμπλήρωσε διεύθυνση ή περιοχή.',
    orderPlaced: 'Η παραγγελία καταχωρήθηκε!', orderNo: 'Αριθμός παραγγελίας', payNow: 'Πληρωμή τώρα', payAmount: 'Ποσό πληρωμής',
    payNote: 'Γράψε τον αριθμό παραγγελίας στο σχόλιο της πληρωμής για να την αντιστοιχίσω.',
    handoffThanks: 'Θα σου στείλω μήνυμα να κανονίσουμε την παράδοση. Πληρώνεις όταν το παραλάβεις.',
    savedInOrders: 'Η παραγγελία σου είναι στις "Παραγγελίες" — μπορείς να πληρώσεις από εκεί όποτε θες.',
    done: 'Τέλος', contact: 'Επικοινωνία', call: 'Κλήση', whatsapp: 'WhatsApp',
    noOrders: 'Δεν υπάρχουν παραγγελίες ακόμα.',
    st_new: 'Παρελήφθη', st_making: 'Σε εκτύπωση', st_ready: 'Έτοιμο', st_delivered: 'Παραδόθηκε', st_cancelled: 'Ακυρώθηκε',
    paid: 'Πληρώθηκε', unpaid: 'Απλήρωτο', atHandoff: 'Πληρωμή στην παράδοση', depPaid: 'Η προκαταβολή πληρώθηκε',
    area: 'Η περιοχή σου', chooseArea: 'Διάλεξε περιοχή…', areaNeeded: 'Διάλεξε πρώτα την περιοχή σου',
    areaHint: 'Παράδοση από εμένα: μόνο Σαλαμίνα και Αθήνα.', areaHintBox: 'Box Now / ACS: μόνο Ελλάδα, από τις περιοχές της λίστας.',
    reqLimit: 'Μπορείς να στείλεις έως {n} αιτήματα custom την ημέρα. Δοκίμασε ξανά αύριο.',
    boxnow: 'Box Now / ACS courier', boxnowDesc: 'Κούριερ ή Box Now locker, στις περιοχές της λίστας στην Ελλάδα.', boxWhere: 'Ποιο Box Now locker; (όνομα ή περιοχή)',
    deposit: 'Πληρώνεις τώρα (προκαταβολή)', balance: 'Πληρώνεις στο locker', fee: 'Έξοδα αποστολής',
    boxExplain: 'Πληρώνεις τώρα μια μικρή προκαταβολή. Το υπόλοιπο το πληρώνεις online όταν το δέμα φτάσει στο locker (το Box Now σου στέλνει τον σύνδεσμο).',
    depNote: 'Πλήρωσε την προκαταβολή τώρα. Το υπόλοιπο πληρώνεται όταν το δέμα φτάσει στο Box Now locker.',
    balLeft: 'Υπόλοιπο στο locker',
    customTitle: 'Θες κάτι φτιαγμένο ειδικά για σένα;',
    customSub: 'Περίγραψέ το και πρόσθεσε φωτογραφία αν έχεις. Θα σου στείλω προεπισκόπηση και τιμή. Σου αρέσει; Το εγκρίνεις και παραγγέλνεις. Δεν πληρώνεις τίποτα μέχρι να εγκρίνεις.',
    newReq: 'Νέο αίτημα custom', noReqs: 'Δεν υπάρχουν αιτήματα ακόμα.',
    reqTitle: 'Τι θες να φτιαχτεί;', reqTitleP: 'π.χ. Επιγραφή με το όνομά μου',
    reqDesc: 'Περιγραφή', reqDescP: 'Μέγεθος, χρώματα, κείμενο, για τι το θες...',
    reqBudget: 'Budget (προαιρετικό)', reqPhoto: 'Φωτογραφίες αναφοράς', sendReq: 'Αποστολή αιτήματος', sent: 'Το αίτημα στάλθηκε!',
    rq_new: 'Στάλθηκε', rq_discussing: 'Συζήτηση', rq_quoted: 'Έτοιμη προεπισκόπηση και τιμή', rq_approved: 'Εγκρίθηκε',
    rq_printing: 'Σε εκτύπωση', rq_done: 'Ολοκληρώθηκε', rq_closed: 'Έκλεισε',
    msgP: 'Γράψε μήνυμα...', send: 'Αποστολή', quoteReady: 'Τιμή για το αντικείμενο', approve: 'Έγκριση και παραγγελία',
    quoteHint: 'Δεν είναι αυτό που φαντάστηκες; Απάντησε παρακάτω και θα το αλλάξω.',
    you: 'Εσύ', maker: 'Gewy Builds', details: 'Λεπτομέρειες', trust: 'Φτιαγμένο στο νησί · παράδοση με το χέρι · πληρώνεις όταν το παραλάβεις',
    install: 'Εγκατάσταση εφαρμογής', installTitle: 'Εγκατάσταση σε iPhone', installDone: 'Εγκαταστάθηκε!',
    installSteps: '1. Πάτα το κουμπί Κοινοποίηση κάτω στο Safari (το τετράγωνο με το βέλος).\n2. Κάνε κύλιση και πάτα "Προσθήκη στην οθόνη Αφετηρίας".\n3. Πάτα "Προσθήκη". Το εικονίδιο Gewy Builds εμφανίζεται στην αρχική οθόνη σου.',
    err: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.', sending: 'Αποστολή...',
  },
};
let lang = localStorage.getItem('gewy:lang') || ((navigator.language || '').toLowerCase().startsWith('el') ? 'el' : 'en');
const t = (k, vars) => {
  let s = (DICT[lang] && DICT[lang][k]) ?? DICT.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

/* ------------------------------------------------------------------- state */
const S = {
  tab: 'shop', products: [], settings: {}, orders: [], requests: [], threadRedraw: null, installEvt: null, entered: false,
  cart: JSON.parse(localStorage.getItem('gewy:cart') || '[]'),
  loaded: { products: false },
};
const saveCart = () => localStorage.setItem('gewy:cart', JSON.stringify(S.cart));
const profile = () => JSON.parse(localStorage.getItem('gewy:profile') || '{}');
const seenKey = (id) => 'gewy:seen:' + id;
const isUnread = (r) => r.lastFrom === 'admin' && (r.updatedAt || 0) > +(localStorage.getItem(seenKey(r.id)) || 0);
const digits = (s) => String(s || '').replace(/\D/g, '');
const cartCount = () => S.cart.reduce((n, i) => n + i.qty, 0);
const cartTotal = () => S.cart.reduce((n, i) => n + i.qty * i.price, 0);
const newCode = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  return 'GB-' + s;
};

const ORDER_CHIP = { new: 'blue', making: 'acc', ready: 'warn', delivered: 'ok', cancelled: 'bad' };
const REQ_CHIP = { new: 'blue', discussing: 'acc', quoted: 'warn', approved: 'ok', printing: 'acc', done: 'ok', closed: 'bad' };

/* ------------------------------------------------------------------- shell */
function shell() {
  const name = (S.settings.shopName || CFG.shopName || 'GEWY BUILDS').trim();
  const parts = name.split(' ');
  const last = parts.pop();
  const logo = `${esc(parts.join(' '))}${parts.length ? ' ' : ''}<b>${esc(last)}</b>`;
  $('#app').innerHTML = `
    <header class="top"><div class="wrap">
      <div class="logo grow"><svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="17" width="18" height="3" rx="1.5" fill="currentColor" opacity=".35"/><rect x="3" y="12" width="18" height="3" rx="1.5" fill="currentColor" opacity=".6"/><rect x="3" y="7" width="18" height="3" rx="1.5" fill="currentColor" opacity=".85"/><rect x="3" y="2" width="18" height="3" rx="1.5" style="fill:var(--acc)"/></svg><span>${logo}</span></div>
      <button class="iconbtn mono" data-act="lang" aria-label="Language" style="font-size:13px;font-weight:700">${lang === 'el' ? 'EN' : 'ΕΛ'}</button>
      ${B.pushAvailable ? '<button class="iconbtn" data-act="bell" aria-label="Notifications" id="bellBtn">🔔</button>' : ''}
      <button class="iconbtn" data-act="cart" aria-label="Cart">🛒<span class="dot hide" id="cartDot"></span></button>
    </div></header>
    <main class="wrap pad-nav" id="main"></main>
    <nav class="nav"><div class="wrap">
      <button data-act="tab" data-tab="shop"><span class="e">🧩</span>${esc(t('shop'))}</button>
      <button data-act="tab" data-tab="custom"><span class="e">✏️</span>${esc(t('custom'))}<i class="dot hide" id="dotCustom"></i></button>
      <button data-act="tab" data-tab="orders"><span class="e">📦</span>${esc(t('orders'))}</button>
    </div></nav>`;
  document.documentElement.lang = lang;
  renderMain(true);
}

function bumpCart() {
  const b = $('[data-act=cart]');
  if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  try { navigator.vibrate && navigator.vibrate(8); } catch { /* ignore */ }
}

function updateChrome() {
  const n = cartCount();
  const d = $('#cartDot');
  if (d) { d.textContent = n; d.classList.toggle('hide', !n); }
  $$('.nav [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
  const dc = $('#dotCustom');
  if (dc) dc.classList.toggle('hide', !S.requests.some(isUnread));
  const bell = $('#bellBtn');
  if (bell) bell.textContent = B.pushEnabled('shop') ? '🔔' : '🔕';
}

function renderMain(swap) {
  const m = $('#main');
  if (!m) return;
  if (swap) { m.classList.remove('swap'); void m.offsetWidth; m.classList.add('swap'); }
  if (S.tab === 'shop') m.innerHTML = viewShop();
  else if (S.tab === 'custom') m.innerHTML = viewCustom();
  else m.innerHTML = viewOrders();
  updateChrome();
}

/* -------------------------------------------------------------------- shop */
const isStandalone = () => (globalThis.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
function installBtn() {
  if (isStandalone()) return '';
  if (S.installEvt) return `<button class="btn pri sm" data-act="install">⬇ ${esc(t('install'))}</button>`;
  if (isIOS()) return `<button class="btn pri sm" data-act="iosInstall">⬇ ${esc(t('install'))}</button>`;
  return '';
}

function viewShop() {
  const st = S.settings;
  const pushOn = B.pushEnabled('shop');
  let h = `<section class="hero"><h2>${esc(t('heroTitle'))}</h2><div class="mut">${esc(st.about || t('heroSub'))}</div>
    ${installBtn() || B.pushAvailable ? '<div class="gap-s"></div>' : ''}
    <div class="row" style="flex-wrap:wrap">${installBtn()}
    ${!B.pushAvailable ? '' : pushOn ? `<span class="chip ok">🔔 ${esc(t('notifyOn'))}</span>` : `<button class="btn pri sm" data-act="bell">🔔 ${esc(t('notifyBtn'))}</button>`}</div>
  </section>`;
  if (B.mode === 'demo') h += `<div class="banner demo">🧪 <span><b>DEMO MODE</b> — data is saved only in this browser. See README to go live.</span></div>`;
  h += `<div class="gap"></div>`;
  if (!S.loaded.products) return h + '<div class="grid">' + '<div class="prod skel"><div class="ph"></div><div class="meta"><i></i><i class="s"></i></div></div>'.repeat(6) + '</div>';
  if (!S.products.length) return h + `<div class="empty">${esc(t('noProducts'))}</div>`;
  const enter = !S.entered; S.entered = true;
  h += `<div class="grid${enter ? ' enter' : ''}">` + S.products.map(prodCard).join('') + `</div>`;
  h += `<p class="mut sm" style="text-align:center;margin:22px 0 6px">${esc(t('trust'))}</p>`;
  return h;
}

function prodCard(p) {
  const img = p.images && p.images[0];
  const fresh = Date.now() - (p.createdAt || 0) < 72 * 3600 * 1000;
  return `<button class="prod" data-act="open" data-id="${esc(p.id)}">
    <div class="ph">${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="noimg">🧩</div>'}</div>
    ${p.soldOut ? `<span class="chip bad tag">${esc(t('soldOut'))}</span>` : fresh ? `<span class="chip acc tag">${esc(t('new'))}</span>` : ''}
    <div class="meta"><div class="nm">${esc(p.name)}</div><div class="pr">${eur(p.price)}</div></div></button>`;
}

function openProduct(id) {
  const p = S.products.find((x) => x.id === id);
  if (!p) return;
  let qty = 1;
  let color = p.colors && p.colors.length ? p.colors[0] : '';
  const imgs = p.images || [];
  const s = sheet(`
    <div class="hd"><div class="ttl">${esc(p.name)}</div><button class="xbtn" data-close>✕</button></div>
    ${imgs.length ? `<div class="gal">${imgs.map((u) => `<img src="${esc(u)}" alt="" data-zoom>`).join('')}</div>` : ''}
    <div class="row between" style="margin-top:12px"><div class="mono" style="font-size:22px;color:var(--acc2);font-weight:800">${eur(p.price)}</div>${p.soldOut ? `<span class="chip bad">${esc(t('soldOut'))}</span>` : ''}</div>
    ${p.description ? `<p style="white-space:pre-wrap">${esc(p.description)}</p>` : ''}
    ${p.colors && p.colors.length ? `<div class="h2">${esc(t('color'))}</div><div class="chips" id="cols">${p.colors.map((c) => `<button class="pill${c === color ? ' on' : ''}" data-a="color" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${p.soldOut ? '' : `<div class="gap"></div>
    <div class="row"><div class="qty"><button data-a="minus">−</button><span id="q">1</span><button data-a="plus">+</button></div>
      <button class="btn grow" data-a="add">${esc(t('add'))}</button></div>
    <div class="gap-s"></div><button class="btn pri block" data-a="buy">${esc(t('buyNow'))}</button>`}`);
  const item = () => ({ key: p.id + '|' + color, pid: p.id, name: p.name + (color ? ' · ' + color : ''), price: +p.price || 0, cost: +p.cost || 0, qty, color, image: imgs[0] || '' });
  s.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'minus') qty = Math.max(1, qty - 1);
    if (a === 'plus') qty = Math.min(20, qty + 1);
    if (a === 'color') {
      color = b.dataset.c;
      $$('#cols .pill', s.el).forEach((x) => x.classList.toggle('on', x.dataset.c === color));
    }
    $('#q', s.el).textContent = qty;
    if (a === 'add') {
      const it = item();
      const ex = S.cart.find((c) => c.key === it.key);
      if (ex) ex.qty += it.qty; else S.cart.push(it);
      saveCart(); updateChrome(); bumpCart(); toast('✓ ' + t('added')); s.close();
    }
    if (a === 'buy') { s.close(); openCheckout({ items: [item()] }); }
  });
}

/* -------------------------------------------------------------------- cart */
function openCart() {
  const s = sheet('');
  const draw = () => {
    s.el.innerHTML = `<div class="hd"><div class="ttl">${esc(t('cart'))}</div><button class="xbtn" data-close>✕</button></div>
      ${S.cart.length ? S.cart.map((i, n) => `<div class="line">
          ${i.image ? `<img src="${esc(i.image)}" alt="">` : '<div class="sq"></div>'}
          <div class="grow"><b>${esc(i.name)}</b><div class="mono mut sm">${eur(i.price)} × ${i.qty}</div></div>
          <div class="qty"><button data-a="m" data-n="${n}">−</button><span>${i.qty}</span><button data-a="p" data-n="${n}">+</button></div>
          <button class="xbtn" data-a="rm" data-n="${n}" aria-label="${esc(t('remove'))}">🗑</button></div>`).join('') +
        `<div class="row between" style="margin:14px 0"><span class="mut">${esc(t('total'))}</span><b class="mono" style="font-size:22px">${eur(cartTotal())}</b></div>
         <button class="btn pri block" data-a="go">${esc(t('checkout'))}</button>`
        : `<div class="empty">${esc(t('cartEmpty'))}</div>`}`;
  };
  draw();
  s.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const n = +b.dataset.n;
    if (b.dataset.a === 'm') S.cart[n].qty = Math.max(1, S.cart[n].qty - 1);
    if (b.dataset.a === 'p') S.cart[n].qty = Math.min(20, S.cart[n].qty + 1);
    if (b.dataset.a === 'rm') S.cart.splice(n, 1);
    if (b.dataset.a === 'go') { s.close(); openCheckout({ items: S.cart.map((x) => ({ ...x })), fromCart: true }); return; }
    saveCart(); updateChrome(); draw();
  });
}

/* ---------------------------------------------------------------- checkout */
const r2 = (n) => Math.round(n * 100) / 100;
// Box Now: part now (your cost, or a percentage), the rest when the parcel is in the locker.
function boxSplit(items, st) {
  const sub = items.reduce((n, i) => n + i.price * i.qty, 0);
  const fee = Math.max(0, +st.boxFee || 0);
  const cost = items.reduce((n, i) => n + (i.cost || 0) * i.qty, 0);
  const pct = Math.min(100, Math.max(5, +st.depositPct || 30));
  let dep = st.depositMode === 'percent' || cost <= 0 ? sub * pct / 100 : cost;
  dep = r2(Math.min(sub + fee, Math.max(1, dep)));
  const total = r2(sub + fee);
  return { fee, total, deposit: dep, balance: r2(total - dep) };
}

function openCheckout({ items, requestId = null, fromCart = false }) {
  const st = S.settings;
  let total = items.reduce((n, i) => n + i.price * i.qty, 0);
  const itemsTotal = total;
  const prof = profile();
  const canOnline = st.payOnline !== false && !!st.payLink;
  const canHandoff = st.payHandoff !== false || !canOnline;
  let pay = canHandoff ? 'handoff' : 'online';
  const boxOn = !!st.boxnow && canOnline;
  let delivery = 'deliver';
  const label = st.payLabel || 'Card / PayPal / Revolut';

  const s = sheet(`
    <div class="hd"><div class="ttl">${esc(t('checkout'))}</div><button class="xbtn" data-close>✕</button></div>
    ${items.map((i) => `<div class="line">${i.image ? `<img src="${esc(i.image)}" alt="">` : '<div class="sq"></div>'}
      <div class="grow"><b>${esc(i.name)}</b><div class="mono mut sm">× ${i.qty}</div></div><b class="mono">${eur(i.price * i.qty)}</b></div>`).join('')}
    <div class="row between" style="margin:10px 0 4px"><span class="mut">${esc(t('total'))}</span><b class="mono" style="font-size:22px" id="totalV">${eur(total)}</b></div>
    <div class="card hide" id="boxSum"></div>
    <label class="f"><span>${esc(t('area'))} *</span><select class="in" id="cArea">${areaOpts(areasFor('deliver'), prof.area)}</select></label>
    <p class="mut sm" id="areaHint" style="margin:-6px 0 8px">${esc(t('areaHint'))}</p>
    <label class="f"><span>${esc(t('yourName'))}</span><input class="in" id="cName" autocomplete="name" value="${esc(prof.name || '')}"></label>
    <label class="f"><span>${esc(t('phone'))}</span><input class="in" id="cPhone" type="tel" autocomplete="tel" value="${esc(prof.phone || '')}" placeholder="${esc(t('phoneHint'))}"></label>
    <div class="h2">${esc(t('how'))}</div>
    <div class="opt on" data-a="dl" data-v="deliver"><i class="rd"></i><div><b>${esc(t('deliver'))}</b><span class="mut sm">${esc(t('deliverDesc'))}</span></div></div>
    <div class="opt" data-a="dl" data-v="meetup"><i class="rd"></i><div><b>${esc(t('meetup'))}</b><span class="mut sm">${esc(t('meetupDesc'))}</span></div></div>
    ${boxOn ? `<div class="opt" data-a="dl" data-v="boxnow"><i class="rd"></i><div><b>📦 ${esc(t('boxnow'))}</b><span class="mut sm">${esc(t('boxnowDesc'))}</span></div></div>` : ''}
    <label class="f"><span id="addrL">${esc(t('address'))}</span><input class="in" id="cAddr" autocomplete="street-address" value="${esc(prof.address || '')}"></label>
    <label class="f"><span>${esc(t('note'))}</span><input class="in" id="cNote"></label>
    <div id="paySec"><div class="h2">${esc(t('payHow'))}</div>
    ${canHandoff ? `<div class="opt${pay === 'handoff' ? ' on' : ''}" data-a="pay" data-v="handoff"><i class="rd"></i><div><b>${esc(t('payHandoff'))}</b><span class="mut sm">${esc(st.handoffNote || t('payHandoffDesc'))}</span></div></div>` : ''}
    ${canOnline ? `<div class="opt${pay === 'online' ? ' on' : ''}" data-a="pay" data-v="online"><i class="rd"></i><div><b>${esc(t('payOnline'))}</b><span class="mut sm">${esc(t('payOnlineDesc', { label }))}</span></div></div>` : ''}</div>
    <div class="gap"></div>
    <button class="btn pri block" data-a="place" id="placeBtn">${esc(t('placeOrder'))} · ${eur(total)}</button>
    <p class="mut sm" style="text-align:center">${esc(t('trust'))}</p>`);

  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'dl') {
      delivery = b.dataset.v;
      $$('[data-a=dl]', s.el).forEach((x) => x.classList.toggle('on', x === b));
      $('#addrL', s.el).textContent = delivery === 'deliver' ? t('address') : delivery === 'boxnow' ? t('boxWhere') : t('meetWhere');
      const box = delivery === 'boxnow';
      const cur = $('#cArea', s.el).value;
      $('#cArea', s.el).innerHTML = areaOpts(areasFor(delivery), cur);
      $('#areaHint', s.el).textContent = box ? t('areaHintBox') : t('areaHint');
      $('#paySec', s.el).classList.toggle('hide', box);
      const sum = $('#boxSum', s.el);
      sum.classList.toggle('hide', !box);
      if (box) {
        const x = boxSplit(items, st);
        total = x.total;
        sum.innerHTML = `${x.fee ? `<div class="row between"><span class="mut">${esc(t('fee'))}</span><b class="mono">${eur(x.fee)}</b></div>` : ''}
          <div class="row between"><span>${esc(t('deposit'))}</span><b class="mono">${eur(x.deposit)}</b></div>
          <div class="row between"><span>${esc(t('balance'))}</span><b class="mono">${eur(x.balance)}</b></div>
          <p class="mut sm" style="margin:8px 0 0">${esc(t('boxExplain'))}</p>`;
      } else total = itemsTotal;
      $('#totalV', s.el).textContent = eur(total);
      $('#placeBtn', s.el).textContent = `${t('placeOrder')} · ${eur(total)}`;
    }
    if (a === 'pay') {
      pay = b.dataset.v;
      $$('[data-a=pay]', s.el).forEach((x) => x.classList.toggle('on', x === b));
    }
    if (a === 'place') {
      const name = $('#cName', s.el).value.trim();
      const phone = $('#cPhone', s.el).value.trim();
      const address = $('#cAddr', s.el).value.trim();
      const note = $('#cNote', s.el).value.trim();
      const area = $('#cArea', s.el).value;
      if (!area) return toast(t('areaNeeded'));
      if (!name || digits(phone).length < 6) return toast(t('fillRequired'));
      if (delivery !== 'meetup' && !address) return toast(t('needAddress'));
      b.disabled = true;
      try {
        const bx = delivery === 'boxnow' ? boxSplit(items, st) : null;
        const order = {
          uid: B.uid(), no: newCode(),
          items: items.map((i) => ({ id: i.pid || null, name: i.name, price: i.price, cost: i.cost || 0, qty: i.qty, color: i.color || '', image: i.image || '' })),
          total: bx ? bx.total : Math.round(total * 100) / 100,
          ...(bx ? { fee: bx.fee, deposit: bx.deposit, balance: bx.balance } : {}),
          costTotal: Math.round(items.reduce((n, i) => n + (i.cost || 0) * i.qty, 0) * 100) / 100,
          customer: { name, phone, address, note, area },
          delivery, payMethod: bx ? 'deposit' : pay, payStatus: 'unpaid', status: 'new',
          requestId, source: 'shop', createdAt: Date.now(),
        };
        const id = await B.add('orders', order);
        localStorage.setItem('gewy:profile', JSON.stringify({ name, phone, address, area }));
        if (requestId) {
          await B.add('messages', { requestId, ownerUid: B.uid(), from: 'customer', text: `✅ ${t('approve')} — ${order.no}`, at: Date.now() });
          await B.set('requests', requestId, { status: 'approved', updatedAt: Date.now(), lastFrom: 'customer' });
        }
        if (fromCart) { S.cart = []; saveCart(); updateChrome(); }
        s.close();
        showPlaced({ ...order, id });
      } catch (err) {
        console.error(err);
        toast(t('err'));
        b.disabled = false;
      }
    }
  });
}

function payUrl(order) {
  const st = S.settings;
  return st.payLink ? fillPayLink(st.payLink, order.payMethod === 'deposit' ? { ...order, total: order.deposit } : order) : '';
}

function contactButtons() {
  const ph = S.settings.phone;
  if (!ph) return '';
  return `<div class="row" style="margin-top:10px"><a class="btn sm grow" href="tel:${esc(ph.replace(/[^\d+]/g, ''))}">📞 ${esc(t('call'))}</a>
    <a class="btn sm grow" target="_blank" rel="noopener" href="https://wa.me/${waNumber(ph)}">💬 ${esc(t('whatsapp'))}</a></div>`;
}

function showPlaced(o) {
  const url = o.payMethod === 'online' || o.payMethod === 'deposit' ? payUrl(o) : '';
  const dep = o.payMethod === 'deposit';
  const s = sheet(`
    <div style="text-align:center;padding:10px 0 4px"><svg class="tick" viewBox="0 0 52 52" width="64" height="64" aria-hidden="true"><circle class="tick-c" cx="26" cy="26" r="24" fill="none" stroke="var(--ok)" stroke-width="3"/><path class="tick-p" d="M15 27l8 8 14-16" fill="none" stroke="var(--ok)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="h1" style="margin:6px 0">${esc(t('orderPlaced'))}</div>
      <div class="mut sm">${esc(t('orderNo'))}</div><div class="mono" style="font-size:26px;font-weight:800;color:var(--acc2)">${esc(o.no)}</div></div>
    ${url ? `<div class="card" style="margin-top:12px"><div class="row between"><span class="mut">${esc(t('payAmount'))}</span><b class="mono" style="font-size:22px">${eur(dep ? o.deposit : o.total)}</b></div>
        ${dep ? `<div class="row between" style="margin-top:6px"><span class="mut">${esc(t('balLeft'))}</span><b class="mono">${eur(o.balance)}</b></div><p class="mut sm" style="margin:8px 0 0">${esc(t('depNote'))}</p>` : ''}
        <p class="mut sm" style="margin:8px 0 12px">${esc(t('payNote'))}</p>
        <a class="btn pri block" href="${esc(url)}" rel="noopener">💳 ${esc(t('payNow'))} · ${eur(dep ? o.deposit : o.total)}</a>
        <p class="mut sm" style="margin:10px 0 0">${esc(t('savedInOrders'))}</p></div>`
      : `<div class="card" style="margin-top:12px">${esc(t('handoffThanks'))}</div>`}
    ${contactButtons()}
    <div class="gap"></div><button class="btn block" data-close>${esc(t('done'))}</button>`);
  try { navigator.vibrate && navigator.vibrate([12, 40, 12]); } catch { /* ignore */ }
  S.tab = 'orders';
  renderMain(true);
  return s;
}

/* ------------------------------------------------------------------ orders */
function viewOrders() {
  const rows = [...S.orders].sort((a, b) => b.createdAt - a.createdAt);
  if (!rows.length) return `<div class="h1">${esc(t('orders'))}</div><div class="empty">${esc(t('noOrders'))}</div>`;
  return `<div class="h1">${esc(t('orders'))}</div>` + rows.map((o) => {
    const dep = o.payMethod === 'deposit';
    const url = (o.payMethod === 'online' ? o.payStatus !== 'paid' : dep && o.payStatus === 'unpaid') && o.status !== 'cancelled' ? payUrl(o) : '';
    return `<div class="card">
      <div class="row between"><b class="mono">${esc(o.no)}</b><span class="chip ${ORDER_CHIP[o.status] || ''}">${esc(t('st_' + o.status))}</span></div>
      <div class="mut sm">${esc(ago(o.createdAt, lang))}</div>
      <div style="margin:8px 0">${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>')}</div>
      <div class="row between"><b class="mono">${eur(o.total)}</b>
        <span class="chip ${o.payStatus === 'paid' ? 'ok' : 'warn'}">${esc(o.payStatus === 'paid' ? t('paid') : o.payStatus === 'deposit' ? t('depPaid') : o.payMethod === 'handoff' ? t('atHandoff') : t('unpaid'))}</span></div>
      ${dep && o.payStatus !== 'paid' ? `<div class="mut sm" style="margin-top:4px">${esc(t('balLeft'))}: <b class="mono">${eur(o.payStatus === 'deposit' ? o.balance : o.total)}</b></div>` : ''}
      ${url ? `<a class="btn pri block" style="margin-top:10px" href="${esc(url)}" rel="noopener">💳 ${esc(t('payNow'))} · ${eur(dep ? o.deposit : o.total)}</a>` : ''}
    </div>`;
  }).join('') + contactButtons();
}

/* ------------------------------------------------------------------ custom */
function viewCustom() {
  const rows = [...S.requests].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return `<section class="hero"><h2>${esc(t('customTitle'))}</h2><div class="mut">${esc(t('customSub'))}</div>
      <div class="gap-s"></div><button class="btn pri" data-act="newreq">✏️ ${esc(t('newReq'))}</button></section>
    <div class="gap"></div>` +
    (rows.length ? rows.map((r) => `<button class="card prod" style="padding:14px" data-act="thread" data-id="${esc(r.id)}">
        <div class="row between"><b>${esc(r.title)}</b><span class="chip ${REQ_CHIP[r.status] || ''}">${esc(t('rq_' + r.status))}</span></div>
        <div class="mut sm">${esc(ago(r.updatedAt, lang))}${isUnread(r) ? ' · <span style="color:var(--acc2)">●</span>' : ''}</div></button>`).join('')
      : `<div class="empty">${esc(t('noReqs'))}</div>`);
}

const areasFor = (kind) => (kind === 'boxnow' ? parseAreas(S.settings.courierAreas, COURIER_DEF) : parseAreas(S.settings.handoffAreas, HANDOFF_DEF));
const allAreas = () => [...new Set([...areasFor('x'), ...areasFor('boxnow')])];
const areaOpts = (list, cur) => `<option value="">${esc(t('chooseArea'))}</option>` + list.map((a) => `<option value="${esc(a)}"${a === cur ? ' selected' : ''}>${esc(a)}</option>`).join('');
const MAX_REQ_DAY = 3;
const reqToday = () => S.requests.filter((r) => (r.createdAt || 0) > Date.now() - 86400000).length;

function openNewRequest() {
  if (reqToday() >= MAX_REQ_DAY) return toast(t('reqLimit', { n: MAX_REQ_DAY }), 4500);
  const prof = profile();
  const files = [];
  const s = sheet(`
    <div class="hd"><div class="ttl">${esc(t('newReq'))}</div><button class="xbtn" data-close>✕</button></div>
    <label class="f"><span>${esc(t('reqTitle'))}</span><input class="in" id="rT" placeholder="${esc(t('reqTitleP'))}"></label>
    <label class="f"><span>${esc(t('reqDesc'))}</span><textarea class="in" id="rD" placeholder="${esc(t('reqDescP'))}"></textarea></label>
    <label class="f"><span>${esc(t('reqBudget'))}</span><input class="in" id="rB"></label>
    <label class="f"><span>${esc(t('area'))} *</span><select class="in" id="rArea">${areaOpts(allAreas(), prof.area)}</select></label>
    <div class="h2">${esc(t('reqPhoto'))}</div>
    <div class="thumbs" id="rTh"><button class="addimg" data-a="pick">＋</button></div>
    <input type="file" id="rF" accept="image/*" multiple class="hide">
    <label class="f"><span>${esc(t('yourName'))}</span><input class="in" id="rN" value="${esc(prof.name || '')}"></label>
    <label class="f"><span>${esc(t('phone'))}</span><input class="in" id="rP" type="tel" value="${esc(prof.phone || '')}"></label>
    <div class="gap"></div><button class="btn pri block" data-a="send">${esc(t('sendReq'))}</button>`);
  const drawThumbs = () => {
    $('#rTh', s.el).innerHTML = files.map((f, i) => `<div class="thumb"><img src="${URL.createObjectURL(f)}" alt=""><button data-a="x" data-i="${i}">✕</button></div>`).join('') +
      (files.length < B.MAX_PHOTOS ? '<button class="addimg" data-a="pick">＋</button>' : '');
  };
  $('#rF', s.el).addEventListener('change', (e) => { files.push(...[...e.target.files].slice(0, B.MAX_PHOTOS - files.length)); e.target.value = ''; drawThumbs(); });
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'pick') $('#rF', s.el).click();
    if (b.dataset.a === 'x') { files.splice(+b.dataset.i, 1); drawThumbs(); }
    if (b.dataset.a === 'send') {
      const title = $('#rT', s.el).value.trim();
      const desc = $('#rD', s.el).value.trim();
      const name = $('#rN', s.el).value.trim();
      const phone = $('#rP', s.el).value.trim();
      if (reqToday() >= MAX_REQ_DAY) return toast(t('reqLimit', { n: MAX_REQ_DAY }), 4500);
      if (!title || !desc) return toast(t('reqTitle'));
      const area = $('#rArea', s.el).value;
      if (!area) return toast(t('areaNeeded'));
      if (!name || digits(phone).length < 6) return toast(t('fillRequired'));
      b.disabled = true; b.textContent = t('sending');
      try {
        const refImages = [];
        for (const f of files) refImages.push(await B.uploadImage(f, 'requests/' + B.uid()));
        const now = Date.now();
        const id = await B.add('requests', { ownerUid: B.uid(), name, phone, area, title, desc, budget: $('#rB', s.el).value.trim(), refImages, status: 'new', quote: null, createdAt: now, updatedAt: now, lastFrom: 'customer' });
        localStorage.setItem('gewy:profile', JSON.stringify({ ...prof, name, phone, area }));
        localStorage.setItem(seenKey(id), String(now));
        s.close(); toast('✓ ' + t('sent'));
        openThread(id);
      } catch (err) { console.error(err); toast(t('err')); b.disabled = false; b.textContent = t('sendReq'); }
    }
  });
}

function openThread(id) {
  const s = sheet(`<div class="hd"><div class="ttl" id="tTitle"></div><span id="tChip"></span><button class="xbtn" data-close>✕</button></div>
    <div id="tInfo"></div><div class="chat" id="tChat"></div>
    <div class="composer"><button class="iconbtn" data-a="att" aria-label="Photo">📷</button><input type="file" id="tF" accept="image/*" class="hide">
      <textarea id="tM" rows="1" placeholder="${esc(t('msgP'))}"></textarea><button class="btn pri" data-a="send">${esc(t('send'))}</button></div>`,
    { full: true, onClose: () => { un1(); S.threadRedraw = null; localStorage.setItem(seenKey(id), String(Date.now())); updateChrome(); renderMain(); } });
  let msgs = [];
  const getReq = () => S.requests.find((r) => r.id === id);
  const drawInfo = () => {
    const r = getReq();
    if (!r) return;
    $('#tTitle', s.el).textContent = r.title;
    $('#tChip', s.el).innerHTML = `<span class="chip ${REQ_CHIP[r.status] || ''}">${esc(t('rq_' + r.status))}</span>`;
    let h = `<div class="card"><div class="mut sm">${esc(t('details'))}</div><div style="white-space:pre-wrap">${esc(r.desc)}</div>
      ${r.budget ? `<div class="mut sm" style="margin-top:6px">${esc(t('reqBudget'))}: ${esc(r.budget)}</div>` : ''}
      ${(r.refImages || []).length ? `<div class="thumbs">${r.refImages.map((u) => `<div class="thumb"><img src="${esc(u)}" data-zoom alt=""></div>`).join('')}</div>` : ''}</div>`;
    if (r.quote && r.status === 'quoted') {
      h += `<div class="card" style="border-color:var(--acc);margin-top:10px"><div class="row between"><span>${esc(t('quoteReady'))}</span><b class="mono" style="font-size:22px">${eur(r.quote.price)}</b></div>
        ${r.quote.note ? `<div class="mut sm" style="margin-top:4px">${esc(r.quote.note)}</div>` : ''}
        <div class="gap-s"></div><button class="btn pri block" data-a="approve">✅ ${esc(t('approve'))} · ${eur(r.quote.price)}</button>
        <p class="mut sm" style="margin:8px 0 0">${esc(t('quoteHint'))}</p></div>`;
    }
    $('#tInfo', s.el).innerHTML = h;
  };
  const drawChat = () => {
    const box = $('#tChat', s.el);
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = [...msgs].sort((a, b) => a.at - b.at).map((m) => `<div class="bub${m.from === 'customer' ? ' me' : ''}">
      ${m.image ? `<img src="${esc(m.image)}" data-zoom alt="">` : ''}${m.text ? esc(m.text) : ''}<div class="t">${esc(m.from === 'customer' ? t('you') : t('maker'))} · ${esc(ago(m.at, lang))}</div></div>`).join('');
    if (atEnd) box.scrollTop = box.scrollHeight;
    localStorage.setItem(seenKey(id), String(Date.now()));
  };
  const un1 = B.watch('messages', (rows) => { msgs = rows; drawChat(); }, { where: [['requestId', '==', id], ['ownerUid', '==', B.uid()]] });
  S.threadRedraw = drawInfo; // the main requests listener calls this when the request changes
  drawInfo();
  const send = async (image) => {
    const ta = $('#tM', s.el);
    const text = ta.value.trim();
    if (!text && !image) return;
    ta.value = '';
    const now = Date.now();
    await B.add('messages', { requestId: id, ownerUid: B.uid(), from: 'customer', text, image: image || '', at: now });
    await B.set('requests', id, { updatedAt: now, lastFrom: 'customer' });
  };
  $('#tF', s.el).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { toast(t('sending')); await send(await B.uploadImage(f, 'requests/' + B.uid())); } catch (err) { console.error(err); toast(t('err')); }
  });
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'att') $('#tF', s.el).click();
    if (b.dataset.a === 'send') { try { await send(); } catch (err) { console.error(err); toast(t('err')); } }
    if (b.dataset.a === 'approve') {
      const r = getReq();
      s.close();
      openCheckout({ items: [{ key: 'req' + id, pid: null, name: '✏️ ' + r.title, price: +r.quote.price, cost: 0, qty: 1, image: (r.refImages || [])[0] || '' }], requestId: id });
    }
  });
  $('#tM', s.el).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } });
}

/* ----------------------------------------------------------- notifications */
async function bell() {
  if (B.pushEnabled('shop')) return toast('🔔 ' + t('notifyOn'));
  if (!('Notification' in globalThis)) return sheet(`<div class="hd"><div class="ttl">🔔</div><button class="xbtn" data-close>✕</button></div><p>${esc(t('notifyIos'))}</p><button class="btn block" data-close>OK</button>`);
  const r = await B.enablePush('shop');
  if (r.ok) toast('🔔 ' + t('notifyThanks'));
  else if (r.reason === 'denied') toast(t('notifyDenied'), 5000);
  else toast(t('notifyIos'), 6000);
  renderMain();
}

async function installApp() {
  const ev = S.installEvt;
  if (!ev) return;
  try { ev.prompt(); await ev.userChoice; } catch { /* ignore */ }
  S.installEvt = null;
  renderMain();
}
globalThis.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; if (S.tab === 'shop') renderMain(); });
globalThis.addEventListener('appinstalled', () => { S.installEvt = null; toast('✓ ' + t('installDone')); B.touchDevice({ installed: true, visit: false }); renderMain(); });

/* ------------------------------------------------------------------ events */
document.addEventListener('click', (e) => {
  const z = e.target.closest('img[data-zoom]');
  if (z) { sheet(`<img src="${esc(z.src)}" alt="" style="width:100%;border-radius:14px"><div class="gap-s"></div><button class="btn block" data-close>✕</button>`); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'tab') { S.tab = b.dataset.tab; renderMain(true); scrollTo(0, 0); }
  if (a === 'open') openProduct(b.dataset.id);
  if (a === 'cart') openCart();
  if (a === 'bell') bell();
  if (a === 'install') installApp();
  if (a === 'iosInstall') sheet(`<div class="hd"><div class="ttl">${esc(t('installTitle'))}</div><button class="xbtn" data-close>✕</button></div><p style="white-space:pre-wrap">${esc(t('installSteps'))}</p><button class="btn block" data-close>OK</button>`);
  if (a === 'lang') { lang = lang === 'el' ? 'en' : 'el'; localStorage.setItem('gewy:lang', lang); shell(); }
  if (a === 'newreq') openNewRequest();
  if (a === 'thread') openThread(b.dataset.id);
});
globalThis.addEventListener('gewy:push', (e) => toast('🔔 ' + [e.detail.title, e.detail.body].filter(Boolean).join(' — '), 6000));

/* -------------------------------------------------------------------- boot */
(async function boot() {
  shell();
  try {
    await B.init({ role: 'shop' });
  } catch (err) {
    console.error(err);
    $('#main').innerHTML = `<div class="empty">${esc(t('err'))}</div>`;
    return;
  }
  const me = B.uid();
  B.watch('products', (rows) => {
    S.loaded.products = true;
    S.products = rows.filter((p) => p.published !== false).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (S.tab === 'shop') renderMain();
  });
  B.watchDoc('settings', 'shop', (d) => { S.settings = d || {}; if (S.tab === 'shop') renderMain(); });
  B.watch('orders', (rows) => { S.orders = rows; if (S.tab === 'orders') renderMain(); }, { where: [['uid', '==', me]] });
  B.watch('requests', (rows) => { S.requests = rows; if (S.tab === 'custom') renderMain(); updateChrome(); if (S.threadRedraw) S.threadRedraw(); }, { where: [['ownerUid', '==', me]] });
  if (B.mode === 'demo') {
    const started = Date.now();
    B.watch('broadcasts', (rows) => {
      rows.filter((r) => r.at >= started - 1500 && !sessionStorage.getItem('b:' + r.id)).forEach((r) => {
        sessionStorage.setItem('b:' + r.id, '1');
        toast('🔔 ' + r.title + (r.body ? ' — ' + r.body : ''), 6000);
        B.localNotify(r.title, r.body || '');
      });
    });
  }
  if (B.pushAvailable) B.enablePush('shop', { silent: true });
  // Audience stats: count this visit once per session (and note if it was opened from the home-screen icon).
  let counted = false;
  try { counted = !!sessionStorage.getItem('gewy:counted'); sessionStorage.setItem('gewy:counted', '1'); } catch { /* ignore */ }
  if (!counted) B.touchDevice({ installed: isStandalone(), visit: true });
})();
