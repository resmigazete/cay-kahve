// Yönetim paneli: siparişler, menü, kişiler, QR kodlar, raporlar, ayarlar.
import {
  auth, db, session, ADMIN_EMAIL,
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where,
  serverTimestamp, writeBatch, signInWithEmailAndPassword, signOut
} from './firebase.js';
import {
  h, toast, modal, copyText, downloadBlob, loadScript, dayKey, addDays, fmtTime, fmtDay, fmtDayShort,
  minutesBetween, durText, toDate, beep, soundOn, setSound, unlockAudio
} from './util.js';
import {
  STATUS, FLOW, OPEN_STATUSES, dataOf, sortDrinks, categoryRank, DEFAULT_DRINKS, setOrderStatus
} from './data.js';
import { computeStats, itemsText, orderDrinkCount } from './stats.js';

const errToast = (e) => { console.error(e); toast('Hata: ' + (e.code || e.message), 'err', 5000); };
const baseUrl = () => location.href.split('#')[0];

export function adminView(main, [tab], ctx) {
  ctx.setTitle('Yönetim', '#/');
  ctx.wide(true);
  if (!session.isAdmin) return loginView(main);
  return panel(main, tab || 'orders');
}

// ============================================================
//  GİRİŞ
// ============================================================
function loginView(main) {
  const notAdmin = session.user && !session.user.isAnonymous;
  const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'E-posta', value: ADMIN_EMAIL });
  const pass = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Şifre', required: true });
  const msg = h('div');
  const btn = h('button', { class: 'btn big', type: 'submit' }, 'Giriş yap');

  const form = h('form', {
    class: 'stack', style: { maxWidth: '420px', margin: '20px auto' },
    onsubmit: async (e) => {
      e.preventDefault();
      unlockAudio();
      btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
      msg.replaceChildren();
      try {
        await signInWithEmailAndPassword(auth, (ADMIN_EMAIL || email.value).trim(), pass.value);
        // başarılı: oturum dinleyicisi paneli açar (yönetici değilse aşağıdaki uyarı görünür)
        setTimeout(() => {
          if (!session.isAdmin) {
            msg.replaceChildren(h('div', { class: 'alert err' }, 'Bu hesap yönetici olarak tanımlı değil. README\'deki "admins" adımına bakın.'));
            btn.disabled = false; btn.textContent = 'Giriş yap';
          }
        }, 2500);
      } catch (err) {
        console.error(err);
        const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(err.code);
        msg.replaceChildren(h('div', { class: 'alert err' }, bad ? 'E-posta veya şifre hatalı.' :
          err.code === 'auth/too-many-requests' ? 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.' :
          'Giriş yapılamadı: ' + (err.code || err.message)));
        btn.disabled = false; btn.textContent = 'Giriş yap';
      }
    }
  },
    h('div', { style: { textAlign: 'center', fontSize: '3rem' } }, '🔐'),
    h('h2', { style: { textAlign: 'center' } }, 'Yönetici girişi'),
    notAdmin ? h('div', { class: 'alert warn' }, 'Mevcut hesap yönetici değil. Farklı bir hesapla giriş yapın.') : null,
    ADMIN_EMAIL ? null : h('label', { class: 'field' }, 'E-posta', email),
    h('label', { class: 'field' }, 'Şifre', pass),
    msg, btn);
  main.append(form);
}

// ============================================================
//  PANEL
// ============================================================
const TABS = [
  ['orders', '🧾 Siparişler'], ['menu', '☕ Menü'], ['users', '👥 Kişiler'],
  ['qr', '🔳 QR Kodlar'], ['reports', '📊 Raporlar'], ['settings', '⚙️ Ayarlar']
];

