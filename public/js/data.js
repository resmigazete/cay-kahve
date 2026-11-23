// Ortak veri yardımcıları: durumlar, varsayılan menü, sipariş oluşturma / güncelleme.
import {
  auth, db, collection, doc, runTransaction, serverTimestamp, updateDoc
} from './firebase.js';
import { dayKey } from './util.js';

export const STATUS = {
  new: { label: 'Yeni sipariş', short: 'Yeni', action: 'Yeni sipariş' },
  preparing: { label: 'Hazırlanıyor', short: 'Hazırlanıyor', action: 'Hazırlamaya başla' },
  ready: { label: 'Hazır', short: 'Hazır', action: 'Hazır' },
  delivered: { label: 'Teslim edildi', short: 'Teslim', action: 'Teslim edildi' },
  cancelled: { label: 'İptal edildi', short: 'İptal', action: 'İptal et' }
};
export const FLOW = ['new', 'preparing', 'ready', 'delivered'];
export const OPEN_STATUSES = ['new', 'preparing', 'ready'];

export const dataOf = (snap) => ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) });

export const CATEGORY_ORDER = ['Çay', 'Kahve', 'Diğer'];
export function categoryRank(c) {
  const i = CATEGORY_ORDER.indexOf(c);
  return i === -1 ? 99 : i;
}
export function sortDrinks(list) {
  return [...list].sort((a, b) =>
    categoryRank(a.category) - categoryRank(b.category) ||
    (a.order ?? 999) - (b.order ?? 999) ||
    String(a.name).localeCompare(String(b.name), 'tr'));
}

const SUGAR = { optionLabel: 'Şeker', optionChoices: ['Şekersiz', '1 şeker', '2 şeker', '3 şeker'] };

// Başlangıç menüsü (yönetici "Başlangıç menüsünü yükle" ile ekler)
export const DEFAULT_DRINKS = [
  { category: 'Çay', name: 'Açık çay', icon: '🍵', ...SUGAR },
  { category: 'Çay', name: 'Normal çay', icon: '🍵', ...SUGAR },
  { category: 'Çay', name: 'Demli çay', icon: '🍵', ...SUGAR },
  { category: 'Çay', name: 'Bardak çay', icon: '🍵', ...SUGAR },
  { category: 'Çay', name: 'Büyük bardak çay', icon: '🍵', ...SUGAR },
  { category: 'Kahve', name: 'Türk kahvesi', icon: '☕' },
  { category: 'Kahve', name: 'Sade Türk kahvesi', icon: '☕' },
  { category: 'Kahve', name: 'Az şekerli Türk kahvesi', icon: '☕' },
  { category: 'Kahve', name: 'Orta şekerli Türk kahvesi', icon: '☕' },
  { category: 'Kahve', name: 'Şekerli Türk kahvesi', icon: '☕' },
  { category: 'Kahve', name: 'Nescafe', icon: '☕', ...SUGAR },
  { category: 'Kahve', name: 'Sütlü Nescafe', icon: '🥛', ...SUGAR },
  { category: 'Kahve', name: 'Filtre kahve', icon: '☕', optionLabel: 'Tercih', optionChoices: ['Sade', 'Sütlü'] },
  { category: 'Diğer', name: 'Bitki çayı', icon: '🌿', optionLabel: 'Çeşit', optionChoices: ['Ihlamur', 'Adaçayı', 'Papatya', 'Kuşburnu'] },
  { category: 'Diğer', name: 'Yeşil çay', icon: '🍃' },
  { category: 'Diğer', name: 'Sıcak su', icon: '♨️' },
  { category: 'Diğer', name: 'Su', icon: '💧' }
];

// Sipariş oluştur: günlük sayaçla artan sipariş numarası (işlem içinde).
export async function placeOrder({ identity, items, note }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Oturum açılamadı');
  const key = dayKey();
  const counterRef = doc(db, 'counters', key);
  const orderRef = doc(collection(db, 'orders'));
  let number = 0;
  await runTransaction(db, async (tx) => {
    const c = await tx.get(counterRef);
    number = c.exists() ? (c.data().n || 0) + 1 : 1;
    tx.set(counterRef, { n: number });
    tx.set(orderRef, {
      number,
      dayKey: key,
      customerType: identity.type,
      userId: identity.type === 'user' ? identity.userId : '',
      name: identity.name,
      qrId: identity.qrId || '',
      qrName: identity.qrName || '',
      ownerUid: user.uid,
      items,
      note: note || '',
      status: 'new',
      createdAt: serverTimestamp(),
      times: {}
    });
  });
  return { id: orderRef.id, number };
}

export function setOrderStatus(orderId, status) {
  return updateDoc(doc(db, 'orders', orderId), {
    status,
    ['times.' + status]: serverTimestamp()
  });
}

// Sipariş sahibi: yalnızca "yeni" siparişini iptal edebilir (güvenlik kuralıyla da zorunlu).
export function cancelOwnOrder(orderId) {
  return setOrderStatus(orderId, 'cancelled');
}
