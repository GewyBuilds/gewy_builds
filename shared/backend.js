// One data layer for both apps.
//  - DEMO mode (config.firebase === null): everything lives in this browser's localStorage.
//  - LIVE mode: Firebase Auth + Firestore + Storage + Cloud Messaging.
// The apps only ever call the functions exported here, so they behave the same in both modes.
import { rid } from './ui.js';

const CFG = globalThis.GEWY_CONFIG || {};
const LOCAL = !CFG.firebase;
export const mode = LOCAL ? 'demo' : 'live';
// Phone push notifications need Firebase's paid plan; without a vapidKey they are switched off everywhere.
export const pushAvailable = LOCAL || !!CFG.vapidKey;

const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;
let app, auth, db, AU, FS;
let _uid = null;
const adminCbs = new Set();

/* ------------------------------------------------------------------ init */
export async function init({ role } = {}) {
  if (LOCAL) {
    _uid = localStorage.getItem('gewy:uid');
    if (!_uid) {
      _uid = 'u_' + rid();
      localStorage.setItem('gewy:uid', _uid);
    }
    return _uid;
  }
  const [A, a, f] = await Promise.all([
    import(CDN + 'firebase-app.js'),
    import(CDN + 'firebase-auth.js'),
    import(CDN + 'firebase-firestore.js'),
  ]);
  AU = a; FS = f;
  // One Firebase "app" per role keeps the admin login and the customer login apart on the same website.
  app = A.initializeApp(CFG.firebase, role || 'default');
  auth = AU.getAuth(app);
  db = FS.getFirestore(app);
  await auth.authStateReady();
  if (role === 'shop' && !auth.currentUser) await AU.signInAnonymously(auth);
  _uid = auth.currentUser ? auth.currentUser.uid : null;
  AU.onAuthStateChanged(auth, (u) => {
    _uid = u ? u.uid : null;
    adminCbs.forEach((f) => f(adminOf(u)));
  });
  return _uid;
}
const adminOf = (u) => (u && !u.isAnonymous ? { uid: u.uid, email: u.email } : null);
export const uid = () => _uid;

/* ------------------------------------------------------------ admin auth */
export function onAdmin(cb) {
  adminCbs.add(cb);
  if (LOCAL) cb(localStorage.getItem('gewy:admin') ? { uid: _uid, email: 'demo@gewybuilds' } : null);
  else cb(adminOf(auth.currentUser));
  return () => adminCbs.delete(cb);
}
export async function adminLogin(email, pw) {
  if (LOCAL) {
    localStorage.setItem('gewy:admin', '1');
    adminCbs.forEach((f) => f({ uid: _uid, email: 'demo@gewybuilds' }));
    return;
  }
  await AU.signInWithEmailAndPassword(auth, email, pw);
}
export async function adminLogout() {
  if (LOCAL) {
    localStorage.removeItem('gewy:admin');
    adminCbs.forEach((f) => f(null));
    return;
  }
  await AU.signOut(auth);
}

/* ------------------------------------------------------- local datastore */
const LS = {
  get: (c) => { try { return JSON.parse(localStorage.getItem('gewy:c:' + c) || '[]'); } catch { return []; } },
  set: (c, v) => localStorage.setItem('gewy:c:' + c, JSON.stringify(v)),
};
const listeners = new Map();
const bc = 'BroadcastChannel' in globalThis ? new BroadcastChannel('gewy') : null;
const fire = (c) => (listeners.get(c) || []).forEach((f) => f());
if (bc) bc.onmessage = (e) => fire(e.data);
const emit = (c) => { fire(c); bc && bc.postMessage(c); };
const match = (d, where) => where.every(([f, op, v]) => d[f] === v);

/* ------------------------------------------------------------- data API */
// where: [[field,'==',value], ...] — equality only (no special indexes needed).
export function watch(col, cb, { where = [] } = {}) {
  if (LOCAL) {
    const run = () => cb(LS.get(col).filter((d) => match(d, where)));
    if (!listeners.has(col)) listeners.set(col, new Set());
    listeners.get(col).add(run);
    setTimeout(run, 0);
    return () => listeners.get(col).delete(run);
  }
  let q = FS.collection(db, col);
  if (where.length) q = FS.query(q, ...where.map(([f, op, v]) => FS.where(f, op, v)));
  return FS.onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('watch failed:', col, err.code || err); cb([], err); }
  );
}

export function watchDoc(col, id, cb) {
  if (LOCAL) {
    return watch(col, (rows) => cb(rows.find((r) => r.id === id) || null));
  }
  return FS.onSnapshot(
    FS.doc(db, col, id),
    (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null),
    (err) => { console.warn('watchDoc failed:', col, err.code || err); cb(null, err); }
  );
}