function panel(main, startTab) {
  let current = TABS.some(([k]) => k === startTab) ? startTab : 'orders';
  let tabCleanup = null;
  let today = dayKey();
  let todayOrders = [];
  let unsubToday = null;
  let firstSnap = true;
  const subs = new Set();

  const tabsBar = h('div', { class: 'tabs' });
  const body = h('div');
  main.append(tabsBar, body);

  const P = {
    today: () => today,
    getToday: () => todayOrders,
    watchToday(cb) { subs.add(cb); return () => subs.delete(cb); }
  };

  function newCount() { return todayOrders.filter((o) => o.status === 'new').length; }

  function renderTabs() {
    const n = newCount();
    tabsBar.replaceChildren(...TABS.map(([k, label]) => h('button', {
      class: 'tab' + (k === current ? ' on' : ''),
      onclick: () => switchTab(k)
    }, label, k === 'orders' && n > 0 ? h('span', { class: 'cnt' }, n) : null)));
  }

  function switchTab(k) {
    current = k;
    history.replaceState(null, '', '#/admin/' + k);
    renderTabs();
    mountTab();
  }

  function mountTab() {
    if (tabCleanup) { try { tabCleanup(); } catch (e) { console.error(e); } tabCleanup = null; }
    body.replaceChildren();
    const fn = { orders: ordersTab, menu: menuTab, users: usersTab, qr: qrTab, reports: reportsTab, settings: settingsTab }[current];
    tabCleanup = fn(body, P) || null;
  }

  // Bugünün siparişlerini her zaman dinle (yeni sipariş sesi için)
  function startToday() {
    if (unsubToday) unsubToday();
    firstSnap = true;
    unsubToday = onSnapshot(query(collection(db, 'orders'), where('dayKey', '==', today)), (snap) => {
      todayOrders = snap.docs.map(dataOf);
      if (!firstSnap) {
        for (const ch of snap.docChanges()) {
          if (ch.type === 'added' && !ch.doc.metadata.hasPendingWrites) {
            const o = dataOf(ch.doc);
            if (o.status === 'new') {
              toast(`🔔 Yeni sipariş #${o.number} — ${o.name}`, 'new', 6000);
              if (soundOn()) beep();
            }
          }
        }
      }
      firstSnap = false;
      renderTabs();
      subs.forEach((f) => f(todayOrders));
    }, errToast);
  }

  // Gece yarısı geçişi
  const dayTimer = setInterval(() => {
    const k = dayKey();
    if (k !== today) { today = k; todayOrders = []; startToday(); subs.forEach((f) => f([])); }
  }, 60000);

  startToday();
  renderTabs();
  mountTab();

  return () => {
    clearInterval(dayTimer);
    if (unsubToday) unsubToday();
    if (tabCleanup) tabCleanup();
  };
}

