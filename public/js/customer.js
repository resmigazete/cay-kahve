// Müşteri tarafı ekranları: ana ekran, kimlik, menü, sepet, onay, siparişlerim.
import { h, toast, modal, fmtTime, avatar, beep, fmtDay, dayKey, redBell } from './util.js';
import { drinkArt } from './drink-art.js';
import {
  db, session, collection, doc, getDoc, onSnapshot, query, where
} from './firebase.js';
import { STATUS, dataOf, categoryRank, sortDrinks, placeOrder, cancelOwnOrder, callStaff, cancelCall } from './data.js';
import * as store from './store.js';
import { cart, lineKey } from './store.js';
import { today as holidayToday, upcoming as holidayUpcoming } from './resmi-tatiller.js';

// Müşteriye gösterilen sade durum etiketleri (görevli ekranı kendi etiketlerini kullanır)
const CUSTOMER_LABEL = { new: 'Alındı', preparing: 'Hazırlanıyor', ready: 'Servis ediliyor', delivered: 'Teslim edildi', cancelled: 'İptal edildi' };

const errToast = (e) => { console.error(e); toast('Bir sorun oluştu: ' + (e.code || e.message), 'err', 5000); };

// ============================================================
//  ANA EKRAN
// ============================================================
// Resmî tatil ve bayramlar: bugün tatilse ya da yakında tatil varsa kart gösterilir (yoksa çıkmaz)
function importantDaysCard() {
  const now = new Date();
  const items = holidayToday(now);
  const soon = holidayUpcoming(now, 14, 2);
  if (!items.length && !soon.length) return null;
  const off = items.filter((i) => !i.arife);
  return h('div', { class: 'card special' + (off.length ? ' holiday' : '') },
    items.length ? h('div', { class: 'special-head' }, off.length ? '🎉 Bugün resmî tatil' : '🗓️ Bugün') : null,
    ...items.map((i) => h('div', { class: 'special-main' }, i.name)),
    soon.length ? h('div', { class: 'special-soon' },
      h('div', { class: 'special-head small' }, 'Yaklaşan'),
      ...soon.map((i) => h('div', {}, h('b', {}, i.label), ' · ' + i.name))) : null);
}

export function homeView(main, _args, ctx) {
  ctx.setTitle(null, null);
  const id = store.getIdentity();
  const banner = h('div');

  const who = id
    ? h('div', { class: 'card row between', style: { marginBottom: '12px' } },
        h('div', {}, h('div', { class: 'muted small' }, id.type === 'guest' ? 'Misafir olarak' : 'Sabit kullanıcı'),
          h('b', {}, '👋 ' + id.name)),
        h('a', { class: 'btn sm ghost', href: id.type === 'guest' && id.qrId ? `#/g/${id.qrId}` : '#/who' },
          id.type === 'guest' ? 'Adı değiştir' : 'Kişiyi değiştir'))
    : null;

  const special = importantDaysCard();

  main.append(
    banner, ...(special ? [special] : []), ...(who ? [who] : []),
    h('div', { class: 'stack' },
      h('a', { class: 'tile primary', href: id ? '#/order' : '#/who' },
        h('span', { class: 'ico' }, '☕'), h('span', {}, 'İçecek siparişi ver', h('small', {}, 'Çay, kahve ve diğer içecekler'))),
      // Personel çağırma yalnızca sabit kullanıcılara açık (misafirlere gösterilmez)
      id && id.type === 'guest' ? null : h('a', { class: 'tile', href: id ? '#/call' : '#/who', onclick: (e) => { if (id) { e.preventDefault(); callModal(id); } } },
        h('span', { class: 'ico' }, redBell(44)), h('span', {}, 'Personel çağır', h('small', {}, 'Bir şey lazımsa zil çalar, kısa mesaj yazabilirsin'))),
      h('a', { class: 'tile', href: '#/my' },
        h('span', { class: 'ico' }, '🧾'), h('span', {}, 'Siparişlerim', h('small', {}, 'Siparişinin durumunu takip et'))),
      h('a', { class: 'tile', href: '#/admin' },
        h('span', { class: 'ico' }, '🔐'), h('span', {}, 'Yönetici girişi', h('small', {}, 'Yalnızca yetkililer için')))
    )
  );

  return onSnapshot(doc(db, 'settings', 'app'), (s) => {
    const d = s.data() || {};
    banner.replaceChildren(d.orderingOpen === false ? h('div', { class: 'alert warn' }, '⛔ Şu anda sipariş alınmıyor.') : '');
  }, () => {});
}