// One-time read (not live).
export async function getAll(col, { where = [] } = {}) {
  if (LOCAL) return LS.get(col).filter((d) => match(d, where));
  let q = FS.collection(db, col);
  if (where.length) q = FS.query(q, ...where.map(([f, op, v]) => FS.where(f, op, v)));
  const snap = await FS.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function add(col, data) {
  if (LOCAL) {
    const id = rid();
    LS.set(col, [...LS.get(col), { ...data, id }]);
    emit(col);
    return id;
  }
  const r = await FS.addDoc(FS.collection(db, col), data);
  return r.id;
}

export async function set(col, id, data) {
  if (LOCAL) {
    const rows = LS.get(col);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows[i] = { ...rows[i], ...data, id };
    else rows.push({ ...data, id });
    LS.set(col, rows);
    emit(col);
    return id;
  }
  await FS.setDoc(FS.doc(db, col, id), data, { merge: true });
  return id;
}

export async function del(col, id) {
  if (LOCAL) {
    LS.set(col, LS.get(col).filter((r) => r.id !== id));
    emit(col);
    return;
  }
  await FS.deleteDoc(FS.doc(db, col, id));
}

/* -------------------------------------------------------------- images */
async function resize(file, max, q) {
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch {
    bmp = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = URL.createObjectURL(file);
    });
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

// Photos are shrunk and saved inside the database record itself (no separate file storage needed).
// Returns a data URL you can put straight into an <img>.
export const MAX_PHOTOS = 3;
export async function uploadImage(file) {
  let out = '';
  for (const max of [800, 640, 480]) {
    const c = await resize(file, max);
    for (let q = 0.78; q >= 0.44; q -= 0.11) {
      out = c.toDataURL('image/jpeg', q);
      if (out.length <= 120000) return out;
    }
  }
  return out;
}

/* ----------------------------------------------------------- audience stats */
// One small record per customer device: when first/last seen, visit count, installed or not.
// Called by the shop app only. Failures are ignored on purpose (stats must never break the shop).
export async function touchDevice({ installed = false, visit = true } = {}) {
  try {
    const id = _uid;
    if (!id) return;
    const ua = navigator.userAgent || '';
    const platform = /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop';
    const lang = (navigator.language || '').slice(0, 2);
    const now = Date.now();
    let cur = null;
    if (LOCAL) cur = LS.get('devices').find((d) => d.id === id) || null;
    else { const snap = await FS.getDoc(FS.doc(db, 'devices', id)); cur = snap.exists() ? snap.data() : null; }
    if (!cur) {
      const doc = { firstSeen: now, lastSeen: now, visits: 1, installed: !!installed, platform, lang };
      if (installed) doc.installedAt = now;
      await set('devices', id, doc);
      return;
    }
    const upd = { lastSeen: now, visits: (cur.visits || 0) + (visit ? 1 : 0), platform, lang };
    if (installed && !cur.installed) { upd.installed = true; upd.installedAt = now; }
    await set('devices', id, upd);
  } catch (e) { console.warn('stats skipped', e.code || e); }
}

/* ------------------------------------------------------------ push alerts */
// role: 'shop' (customers) or 'admin' (you). Returns {ok, reason?}.
export async function enablePush(role, { silent = false } = {}) {
  if (!('Notification' in globalThis)) return { ok: false, reason: 'unsupported' };
  if (silent && Notification.permission !== 'granted') return { ok: false, reason: 'not-granted' };
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  localStorage.setItem('gewy:push:' + role, '1');
  if (LOCAL) return { ok: true };
  try {
    const M = await import(CDN + 'firebase-messaging.js');
    if (!(await M.isSupported())) return { ok: false, reason: 'unsupported' };
    if (!CFG.vapidKey) return { ok: false, reason: 'no-vapid' };
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const messaging = M.getMessaging(app);
    const token = await M.getToken(messaging, { vapidKey: CFG.vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: 'no-token' };
    await set('subscribers', token, { uid: _uid, role, at: Date.now(), ua: navigator.userAgent.slice(0, 90) });
    M.onMessage(messaging, (p) => {
      const n = p.notification || {};
      globalThis.dispatchEvent(new CustomEvent('gewy:push', { detail: { title: n.title, body: n.body } }));
    });
    return { ok: true };
  } catch (e) {
    console.warn('push setup failed', e);
    return { ok: false, reason: 'error' };
  }
}
export const pushEnabled = (role) => localStorage.getItem('gewy:push:' + role) === '1' && 'Notification' in globalThis && Notification.permission === 'granted';

// Demo mode only: show a real browser notification for "broadcasts" so you can see the flow.
export function localNotify(title, body) {
  try {
    if ('Notification' in globalThis && Notification.permission === 'granted') new Notification(title, { body });
  } catch { /* ignore */ }
}