// ============================================================
//  SİPARİŞLER
// ============================================================
function ordersTab(box, P) {
  let date = P.today();
  let filter = 'active';
  let orders = P.getToday();
  let unsub = null;
  let fresh = new Set();
  let seen = new Set(orders.map((o) => o.id));

  const dateInput = h('input', { class: 'input', type: 'date', value: date, max: P.today(),
    onchange: () => { date = dateInput.value || P.today(); subscribe(); } });
  const soundBtn = h('button', { class: 'btn sm ghost', onclick: () => {
    unlockAudio(); setSound(!soundOn()); paintSound();
    if (soundOn()) beep();
  } });
  const paintSound = () => { soundBtn.textContent = soundOn() ? '🔔 Ses açık' : '🔕 Ses kapalı'; };
  paintSound();
  const filters = h('div', { class: 'chips' });
  const list = h('div', { class: 'board' });

  box.append(
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn sm ghost', onclick: () => { date = P.today(); dateInput.value = date; subscribe(); } }, 'Bugün'),
      dateInput, soundBtn),
    filters, list);

  const FILTERS = [['active', 'Aktif'], ['new', 'Yeni'], ['preparing', 'Hazırlanıyor'], ['ready', 'Hazır'], ['delivered', 'Teslim'], ['cancelled', 'İptal'], ['all', 'Tümü']];

  function matches(o) {
    if (filter === 'all') return true;
    if (filter === 'active') return OPEN_STATUSES.includes(o.status);
    return o.status === filter;
  }

  function render() {
    filters.replaceChildren(...FILTERS.map(([k, label]) => {
      const n = orders.filter((o) => (k === 'all' ? true : k === 'active' ? OPEN_STATUSES.includes(o.status) : o.status === k)).length;
      return h('button', { class: 'chip' + (k === filter ? ' on' : ''), onclick: () => { filter = k; render(); } }, label, h('span', { class: 'n' }, n));
    }));
    const shown = orders.filter(matches).sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0, tb = b.createdAt?.toMillis?.() ?? 0;
      return filter === 'active' ? ta - tb : tb - ta;
    });
    list.replaceChildren(...(shown.length ? shown.map(orderCard) : [h('div', { class: 'empty' }, 'Bu görünümde sipariş yok.')]));
  }

  function orderCard(o) {
    const idx = FLOW.indexOf(o.status);
    const next = idx >= 0 ? FLOW[idx + 1] : null;
    const prep = minutesBetween(o.createdAt, o.times?.ready);
    const waiting = OPEN_STATUSES.includes(o.status) ? minutesBetween(o.createdAt, new Date()) : null;
    const go = (st) => async () => {
      try { await setOrderStatus(o.id, st); } catch (e) { errToast(e); }
    };
    return h('article', { class: `order s-${o.status}` + (fresh.has(o.id) ? ' fresh' : '') },
      h('div', { class: 'order-top' },
        h('span', { class: 'order-no' }, '#' + o.number),
        h('strong', {}, o.name),
        h('span', { class: 'tag ' + (o.customerType === 'guest' ? 'guest' : 'user') },
          o.customerType === 'guest' ? 'Misafir' + (o.qrName ? ` · ${o.qrName}` : '') : 'Sabit'),
        h('span', { class: 'order-time' }, fmtTime(o.createdAt))),
      h('ul', { class: 'items' }, (o.items || []).map((i) => h('li', {}, h('b', {}, `${i.qty} ×`), ' ', i.name,
        i.option ? h('span', { class: 'opt-txt' }, ` (${i.option})`) : null))),
      o.note ? h('div', { class: 'note' }, '📝 ' + o.note) : null,
      h('div', { class: 'meta' },
        h('span', { class: `status s-${o.status}` }, STATUS[o.status].label),
        waiting != null ? h('span', {}, `⏱ ${durText(waiting)} önce`) : null,
        prep != null && o.status !== 'cancelled' ? h('span', {}, `Hazırlık süresi: ${durText(prep)}`) : null),
      h('div', { class: 'actions' },
        next ? h('button', { class: 'btn next' + (next === 'ready' || next === 'delivered' ? ' ok' : ''), onclick: go(next) },
          next === 'preparing' ? '▶ Hazırlamaya başla' : next === 'ready' ? '✔ Hazır' : '📦 Teslim edildi') : null,
        ...Object.keys(STATUS).filter((s) => s !== o.status && s !== next).map((s) => h('button', {
          class: 'mini' + (s === 'cancelled' ? ' danger' : ''),
          onclick: s === 'cancelled'
            ? () => { if (confirm(`#${o.number} numaralı siparişi iptal etmek istiyor musunuz?`)) go('cancelled')(); }
            : go(s)
        }, STATUS[s].short))));
  }

  function setOrders(list) {
    // Yeni gelenleri kısa süre vurgula
    fresh = new Set(list.filter((o) => !seen.has(o.id) && seen.size > 0).map((o) => o.id));
    list.forEach((o) => seen.add(o.id));
    orders = list;
    render();
    if (fresh.size) setTimeout(() => { fresh = new Set(); }, 4000);
  }

  function subscribe() {
    if (unsub) { unsub(); unsub = null; }
    seen = new Set();
    if (date === P.today()) {
      orders = P.getToday(); seen = new Set(orders.map((o) => o.id)); render();
      unsub = P.watchToday(setOrders);
    } else {
      orders = []; render();
      unsub = onSnapshot(query(collection(db, 'orders'), where('dayKey', '==', date)), (snap) => {
        orders = snap.docs.map(dataOf); render();
      }, errToast);
    }
  }

  subscribe();
  const tick = setInterval(render, 30000); // geçen süreleri güncel tut
  return () => { clearInterval(tick); if (unsub) unsub(); };
}

