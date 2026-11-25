// 2026 resmî tatil ve bayramlar (Sağlık Takvimi'ndeki kırmızı günler) ve arifeler.
// Satır biçimi: [başlangıçAy, başlangıçGün, bitişAy, bitişGün, 'Ad', arife?]
export const YEAR = 2026;

export const HOLIDAYS = [
  [1, 1, 1, 1, 'Yılbaşı'],
  [3, 19, 3, 19, 'Ramazan Bayramı Arifesi', 1],
  [3, 20, 3, 22, 'Ramazan Bayramı'],
  [4, 23, 4, 23, 'Ulusal Egemenlik ve Çocuk Bayramı'],
  [5, 1, 5, 1, 'Emek ve Dayanışma Günü'],
  [5, 19, 5, 19, 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı'],
  [5, 26, 5, 26, 'Kurban Bayramı Arifesi', 1],
  [5, 27, 5, 30, 'Kurban Bayramı'],
  [7, 15, 7, 15, 'Demokrasi ve Birlik Günü'],
  [8, 30, 8, 30, 'Zafer Bayramı'],
  [10, 29, 10, 29, 'Cumhuriyet Bayramı']
];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const key = (m, d) => m * 100 + d;

const ITEMS = HOLIDAYS.map(([m1, d1, m2, d2, name, arife]) => ({
  name, arife: !!arife, start: key(m1, d1), end: key(m2, d2),
  label: m1 === m2 && d1 === d2 ? `${d1} ${MONTHS[m1 - 1]}` : `${d1}-${d2} ${MONTHS[m1 - 1]}`
}));

// Verilen tarihte süren tatil/arife (yalnızca 2026'da)
export function today(date = new Date()) {
  if (date.getFullYear() !== YEAR) return [];
  const k = key(date.getMonth() + 1, date.getDate());
  return ITEMS.filter((i) => i.start <= k && k <= i.end);
}

// Önümüzdeki `days` gün içinde başlayacak tatiller (en fazla `max` adet)
export function upcoming(date = new Date(), days = 14, max = 2) {
  if (date.getFullYear() !== YEAR) return [];
  const k0 = key(date.getMonth() + 1, date.getDate());
  const limit = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const kl = limit.getFullYear() === YEAR ? key(limit.getMonth() + 1, limit.getDate()) : 1231;
  return ITEMS.filter((i) => i.start > k0 && i.start <= kl).slice(0, max);
}