// ============================================================
//  PERSONEL ÇAĞIR (zil + kısa mesaj)
// ============================================================
const QUICK_CALLS = ['Arkadaşlardan biri gelsin', 'Bardakları toplar mısınız?', 'Yardım lazım'];
const CALL_COOLDOWN = 30 * 1000;       // kapanmış çağrıdan sonra
const CALL_RESEND_OPEN = 5 * 60 * 1000; // cevapsız çağrıyı tekrar göndermek için

function callModal(id) {
  let call = null;
  let tick = null;
  let unsub = () => {};
  const input = h('input', { class: 'input', maxlength: '100', placeholder: 'Kısa mesaj (isteğe bağlı)', autocomplete: 'off' });
  const info = h('div');
  const sendBtn = h('button', { class: 'btn big', type: 'button' });
  const cancelBtn = h('button', { class: 'btn sm ghost', type: 'button' }, 'Çağrıyı iptal et');
  const chips = h('div', { class: 'chips' }, ...QUICK_CALLS.map((t) => h('button', {
    class: 'chip', type: 'button', onclick: () => { input.value = t; input.focus(); }
  }, t)));

  const ageMs = () => (call && call.createdAt ? Date.now() - toMs(call.createdAt) : Infinity);
  const toMs = (t) => (t && t.toMillis ? t.toMillis() : Date.now());

  function paint() {
    const st = call && call.status;
    const age = ageMs();
    let wait = 0;
    if (st === 'open') {
      info.replaceChildren(h('div', { class: 'alert warn' }, '⏳ Çağrınız iletildi. Personel ilgilenecek.'));
      wait = Math.max(0, CALL_RESEND_OPEN - age);
    } else if (st === 'done') {
      info.replaceChildren(h('div', { class: 'alert ok' }, '✅ Personel ilgilendi.'));
      wait = Math.max(0, CALL_COOLDOWN - age);
    } else {
      info.replaceChildren();
      if (st === 'cancelled') wait = Math.max(0, CALL_COOLDOWN - age);
    }
    cancelBtn.style.display = st === 'open' ? '' : 'none';
    sendBtn.disabled = wait > 0;
    const s = Math.ceil(wait / 1000);
    if (wait > 0) {
      sendBtn.replaceChildren(st === 'open' ? `Tekrar çağır (${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})` : `Biraz bekleyin (${s} sn)`);
    } else {
      sendBtn.replaceChildren(redBell(26, true), st === 'open' ? ' Tekrar çağır' : ' Çağır');
    }
  }

  sendBtn.onclick = async () => {
    sendBtn.disabled = true;
    try {
      await callStaff({ identity: id, message: input.value });
      input.value = '';
      toast('Çağrı iletildi', 'ok');
    } catch (e) {
      if (e && e.code === 'permission-denied') toast('Çok sık çağırdınız, biraz bekleyip tekrar deneyin', 'err', 5000);
      else errToast(e);
    }
    paint();
  };
  cancelBtn.onclick = async () => { try { await cancelCall(); } catch (e) { errToast(e); } };

  const uid = session.user && session.user.uid;
  if (uid) {
    unsub = onSnapshot(doc(db, 'calls', uid), (s) => {
      call = s.exists() ? s.data({ serverTimestamps: 'estimate' }) : null;
      paint();
    }, () => {});
  }
  tick = setInterval(paint, 1000);
  paint();

  modal(h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } }, redBell(30), 'Personel çağır'), h('div', { class: 'stack' },
    h('p', { class: 'muted', style: { margin: 0 } }, `${id.name}${id.qrName ? ' · ' + id.qrName : ''} olarak çağrılacak. Personelin ekranında zil çalar.`),
    info, chips, input, sendBtn, cancelBtn
  ), { onClose: () => { clearInterval(tick); unsub(); } });
}