// ============================================================
//  MENÜ
// ============================================================
function menuTab(box) {
  const list = h('div');
  let drinks = [];
  const head = h('div', { class: 'toolbar' },
    h('button', { class: 'btn', onclick: () => drinkForm(null, drinks) }, '+ Yeni içecek'));
  box.append(head, list);

  function render() {
    if (!drinks.length) {
      list.replaceChildren(h('div', { class: 'card stack' },
        h('p', { style: { margin: 0 } }, 'Menü boş. Başlangıç menüsünü (çay, kahve ve diğer içecekler) tek dokunuşla yükleyebilirsiniz.'),
        h('button', { class: 'btn', onclick: seed }, '⬇ Başlangıç menüsünü yükle')));
      return;
    }
    const cats = [...new Set(drinks.map((d) => d.category || 'Diğer'))].sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'tr'));
    list.replaceChildren(...cats.flatMap((c) => [
      h('div', { class: 'group-title' }, c),
      h('div', { class: 'list' }, sortDrinks(drinks.filter((d) => (d.category || 'Diğer') === c)).map(row))
    ]));
  }

  function row(d) {
    return h('div', { class: 'item-row' + (d.active === false ? ' off' : '') },
      h('div', { class: 'ico' }, d.imageUrl ? h('img', { src: d.imageUrl, alt: '' }) : (d.icon || '☕')),
      h('div', { class: 'txt' }, h('b', {}, d.name),
        h('span', { class: 'muted small' }, (d.optionChoices?.length ? `${d.optionLabel || 'Seçenek'}: ${d.optionChoices.join(', ')}` : 'Seçenek yok'))),
      h('label', { class: 'switch', title: 'Aktif / Pasif' },
        h('input', { type: 'checkbox', checked: d.active !== false, onchange: async (e) => {
          try { await updateDoc(doc(db, 'drinks', d.id), { active: e.target.checked }); } catch (err) { errToast(err); }
        } }), h('span', { class: 'slider' })),
      h('button', { class: 'icon-btn', 'aria-label': 'Düzenle', onclick: () => drinkForm(d, drinks) }, '✏️'),
      h('button', { class: 'icon-btn', 'aria-label': 'Sil', onclick: async () => {
        if (!confirm(`"${d.name}" menüden silinsin mi?\n(Geçici olarak kaldırmak için sağdaki anahtarla pasife alabilirsiniz.)`)) return;
        try { await deleteDoc(doc(db, 'drinks', d.id)); toast('Silindi', 'ok'); } catch (err) { errToast(err); }
      } }, '🗑'));
  }

  async function seed() {
    try {
      const batch = writeBatch(db);
      DEFAULT_DRINKS.forEach((d, i) => {
        batch.set(doc(collection(db, 'drinks')), {
          name: d.name, category: d.category, icon: d.icon || '', imageUrl: '', description: '',
          optionLabel: d.optionLabel || '', optionChoices: d.optionChoices || [], active: true, order: i + 1
        });
      });
      await batch.commit();
      toast('Başlangıç menüsü yüklendi', 'ok');
    } catch (e) { errToast(e); }
  }

  const unsub = onSnapshot(collection(db, 'drinks'), (snap) => { drinks = snap.docs.map(dataOf); render(); }, errToast);
  return unsub;
}

function drinkForm(d, all) {
  const isNew = !d;
  d = d || { active: true, category: 'Çay', icon: '☕', optionLabel: '', optionChoices: [] };
  const f = {
    name: h('input', { class: 'input', value: d.name || '', placeholder: 'Örn: Latte', required: true }),
    category: h('input', { class: 'input', value: d.category || '', list: 'cats', placeholder: 'Çay, Kahve, Diğer…' }),
    icon: h('input', { class: 'input', value: d.icon || '', placeholder: 'Emoji, örn: ☕', maxlength: '4' }),
    imageUrl: h('input', { class: 'input', value: d.imageUrl || '', placeholder: 'https://… (isteğe bağlı)' }),
    description: h('input', { class: 'input', value: d.description || '', placeholder: 'İsteğe bağlı açıklama' }),
    optionLabel: h('input', { class: 'input', value: d.optionLabel || '', placeholder: 'Örn: Şeker' }),
    optionChoices: h('input', { class: 'input', value: (d.optionChoices || []).join(', '), placeholder: 'Virgülle ayırın: Şekersiz, 1 şeker, 2 şeker' }),
    order: h('input', { class: 'input', type: 'number', value: d.order ?? (all.length + 1) }),
    active: h('input', { type: 'checkbox', checked: d.active !== false })
  };
  const cats = h('datalist', { id: 'cats' }, ['Çay', 'Kahve', 'Diğer', ...new Set(all.map((x) => x.category).filter(Boolean))].map((c) => h('option', { value: c })));
  const save = h('button', { class: 'btn big', type: 'submit' }, 'Kaydet');
  const form = h('form', {
    class: 'stack',
    onsubmit: async (e) => {
      e.preventDefault();
      const name = f.name.value.trim();
      if (!name) { toast('İçecek adı gerekli', 'err'); return; }
      const data = {
        name, category: f.category.value.trim() || 'Diğer', icon: f.icon.value.trim(), imageUrl: f.imageUrl.value.trim(),
        description: f.description.value.trim(), optionLabel: f.optionLabel.value.trim(),
        optionChoices: f.optionChoices.value.split(',').map((s) => s.trim()).filter(Boolean),
        order: Number(f.order.value) || 0, active: f.active.checked
      };
      if (data.optionChoices.length && !data.optionLabel) data.optionLabel = 'Seçenek';
      save.disabled = true;
      try {
        if (isNew) await addDoc(collection(db, 'drinks'), data); else await updateDoc(doc(db, 'drinks', d.id), data);
        close(); toast('Kaydedildi', 'ok');
      } catch (err) { save.disabled = false; errToast(err); }
    }
  },
    h('label', { class: 'field' }, 'İçecek adı', f.name),
    h('label', { class: 'field' }, 'Kategori', f.category, cats),
    h('div', { class: 'row' },
      h('label', { class: 'field grow' }, 'İkon (emoji)', f.icon),
      h('label', { class: 'field', style: { width: '110px' } }, 'Sıra', f.order)),
    h('label', { class: 'field' }, 'Görsel adresi (varsa ikonun yerine geçer)', f.imageUrl),
    h('label', { class: 'field' }, 'Açıklama', f.description),
    h('label', { class: 'field' }, 'Seçenek başlığı (örn: Şeker)', f.optionLabel),
    h('label', { class: 'field' }, 'Seçenekler', f.optionChoices),
    h('label', { class: 'row' }, h('span', { class: 'switch' }, f.active, h('span', { class: 'slider' })), h('b', {}, 'Aktif (siparişe açık)')),
    save);
  const close = modal(isNew ? 'Yeni içecek' : 'İçeceği düzenle', form);
}

