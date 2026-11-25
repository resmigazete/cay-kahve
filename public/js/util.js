// Küçük yardımcılar: DOM, tarih, bildirim, modal, ses.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value') el.value = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// ---------- Profil fotoğrafı ----------
// Seçilen fotoğrafı ortadan kare kırpıp küçültür ve küçük bir JPEG veri adresi (data URL) döndürür.
// Firestore belgesine doğrudan yazılır (yaklaşık 5-15 KB); ayrı depolama servisi gerekmez.
export function resizeImage(file, size = 160, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Lütfen bir fotoğraf seçin')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, size, size);
        g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotoğraf okunamadı')); };
    img.src = url;
  });
}

// Yuvarlak avatar: fotoğraf varsa onu, yoksa adın baş harflerini gösterir.
export function avatar(name, photo, px = 40) {
  const st = { width: px + 'px', height: px + 'px', fontSize: Math.round(px * 0.4) + 'px' };
  if (photo) return h('img', { class: 'avatar', src: photo, alt: name || '', style: st });
  const initials = String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toLocaleUpperCase('tr')).join('');
  return h('span', { class: 'avatar', 'aria-hidden': 'true', style: st }, initials || '?');
}

// ---------- Tarih / saat ----------
const p2 = (n) => String(n).padStart(2, '0');
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}
export function fmtTime(ts) {
  const d = toDate(ts);
  return d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '…';
}
// "25.11.2026 14:32" — siparişin tarihi ve saati (dayKey: YYYY-AA-GG)
export function fmtStamp(o) {
  const day = o && o.dayKey ? o.dayKey.split('-').reverse().join('.') : '';
  return `${day} ${fmtTime(o && o.createdAt)}`.trim();
}
export function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}
export function fmtDayShort(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', weekday: 'short' });
}
export function minutesBetween(a, b) {
  const x = toDate(a), y = toDate(b);
  if (!x || !y) return null;
  return Math.max(0, Math.round((y - x) / 60000));
}
export function durText(min) {
  if (min == null) return '';
  if (min < 1) return '1 dakikadan az';
  if (min < 60) return `${min} dk`;
  return `${Math.floor(min / 60)} sa ${min % 60} dk`;
}

// ---------- Bildirim ----------
export function toast(msg, type = '', ms = 3500) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: `toast ${type}` }, msg);
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

// ---------- Modal / alt sayfa ----------
export function modal(title, body, opts = {}) {
  const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'sheet-head' },
        h('h3', {}, title),
        h('button', { class: 'icon-btn', 'aria-label': 'Kapat', onclick: () => close() }, '✕')),
      h('div', { class: 'sheet-body' }, body)));
  document.body.append(overlay);
  function close() {
    overlay.remove();
    if (opts.onClose) opts.onClose();
  }
  return close;
}

// ---------- Pano / indirme ----------
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* yoksay */ }
    ta.remove();
  }
  toast('Bağlantı kopyalandı', 'ok', 1800);
}
export function downloadBlob(blob, filename) {
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Yüklenemedi: ' + src));
    document.head.append(s);
  });
}

// ---------- Sesli uyarı (Web Audio, ses dosyası gerekmez) ----------
let actx = null;
export function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* yoksay */ }
}
export function audioReady() { return !!actx && actx.state === 'running'; }
export function soundOn() { return localStorage.getItem('cay.sound') !== '0'; }
export function setSound(on) { localStorage.setItem('cay.sound', on ? '1' : '0'); }
export function beep() {
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch { /* yoksay */ }
  if (!actx) return;
  try {
    const now = actx.currentTime;
    [[880, 0], [1175, 0.18], [880, 0.36]].forEach(([f, t]) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.16);
      o.connect(g).connect(actx.destination);
      o.start(now + t);
      o.stop(now + t + 0.18);
    });
  } catch { /* yoksay */ }
}