// ============================================================
//  KİM SİPARİŞ VERİYOR (sabit kullanıcılar)
// ============================================================
export function whoView(main, _args, ctx) {
  ctx.setTitle('Kim sipariş veriyor?', '#/');
  const list = h('div', { class: 'stack' }, h('div', { class: 'spinner' }, 'Yükleniyor…'));
  main.append(
    h('p', { class: 'lead' }, 'Adınızı seçin:'),
    list,
    h('p', { class: 'muted small', style: { marginTop: '18px' } }, 'Misafir misiniz? Masadaki QR kodu telefonunuzun kamerasıyla okutun.')
  );
  return onSnapshot(collection(db, 'users'), (snap) => {
    const users = snap.docs.map(dataOf).sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
    list.replaceChildren(...(users.length
      ? users.map((u) => h('button', {
          class: 'btn big alt',
          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },
          onclick: () => {
            store.setIdentity({ type: 'user', userId: u.id, name: u.name });
            location.hash = '#/order';
          }
        }, avatar(u.name, u.photo, 36), u.name))
      : [h('div', { class: 'empty' }, 'Henüz kişi tanımlanmamış. Lütfen yöneticiyle iletişime geçin.')]));
  }, errToast);
}

// Kişisel bağlantı: #/u/<kullanıcıId>
export async function personalView(main, [userId], ctx) {
  ctx.setTitle('Giriş yapılıyor…', null);
  main.append(h('div', { class: 'spinner' }, 'Yükleniyor…'));
  try {
    const s = await getDoc(doc(db, 'users', userId));
    if (!s.exists()) {
      main.replaceChildren(h('div', { class: 'alert err' }, 'Bu kişisel bağlantı geçersiz. Yöneticiden yeni bağlantı isteyin.'),
        h('a', { class: 'btn', href: '#/who' }, 'Listeden adımı seç'));
      return;
    }
    store.setIdentity({ type: 'user', userId, name: s.data().name });
    location.replace('#/order');
  } catch (e) { errToast(e); }
}

// ============================================================
//  MİSAFİR (QR kod): #/g/<qrId>
// ============================================================
export async function guestView(main, [qrId], ctx) {
  ctx.setTitle('Hoş geldiniz', null);
  main.append(h('div', { class: 'spinner' }, 'Yükleniyor…'));
  let qr;
  try {
    const s = await getDoc(doc(db, 'qrcodes', qrId));
    if (!s.exists() || s.data().active === false) {
      main.replaceChildren(h('div', { class: 'alert err' }, 'Bu QR kod geçerli değil veya kapatılmış.'));
      return;
    }
    qr = s.data();
  } catch (e) { errToast(e); return; }

  const prev = store.getIdentity();
  const input = h('input', {
    class: 'input', type: 'text', maxlength: '40', autocomplete: 'name', required: true,
    placeholder: 'Adınız veya hitabınız', value: prev && prev.type === 'guest' ? prev.name : ''
  });
  const form = h('form', {
    class: 'stack',
    onsubmit: (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { toast('Lütfen adınızı yazın', 'err'); input.focus(); return; }
      store.setIdentity({ type: 'guest', name, qrId, qrName: qr.name || '' });
      location.hash = '#/order';
    }
  },
    h('div', { style: { fontSize: '3rem', textAlign: 'center' } }, '☕'),
    h('h2', { style: { textAlign: 'center' } }, 'İçecek Siparişi'),
    qr.name ? h('p', { class: 'muted', style: { textAlign: 'center', margin: 0 } }, '📍 ' + qr.name) : null,
    h('label', { class: 'field' }, 'Adınız', input),
    h('button', { class: 'btn big', type: 'submit' }, 'Devam →')
  );
  main.replaceChildren(form);
  setTimeout(() => input.focus(), 50);
}