// ============================================================
//  KİŞİLER
// ============================================================
function usersTab(box) {
  const nameInput = h('input', { class: 'input', placeholder: 'Yeni kişi adı', maxlength: '40' });
  const list = h('div', { class: 'list' });
  const add = async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    try { await addDoc(collection(db, 'users'), { name, createdAt: serverTimestamp() }); nameInput.value = ''; toast('Kişi eklendi', 'ok'); } catch (e) { errToast(e); }
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  box.append(
    h('p', { class: 'muted' }, 'Sabit kullanıcılar uygulamada kendi adlarını seçerek veya kişisel bağlantılarıyla sipariş verir.'),
    h('div', { class: 'toolbar' }, nameInput, h('button', { class: 'btn', onclick: add }, '+ Ekle')),
    list);

  return onSnapshot(collection(db, 'users'), (snap) => {
    const users = snap.docs.map(dataOf).sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
    list.replaceChildren(...(users.length ? users.map((u) => h('div', { class: 'item-row' },
      h('div', { class: 'ico' }, '👤'),
      h('div', { class: 'txt' }, h('b', {}, u.name), h('span', { class: 'linkbox' }, `${baseUrl()}#/u/${u.id}`)),
      h('button', { class: 'btn sm ghost', onclick: () => copyText(`${baseUrl()}#/u/${u.id}`) }, '🔗 Bağlantı'),
      h('button', { class: 'icon-btn', 'aria-label': 'Adı düzenle', onclick: () => renameUser(u) }, '✏️'),
      h('button', { class: 'icon-btn', 'aria-label': 'Sil', onclick: async () => {
        if (!confirm(`"${u.name}" silinsin mi? Geçmiş siparişleri raporlarda kalır.`)) return;
        try { await deleteDoc(doc(db, 'users', u.id)); toast('Silindi', 'ok'); } catch (e) { errToast(e); }
      } }, '🗑'))) : [h('div', { class: 'empty' }, 'Henüz kişi yok. Yukarıdan ekleyin (4-5 kişi).')]));
  }, errToast);
}

function renameUser(u) {
  const input = h('input', { class: 'input', value: u.name, maxlength: '40' });
  const form = h('form', {
    class: 'stack',
    onsubmit: async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      try { await updateDoc(doc(db, 'users', u.id), { name }); close(); toast('Güncellendi', 'ok'); } catch (err) { errToast(err); }
    }
  }, input, h('button', { class: 'btn big', type: 'submit' }, 'Kaydet'));
  const close = modal('Kişi adını düzenle', form);
  setTimeout(() => input.select(), 50);
}

// ============================================================
//  QR KODLAR
// ============================================================
function fitText(g, text, x, y, maxW, size, weight) {
  let s = size;
  do { g.font = `${weight} ${s}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`; s -= 2; } while (g.measureText(text).width > maxW && s > 12);
  g.fillText(text, x, y);
}

async function qrCanvas(url, label) {
  if (!window.QRCode) throw new Error('QR kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).');
  const W = 800, H = 980;
  const qr = document.createElement('canvas');
  await window.QRCode.toCanvas(qr, url, { width: 680, margin: 1, errorCorrectionLevel: 'M' });
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.drawImage(qr, (W - qr.width) / 2, 50);
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'İçecek Siparişi Vermek İçin Okutunuz', W / 2, 50 + qr.height + 70, 740, 46, 'bold');
  if (label) { g.fillStyle = '#555'; fitText(g, label, W / 2, 50 + qr.height + 140, 740, 34, 'normal'); }
  return c;
}

