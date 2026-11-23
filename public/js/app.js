// Uygulama kabuğu ve yönlendirici (hash tabanlı).
import { h, unlockAudio } from './util.js';
import { configured, whenReady, onSession, session } from './firebase.js';
import { APP_VERSION, APP_DATE, APP_CREDIT } from './version.js';

const app = document.getElementById('app');
const back = h('a', { class: 'back hidden', href: '#/', 'aria-label': 'Geri' }, '‹');
const title = h('div', { class: 'title' });
const topbar = h('header', { class: 'topbar' }, back, title);
const main = h('main', {});
const footer = h('footer', { class: 'app-footer' },
  h('div', {}, `Sürüm ${APP_VERSION} · ${APP_DATE}`),
  h('div', { class: 'credit' }, APP_CREDIT));
app.append(topbar, main, footer);

const ctx = {
  setTitle(t, backHref) {
    title.textContent = t || '☕ Çay-Kahve Sipariş';
    title.className = 'title' + (t ? '' : ' brand');
    if (backHref) { back.href = backHref; back.classList.remove('hidden'); } else { back.classList.add('hidden'); }
  },
  wide(on) { main.classList.toggle('wide', !!on); }
};

// Ses için ilk dokunuşta ses motorunu aç
['click', 'touchstart', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio, { once: false, passive: true }));

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

function setupScreen() {
  ctx.setTitle('Kurulum gerekli', null);
  main.replaceChildren(
    h('div', { class: 'alert warn' }, 'Firebase ayarları henüz yapılmamış.'),
    h('div', { class: 'card stack' },
      h('p', { style: { margin: 0 } }, '1) Firebase Console\'da proje oluşturun.'),
      h('p', { style: { margin: 0 } }, '2) public/js/firebase-config.js dosyasındaki YOUR_… değerlerini kendi proje bilgilerinizle değiştirin.'),
      h('p', { style: { margin: 0 } }, '3) README.md içindeki adımları izleyin.')));
}

function errorScreen(e) {
  ctx.setTitle('Bağlantı sorunu', null);
  const code = e && e.code;
  main.replaceChildren(
    h('div', { class: 'alert err' },
      code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation'
        ? 'Firebase Authentication\'da "Anonim" giriş yöntemi etkin değil. Console > Authentication > Sign-in method bölümünden etkinleştirin.'
        : 'Sunucuya bağlanılamadı: ' + ((e && (e.code || e.message)) || 'bilinmeyen hata')),
    h('button', { class: 'btn', onclick: () => location.reload() }, 'Yeniden dene'));
}

// ---------- Rotalar (görünümler gerektiğinde yüklenir) ----------
const routes = [
  [/^#?\/?$/, () => import('./customer.js').then((m) => m.homeView)],
  [/^#\/who$/, () => import('./customer.js').then((m) => m.whoView)],
  [/^#\/g\/([^/]+)$/, () => import('./customer.js').then((m) => m.guestView)],
  [/^#\/u\/([^/]+)$/, () => import('./customer.js').then((m) => m.personalView)],
  [/^#\/order$/, () => import('./customer.js').then((m) => m.orderView)],
  [/^#\/cart$/, () => import('./customer.js').then((m) => m.cartView)],
  [/^#\/done\/([^/]+)$/, () => import('./customer.js').then((m) => m.doneView)],
  [/^#\/my$/, () => import('./customer.js').then((m) => m.myOrdersView)],
  [/^#\/admin(?:\/([a-z]+))?$/, () => import('./admin.js').then((m) => m.adminView)]
];

let cleanup = null;
let renderId = 0;

async function render() {
  const my = ++renderId;
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  main.replaceChildren(h('div', { class: 'spinner' }, 'Yükleniyor…'));
  ctx.wide(false);
  window.scrollTo(0, 0);

  if (!configured) { setupScreen(); return; }
  await whenReady();
  if (my !== renderId) return;
  if (session.error) { errorScreen(session.error); return; }

  const hash = location.hash || '#/';
  let loader = null, args = [];
  for (const [re, load] of routes) {
    const m = hash.match(re);
    if (m) { loader = load; args = m.slice(1); break; }
  }
  if (!loader) { location.replace('#/'); return; }

  main.replaceChildren();
  try {
    const view = await loader();
    const result = await view(main, args, ctx);
    if (my !== renderId) { if (typeof result === 'function') result(); return; }
    cleanup = typeof result === 'function' ? result : null;
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'alert err' }, 'Sayfa yüklenemedi: ' + (e.message || e)));
  }
}

window.addEventListener('hashchange', render);
// Yönetici girişi / çıkışı olduğunda yönetim sayfasını yeniden çiz
let lastSig = '';
onSession((s) => {
  const sig = `${s.user ? s.user.uid : ''}|${s.isAdmin}|${s.isStaff}`;
  if (sig !== lastSig) {
    const first = lastSig === '';
    lastSig = sig;
    if (!first && (location.hash || '').startsWith('#/admin')) render();
  }
});
render();