// ============================================================
//  SİPARİŞ EKRANI (menü)
// ============================================================
export function orderView(main, _args, ctx) {
  const id = store.getIdentity();
  if (!id) { location.replace('#/who'); return; }
  ctx.setTitle('İçecek seç', '#/');

  let drinks = [];
  let settings = {};
  let cat = null;
  let loaded = false;

  const banner = h('div');
  const chips = h('div', { class: 'chips' });
  const grid = h('div', { class: 'drinks' });
  const bar = h('div', { class: 'cartbar' });
  const usual = h('div');
  const strips = h('div', { class: 'strips' });
  let lastOrder = null;
  const isOpen = () => settings.orderingOpen !== false;

  // Sabit kullanıcının fotoğrafı yönetici panelinden değişebilir; canlı izlenir.
  const avatarSlot = h('span', { style: { display: 'inline-flex' } }, avatar(id.name, '', 48));
  const unsubPhoto = id.type === 'user' && id.userId
    ? onSnapshot(doc(db, 'users', id.userId), (s) => {
        const d = s.data() || {};
        avatarSlot.replaceChildren(avatar(id.name, d.photo, 48));
      }, () => {})
    : () => {};

  main.append(
    h('div', { class: 'row between', style: { marginBottom: '10px' } },
      h('div', { class: 'hello' },
        avatarSlot,
        h('div', {}, h('div', { class: 'muted' }, id.type === 'guest' ? 'Misafir' : 'Merhaba,'), h('div', { class: 'hello-name' }, id.name))),
      h('a', { class: 'btn sm ghost', href: id.type === 'guest' && id.qrId ? `#/g/${id.qrId}` : '#/who' }, 'Değiştir')),
    banner, strips, usual, h('div', { class: 'daynote' }, fmtDay(dayKey())), chips, grid
  );
  document.body.append(bar);

  function categories() {
    const set = [...new Set(drinks.map((d) => d.category || 'Diğer'))];
    return set.sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'tr'));
  }

  function renderChips() {
    const cats = categories();
    if (!cat || !cats.includes(cat)) cat = cats[0] || null;
    chips.replaceChildren(...cats.map((c) => h('button', {
      class: 'chip' + (c === cat ? ' on' : ''),
      onclick: () => { cat = c; renderChips(); renderGrid(); }
    }, c)));
  }

  function renderBar() {
    const n = cart.count();
    bar.replaceChildren(n > 0
      ? h('a', { class: 'btn big cartbtn', href: '#/cart' },
          h('span', {}, `🛒 Sepeti gör · ${n} adet →`),
          h('small', {}, cart.all().map((l) => `${l.qty} ${l.name}`).join(', ')))
      : '');
    bar.style.display = n > 0 ? '' : 'none';
  }

  // "Her zamanki": bu kişinin son (iptal edilmemiş) siparişini tek dokunuşla sepete koyar.
  function renderUsual() {
    usual.replaceChildren();
    if (!lastOrder || !loaded || !isOpen()) return;
    const lines = [];
    for (const it of lastOrder.items || []) {
      const d = drinks.find((x) => x.id === it.drinkId && x.active !== false);
      if (!d) continue; // menüden kalkmış ya da pasif içecek atlanır
      const choices = Array.isArray(d.optionChoices) ? d.optionChoices : [];
      const option = choices.length ? (choices.includes(it.option) ? it.option : choices[0]) : '';
      lines.push({ d, option, qty: Math.max(1, Math.min(store.MAX_QTY, Number(it.qty) || 1)) });
    }
    if (!lines.length) return;
    const text = lines.map((l) => `${l.qty} × ${l.d.name}${l.option ? ` (${l.option})` : ''}`).join(', ');
    usual.append(h('button', {
      class: 'btn big alt usual',
      onclick: () => { lines.forEach((l) => cart.add(l.d, l.option, l.qty)); location.hash = '#/cart'; }
    }, h('span', {}, '🔁 Her zamanki'), h('small', {}, text)));
  }

  // Devam eden siparişlerin durumu (menüden ayrılmadan görünsün)
  function renderStrips(open) {
    strips.replaceChildren(...open.slice(0, 3).map((o) => h('a', { class: `status-strip s-${o.status}`, href: '#/my' },
      h('b', {}, `#${o.number} · ${CUSTOMER_LABEL[o.status]}`),
      h('span', {}, (o.items || []).map((i) => `${i.qty} ${i.name}`).join(', ')))));
  }

  function renderBanner() {
    banner.replaceChildren(isOpen() ? '' : h('div', { class: 'alert warn' }, '⛔ Şu anda sipariş alınmıyor.'));
  }

  function renderGrid() {
    if (!loaded) { grid.replaceChildren(h('div', { class: 'spinner' }, 'Menü yükleniyor…')); return; }
    const list = sortDrinks(drinks.filter((d) => (d.category || 'Diğer') === cat));
    if (!list.length) { grid.replaceChildren(h('div', { class: 'empty' }, 'Menüde içecek yok.')); return; }
    grid.replaceChildren(...list.map(drinkCard));
  }

  function drinkCard(d) {
    const avail = d.active !== false && isOpen();
    const hasOpt = Array.isArray(d.optionChoices) && d.optionChoices.length > 0;
    const qty = cart.qtyOf(d.id);
    let action;
    if (!avail) {
      action = h('button', { class: 'btn sm ghost', disabled: true, style: { width: '100%' } }, d.active === false ? 'Şu an yok' : 'Kapalı');
    } else if (hasOpt) {
      action = h('button', { class: 'btn sm', style: { width: '100%', minHeight: '46px' }, onclick: () => openSheet(d) }, qty ? 'Seçenek / ekle' : 'Seç');
    } else if (qty === 0) {
      action = h('button', {
        class: 'btn sm', style: { width: '100%', minHeight: '46px' },
        onclick: () => { cart.add(d, '', 1); refresh(); }
      }, '+ Ekle');
    } else {
      const key = lineKey(d.id, '');
      action = h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Azalt', onclick: () => { cart.setQty(key, qty - 1); refresh(); } }, '−'),
        h('span', {}, qty),
        h('button', { 'aria-label': 'Arttır', onclick: () => { cart.setQty(key, qty + 1); refresh(); } }, '+'));
    }
    return h('div', { class: 'drink' + (avail ? '' : ' off') },
      qty && hasOpt ? h('span', { class: 'badge' }, qty) : null,
      h('div', { class: 'pic' }, drinkArt(d, 84)),
      h('div', { class: 'name' }, d.name),
      d.description ? h('div', { class: 'desc' }, d.description) : null,
      h('div', { class: 'act' }, action));
  }

  function refresh() { renderGrid(); renderBar(); }

  function openSheet(d) {
    let opt = d.optionChoices[0];
    let q = 1;
    const optsBox = h('div', { class: 'opts' });
    const qtyEl = h('span', {}, q);
    const addBtn = h('button', { class: 'btn big' });
    const upd = () => {
      optsBox.replaceChildren(...d.optionChoices.map((c) => h('button', {
        class: 'opt' + (c === opt ? ' on' : ''), type: 'button', onclick: () => { opt = c; upd(); }
      }, c)));
      qtyEl.textContent = q;
      addBtn.textContent = `Sepete ekle · ${q} adet`;
    };
    addBtn.onclick = () => { cart.add(d, opt, q); close(); refresh(); toast(`${q} × ${d.name} sepete eklendi`, 'ok', 1500); };
    const body = h('div', { class: 'stack' },
      d.description ? h('div', { class: 'muted' }, d.description) : null,
      h('div', {}, h('div', { class: 'muted small', style: { marginBottom: '6px', fontWeight: 700 } }, d.optionLabel || 'Seçenek'), optsBox),
      h('div', { class: 'row between' },
        h('b', {}, 'Adet'),
        h('div', { class: 'stepper' },
          h('button', { onclick: () => { q = Math.max(1, q - 1); upd(); } }, '−'), qtyEl,
          h('button', { onclick: () => { q = Math.min(store.MAX_QTY, q + 1); upd(); } }, '+'))),
      addBtn);
    const close = modal(`${d.icon || '☕'} ${d.name}`, body);
    upd();
  }

  const unsubDrinks = onSnapshot(collection(db, 'drinks'), (snap) => {
    drinks = snap.docs.map(dataOf);
    loaded = true;
    renderChips(); refresh(); renderUsual();
  }, errToast);
  const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (s) => {
    settings = s.data() || {};
    renderBanner(); refresh(); renderUsual();
  }, () => {});
  const uid = session.user && session.user.uid;
  const unsubLast = uid
    ? onSnapshot(query(collection(db, 'orders'), where('ownerUid', '==', uid)), (snap) => {
        const mine = snap.docs.map(dataOf).filter((o) => o.status !== 'cancelled'
          && (id.type === 'user' ? o.userId === id.userId : o.customerType === 'guest' && o.name === id.name));
        mine.sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()));
        lastOrder = mine[0] || null;
        renderUsual();
        renderStrips(mine.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).reverse());
      }, () => {})
    : () => {};

  renderChips(); renderBanner(); refresh();
  return () => { unsubDrinks(); unsubSettings(); unsubPhoto(); unsubLast(); bar.remove(); };
}