function qrTab(box) {
  const nameInput = h('input', { class: 'input', placeholder: 'Alan / oda adı (örn: Toplantı Odası)', maxlength: '40' });
  const grid = h('div', { class: 'qr-grid' });
  const create = async () => {
    const name = nameInput.value.trim();
    if (!name) { toast('Bir ad yazın (örn: Toplantı Odası)', 'err'); return; }
    try { await addDoc(collection(db, 'qrcodes'), { name, active: true, createdAt: serverTimestamp() }); nameInput.value = ''; toast('QR kod oluşturuldu', 'ok'); } catch (e) { errToast(e); }
  };
  box.append(
    h('p', { class: 'muted' }, 'Misafirler bu kodu okutarak doğrudan sipariş ekranına ulaşır. QR kod yönetim paneline erişim sağlamaz. Her oda/alan için ayrı kod oluşturabilirsiniz; siparişlerde hangi kodun kullanıldığı görünür.'),
    h('div', { class: 'toolbar' }, nameInput, h('button', { class: 'btn', onclick: create }, '+ QR kod oluştur')),
    grid);

  return onSnapshot(collection(db, 'qrcodes'), (snap) => {
    const qrs = snap.docs.map(dataOf).sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    grid.replaceChildren(...(qrs.length ? qrs.map(qrCard) : [h('div', { class: 'empty' }, 'Henüz QR kod yok. Yukarıdan oluşturun (örn: "Genel").')]));
  }, errToast);
}

function qrCard(q) {
  const url = `${baseUrl()}#/g/${q.id}`;
  const holder = h('div', {}, '…');
  qrCanvas(url, q.name).then((c) => { c.style.opacity = q.active === false ? '.4' : '1'; holder.replaceChildren(c); })
    .catch((e) => holder.replaceChildren(h('div', { class: 'alert err' }, e.message)));

  const getCanvas = () => qrCanvas(url, q.name);
  const safe = (q.name || 'qr').replace(/[^\p{L}\p{N}]+/gu, '-');
  return h('div', { class: 'card qr-card' },
    h('b', {}, q.name),
    holder,
    h('div', { class: 'linkbox' }, url),
    h('div', { class: 'row', style: { justifyContent: 'center' } },
      h('button', { class: 'btn sm', onclick: async () => {
        try { const c = await getCanvas(); c.toBlob((b) => downloadBlob(b, `qr-${safe}.png`), 'image/png'); } catch (e) { errToast(e); }
      } }, '⬇ PNG indir'),
      h('button', { class: 'btn sm alt', onclick: async () => {
        try {
          const c = await getCanvas();
          const w = window.open('', '_blank');
          if (!w) { toast('Açılır pencere engellendi. PNG indirip yazdırabilirsiniz.', 'err', 5000); return; }
          w.document.write(`<!doctype html><title>${q.name}</title><style>@page{margin:12mm}body{margin:0;text-align:center}img{max-width:100%;max-height:96vh}</style><img src="${c.toDataURL('image/png')}" onload="setTimeout(function(){window.print()},200)">`);
          w.document.close();
        } catch (e) { errToast(e); }
      } }, '🖨 Yazdır'),
      h('button', { class: 'btn sm ghost', onclick: () => copyText(url) }, '🔗 Kopyala')),
    h('div', { class: 'row', style: { justifyContent: 'center' } },
      h('label', { class: 'row' }, h('span', { class: 'switch' },
        h('input', { type: 'checkbox', checked: q.active !== false, onchange: async (e) => {
          try { await updateDoc(doc(db, 'qrcodes', q.id), { active: e.target.checked }); } catch (err) { errToast(err); }
        } }), h('span', { class: 'slider' })), h('span', { class: 'small' }, 'Aktif')),
      h('button', { class: 'mini danger', onclick: async () => {
        if (!confirm(`"${q.name}" QR kodu silinsin mi? Basılı kodlar çalışmaz.`)) return;
        try { await deleteDoc(doc(db, 'qrcodes', q.id)); } catch (e) { errToast(e); }
      } }, 'Sil')));
}

// ============================================================
//  RAPORLAR
// ============================================================
function reportsTab(box, P) {
  let from = addDays(P.today(), -6);
  let to = P.today();
  let orders = [];
  let stats = null;

  const fromEl = h('input', { class: 'input', type: 'date', value: from });
  const toEl = h('input', { class: 'input', type: 'date', value: to });
  const out = h('div');
  const exportBtn = h('button', { class: 'btn sm', disabled: true, onclick: () => exportExcel(orders, stats, from, to) }, '⬇ Excel\'e aktar');
  const preset = (label, f, t) => h('button', { class: 'btn sm ghost', onclick: () => { fromEl.value = f(); toEl.value = t(); load(); } }, label);

  box.append(
    h('div', { class: 'toolbar' },
      preset('Bugün', () => P.today(), () => P.today()),
      preset('Son 7 gün', () => addDays(P.today(), -6), () => P.today()),
      preset('Son 30 gün', () => addDays(P.today(), -29), () => P.today()),
      fromEl, h('span', {}, '–'), toEl,
      h('button', { class: 'btn sm', onclick: () => load() }, 'Göster'), exportBtn),
    out);

  async function load() {
    from = fromEl.value || from; to = toEl.value || to;
    if (from > to) [from, to] = [to, from];
    out.replaceChildren(h('div', { class: 'spinner' }, 'Hesaplanıyor…'));
    try {
      const snap = await getDocs(query(collection(db, 'orders'), where('dayKey', '>=', from), where('dayKey', '<=', to)));
      orders = snap.docs.map(dataOf);
      stats = computeStats(orders);
      exportBtn.disabled = false;
      render();
    } catch (e) { errToast(e); out.replaceChildren(h('div', { class: 'alert err' }, 'Rapor yüklenemedi.')); }
  }

  function bars(rows, key, labelKey, unit) {
    const max = Math.max(1, ...rows.map((r) => r[key]));
    return rows.length
      ? rows.map((r) => h('div', { class: 'bar-row' }, h('span', {}, r[labelKey]), h('b', {}, `${r[key]}${unit || ''}`),
          h('div', { class: 'bar' }, h('i', { style: { width: `${(r[key] / max) * 100}%` } }))))
      : [h('div', { class: 'muted' }, 'Veri yok')];
  }

  function render() {
    const s = stats;
    const kpi = (v, l) => h('div', { class: 'kpi' }, h('b', {}, v), h('span', {}, l));
    out.replaceChildren(
      h('div', { class: 'muted' }, `${fmtDayShort(from)} – ${fmtDayShort(to)} arası (iptal edilenler hariç)`),
      h('div', { class: 'kpis' },
        kpi(s.totalOrders, 'Toplam sipariş'), kpi(s.totalDrinks, 'Toplam içecek'),
        kpi(s.guests.orders, 'Misafir siparişi'), kpi(s.cancelled, 'İptal edilen'),
        kpi(s.avgPrepMin == null ? '—' : durText(s.avgPrepMin), 'Ort. hazırlık süresi')),
      h('div', { class: 'reports' },
        h('div', { class: 'card' }, h('h3', {}, '🏆 En çok tercih edilen içecekler'), ...bars(s.byDrink.slice(0, 5), 'qty', 'name', ' adet')),
        h('div', { class: 'card' }, h('h3', {}, '☕ İçecek türüne göre'), ...bars(s.byDrink, 'qty', 'name', ' adet')),
        h('div', { class: 'card' }, h('h3', {}, '👤 Kişi bazında sipariş'), ...bars(s.byPerson, 'orders', 'name', ' sipariş')),
        h('div', { class: 'card' }, h('h3', {}, '📅 Haftalık dağılım'), ...bars(s.weekday, 'orders', 'name', ' sipariş')),
        h('div', { class: 'card' }, h('h3', {}, '🗓 Günlük toplam sipariş'),
          s.byDay.length ? h('table', { class: 't' },
            h('tr', {}, h('th', {}, 'Gün'), h('th', {}, 'Sipariş'), h('th', {}, 'İçecek')),
            ...s.byDay.map((d) => h('tr', {}, h('td', {}, fmtDayShort(d.day)), h('td', {}, d.orders), h('td', {}, d.drinks)))) : h('div', { class: 'muted' }, 'Veri yok')),
        h('div', { class: 'card' }, h('h3', {}, '🧾 Sipariş geçmişi'),
          orders.length ? h('table', { class: 't' },
            h('tr', {}, h('th', {}, 'Gün / Saat'), h('th', {}, 'Kişi'), h('th', {}, 'Durum')),
            ...[...orders].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)).slice(0, 100).map((o) =>
              h('tr', {}, h('td', {}, `${fmtDayShort(o.dayKey)} ${fmtTime(o.createdAt)}`), h('td', {}, `#${o.number} ${o.name}`), h('td', {}, STATUS[o.status].short)))) : h('div', { class: 'muted' }, 'Veri yok'),
          orders.length > 100 ? h('div', { class: 'muted small' }, 'İlk 100 sipariş gösteriliyor; tamamı Excel\'de.') : null)));
  }

  load();
}