// ============================================================
//  SEPET + ONAY
// ============================================================
export function cartView(main, _args, ctx) {
  const id = store.getIdentity();
  if (!id) { location.replace('#/who'); return; }
  if (cart.count() === 0) { location.replace('#/order'); return; }
  ctx.setTitle('Sepetim', '#/order');

  let open = true;
  const linesBox = h('div', { class: 'card' });
  const note = h('textarea', { class: 'input', maxlength: '300', placeholder: 'Örn: Sıcak olsun, odaya getirin… (isteğe bağlı)' });
  const alertBox = h('div');
  const confirmBtn = h('button', { class: 'btn big ok' }, '✔ Siparişi onayla');

  function renderLines() {
    if (cart.count() === 0) { location.replace('#/order'); return; }
    linesBox.replaceChildren(...cart.all().map((l) => h('div', { class: 'line' },
      h('div', { class: 'ico' }, drinkArt({ name: l.name, icon: l.icon, category: l.category }, 44)),
      h('div', { class: 'txt' }, h('b', {}, l.name), l.option ? h('span', {}, `${l.optionLabel ? l.optionLabel + ': ' : ''}${l.option}`) : null),
      h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Azalt', onclick: () => { cart.setQty(l.key, l.qty - 1); renderLines(); } }, l.qty === 1 ? '🗑' : '−'),
        h('span', {}, l.qty),
        h('button', { 'aria-label': 'Arttır', onclick: () => { cart.setQty(l.key, l.qty + 1); renderLines(); } }, '+')))));
  }

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Gönderiliyor…';
    try {
      const items = cart.all().map((l) => ({
        drinkId: l.drinkId, name: l.name, option: l.option, optionLabel: l.optionLabel, qty: l.qty
      }));
      const res = await placeOrder({ identity: id, items, note: note.value.trim() });
      cart.clear();
      location.hash = `#/done/${res.id}`;
    } catch (e) {
      console.error(e);
      confirmBtn.disabled = false;
      confirmBtn.textContent = '✔ Siparişi onayla';
      alertBox.replaceChildren(h('div', { class: 'alert err' },
        e.code === 'permission-denied'
          ? 'Sipariş gönderilemedi. Sipariş alımı kapatılmış olabilir; lütfen daha sonra tekrar deneyin.'
          : 'Sipariş gönderilemedi: ' + (e.message || e.code)));
    }
  };

  main.append(
    h('div', { class: 'muted', style: { marginBottom: '8px' } }, 'Sipariş sahibi: ', h('b', {}, id.name)),
    linesBox,
    h('label', { class: 'field', style: { margin: '14px 0' } }, 'Not', note),
    alertBox,
    confirmBtn,
    h('a', { class: 'btn big ghost', style: { marginTop: '10px' }, href: '#/order' }, '+ Başka içecek ekle')
  );
  renderLines();
  return () => { open = false; };
}