async function exportExcel(orders, stats, from, to) {
  const detail = [...orders].sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)).map((o) => ({
    'Tarih': o.dayKey, 'Saat': fmtTime(o.createdAt), 'Sipariş No': o.number, 'Kişi': o.name,
    'Tür': o.customerType === 'guest' ? 'Misafir' : 'Sabit kullanıcı', 'QR / Alan': o.qrName || '',
    'İçecekler': itemsText(o), 'Toplam adet': orderDrinkCount(o), 'Not': o.note || '', 'Durum': STATUS[o.status].label,
    'Hazırlık süresi (dk)': minutesBetween(o.createdAt, o.times?.ready) ?? ''
  }));
  const sheets = {
    'Siparişler': detail,
    'Kişi bazında': stats.byPerson.map((p) => ({ 'Kişi': p.name, 'Sipariş': p.orders, 'İçecek adedi': p.drinks })),
    'İçecekler': stats.byDrink.map((d) => ({ 'İçecek': d.name, 'Adet': d.qty })),
    'Günlük': stats.byDay.map((d) => ({ 'Gün': d.day, 'Sipariş': d.orders, 'İçecek adedi': d.drinks })),
    'Haftalık dağılım': stats.weekday.map((w) => ({ 'Gün': w.name, 'Sipariş': w.orders, 'İçecek adedi': w.drinks }))
  };
  const fname = `siparis-raporu_${from}_${to}`;
  try {
    if (!window.XLSX) await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const wb = window.XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Veri': 'yok' }]), name);
    }
    window.XLSX.writeFile(wb, `${fname}.xlsx`);
  } catch (e) {
    // Yedek: Excel'in açabildiği CSV (UTF-8 BOM, noktalı virgül)
    console.warn(e);
    const cols = Object.keys(detail[0] || { Veri: '' });
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols.map(esc).join(';'), ...detail.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${fname}.csv`);
    toast('Excel kütüphanesi yüklenemedi; CSV olarak indirildi.', '', 4500);
  }
}

// ============================================================
//  AYARLAR
// ============================================================
function settingsTab(box, P) {
  let settings = {};
  const openSwitch = h('input', { type: 'checkbox', onchange: async (e) => {
    try { await setDoc(doc(db, 'settings', 'app'), { orderingOpen: e.target.checked }, { merge: true }); } catch (err) { errToast(err); e.target.checked = !e.target.checked; }
  } });
  const soundSwitch = h('input', { type: 'checkbox', checked: soundOn(), onchange: (e) => {
    unlockAudio(); setSound(e.target.checked); if (e.target.checked) beep();
  } });

  const rowSwitch = (input, title, sub) => h('div', { class: 'item-row' },
    h('div', { class: 'txt' }, h('b', {}, title), h('span', { class: 'muted small' }, sub)),
    h('label', { class: 'switch' }, input, h('span', { class: 'slider' })));

  box.append(h('div', { class: 'stack', style: { maxWidth: '640px' } },
    rowSwitch(openSwitch, 'Sipariş alımı açık', 'Kapalıyken kimse sipariş veremez (ör. mesai dışı).'),
    rowSwitch(soundSwitch, 'Yeni sipariş sesli uyarısı', 'Bu cihazda geçerlidir. Sayfayı yeniledikten sonra sesin çalması için ekrana bir kez dokunun.'),
    h('div', { class: 'card stack' },
      h('b', {}, '🌙 Gün sonu'),
      h('p', { class: 'muted small', style: { margin: 0 } }, 'Siparişler gün bazında otomatik arşivlenir ve Siparişler / Raporlar sekmesinden tarihe göre incelenir. İsterseniz bugünden kalan açık (yeni, hazırlanıyor, hazır) siparişleri tek seferde "Teslim edildi" yapabilirsiniz.'),
      h('button', { class: 'btn alt', onclick: async () => {
        const open = P.getToday().filter((o) => OPEN_STATUSES.includes(o.status));
        if (!open.length) { toast('Açık sipariş yok', 'ok'); return; }
        if (!confirm(`${open.length} açık sipariş "Teslim edildi" olarak kapatılsın mı?`)) return;
        try {
          const batch = writeBatch(db);
          open.forEach((o) => batch.update(doc(db, 'orders', o.id), { status: 'delivered', 'times.delivered': serverTimestamp() }));
          await batch.commit();
          toast('Gün sonu tamamlandı', 'ok');
        } catch (e) { errToast(e); }
      } }, 'Açık siparişleri kapat')),
    h('div', { class: 'card stack' },
      h('b', {}, '👤 Oturum'),
      h('div', { class: 'muted small' }, session.user && session.user.email ? session.user.email : ''),
      h('button', { class: 'btn danger', onclick: async () => { try { await signOut(auth); } catch (e) { errToast(e); } } }, 'Çıkış yap'))));

  return onSnapshot(doc(db, 'settings', 'app'), (s) => {
    settings = s.data() || {};
    openSwitch.checked = settings.orderingOpen !== false;
  }, errToast);
}