// ============================================================
//  SİPARİŞ ALINDI
// ============================================================
export function doneView(main, [orderId], ctx) {
  ctx.setTitle('Sipariş alındı', null);
  const box = h('div', { class: 'success' }, h('div', { class: 'spinner' }, 'Yükleniyor…'));
  const wa = h('div');
  let waNo = '';
  let lastO = null;
  const paintWa = () => {
    if (!waNo || !lastO) { wa.replaceChildren(); return; }
    const o = lastO;
    const txt = `Merhaba, #${o.number} numaralı siparişim (${o.name}): ` +
      o.items.map((i) => `${i.qty} ${i.name}${i.option ? ' (' + i.option + ')' : ''}`).join(', ') +
      (o.note ? `. Not: ${o.note}` : '');
    wa.replaceChildren(h('a', { class: 'btn big ghost', target: '_blank', rel: 'noopener',
      href: `https://wa.me/${waNo}?text=${encodeURIComponent(txt)}` }, '💬 Çay ocağına WhatsApp ile haber ver'));
  };
  const unsubSet = onSnapshot(doc(db, 'settings', 'app'), (s) => {
    waNo = String((s.data() || {}).whatsapp || '').replace(/\D/g, ''); paintWa();
  }, () => {});
  main.append(box,
    h('div', { class: 'stack' },
      h('a', { class: 'btn big', href: '#/my' }, '🧾 Siparişimi takip et'),
      h('a', { class: 'btn big alt', href: '#/order' }, '☕ Yeni sipariş ver'),
      h('a', { class: 'btn big ghost', href: '#/' }, 'Ana ekran'),
      wa));
  const unsubOrder = onSnapshot(doc(db, 'orders', orderId), (s) => {
    if (!s.exists()) { box.replaceChildren(h('div', { class: 'alert err' }, 'Sipariş bulunamadı.')); return; }
    const o = dataOf(s);
    lastO = o; paintWa();
    box.replaceChildren(
      h('div', { class: 'check' }, '✅'),
      h('h2', {}, 'Siparişiniz alındı!'),
      h('div', { class: 'muted' }, 'Sipariş numaranız'),
      h('div', { class: 'num' }, '#' + o.number),
      h('div', {}, h('span', { class: `status s-${o.status}` }, CUSTOMER_LABEL[o.status])),
      h('ul', { class: 'items', style: { textAlign: 'left', maxWidth: '320px', margin: '16px auto 0' } },
        o.items.map((i) => h('li', {}, h('b', {}, `${i.qty}×`), ' ', i.name, i.option ? h('span', { class: 'opt-txt' }, ` (${i.option})`) : null))));
  }, errToast);
  return () => { unsubOrder(); unsubSet(); };
}

// ============================================================
//  SİPARİŞLERİM
// ============================================================
export function myOrdersView(main, _args, ctx) {
  ctx.setTitle('Siparişlerim', '#/');
  const list = h('div', { class: 'stack' }, h('div', { class: 'spinner' }, 'Yükleniyor…'));
  main.append(list, h('a', { class: 'btn big', style: { marginTop: '16px' }, href: '#/order' }, '☕ Yeni sipariş ver'));
  const uid = session.user && session.user.uid;
  if (!uid) { list.replaceChildren(h('div', { class: 'empty' }, 'Oturum açılamadı.')); return; }

  return onSnapshot(query(collection(db, 'orders'), where('ownerUid', '==', uid)), (snap) => {
    const orders = snap.docs.map(dataOf)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()))
      .slice(0, 30);
    if (!orders.length) { list.replaceChildren(h('div', { class: 'empty' }, 'Henüz siparişiniz yok.')); return; }
    list.replaceChildren(...orders.map((o) => h('article', { class: `order s-${o.status}` },
      h('div', { class: 'order-top' },
        h('span', { class: 'order-no' }, '#' + o.number),
        h('span', { class: `status s-${o.status}` }, CUSTOMER_LABEL[o.status]),
        h('span', { class: 'order-time' }, `${o.dayKey.split('-').reverse().join('.')} ${fmtTime(o.createdAt)}`)),
      h('ul', { class: 'items' }, o.items.map((i) => h('li', {}, h('b', {}, `${i.qty}×`), ' ', i.name,
        i.option ? h('span', { class: 'opt-txt' }, ` (${i.option})`) : null))),
      o.note ? h('div', { class: 'note' }, '📝 ' + o.note) : null,
      o.status === 'new'
        ? h('div', { class: 'actions' }, h('button', {
            class: 'btn sm danger',
            onclick: async () => {
              if (!confirm('Siparişi iptal etmek istiyor musunuz?')) return;
              try { await cancelOwnOrder(o.id); toast('Sipariş iptal edildi', 'ok'); } catch (e) {
                toast('İptal edilemedi. Sipariş hazırlanmaya başlamış olabilir.', 'err', 5000);
              }
            }
          }, 'Siparişi iptal et'))
        : null)));
  }, errToast);
}

// ============================================================
//  "Siparişiniz hazır" uyarısı (her müşteri sayfasında, uygulama açıkken)
// ============================================================
export function startReadyWatcher() {
  const uid = session.user && session.user.uid;
  if (!uid) return () => {};
  let prev = null;
  const stopOrders = onSnapshot(query(collection(db, 'orders'), where('ownerUid', '==', uid)), (snap) => {
    const cur = {};
    snap.docs.forEach((d) => { cur[d.id] = d.data().status; });
    if (prev) {
      for (const d of snap.docs) {
        if (cur[d.id] === 'ready' && prev[d.id] && prev[d.id] !== 'ready') {
          toast(`🍵 #${d.data().number} numaralı siparişiniz servis ediliyor!`, 'ok', 9000);
          beep();
        }
      }
    }
    prev = cur;
  }, () => {});

  // Personel çağrısı yanıtlanınca (açık → ilgilenildi) haber ver
  let prevCall = null;
  const stopCall = onSnapshot(doc(db, 'calls', uid), (s) => {
    const st = s.exists() ? s.data().status : null;
    if (prevCall === 'open' && st === 'done') {
      toast(h('span', {}, redBell(22, true), ' Personel ilgileniyor'), 'ok', 7000);
      beep();
    }
    prevCall = st;
  }, () => {});

  return () => { stopOrders(); stopCall(); };
}
