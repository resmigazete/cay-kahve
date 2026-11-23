// Raporlama hesapları (saf fonksiyonlar, DOM'a bağlı değil).
export const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export function weekdayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7; // Pzt = 0
}

function ms(v) {
  if (!v) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  return null;
}

export function orderDrinkCount(o) {
  return (o.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0);
}

export function computeStats(orders) {
  const valid = orders.filter((o) => o.status !== 'cancelled');
  const stats = {
    totalOrders: valid.length,
    cancelled: orders.length - valid.length,
    totalDrinks: 0,
    guests: { orders: 0, drinks: 0 },
    byDay: [],
    byPerson: [],
    byDrink: [],
    weekday: WEEKDAYS.map((name) => ({ name, orders: 0, drinks: 0 })),
    avgPrepMin: null
  };
  const day = new Map();
  const person = new Map();
  const drink = new Map();
  let prepSum = 0, prepN = 0;

  for (const o of valid) {
    const n = orderDrinkCount(o);
    stats.totalDrinks += n;

    const dRow = day.get(o.dayKey) || { day: o.dayKey, orders: 0, drinks: 0 };
    dRow.orders += 1; dRow.drinks += n;
    day.set(o.dayKey, dRow);

    const isGuest = o.customerType === 'guest';
    const pKey = isGuest ? '__guest__' : (o.userId || o.name);
    const pRow = person.get(pKey) || { name: isGuest ? 'Misafirler (toplam)' : o.name, guest: isGuest, orders: 0, drinks: 0 };
    pRow.orders += 1; pRow.drinks += n;
    person.set(pKey, pRow);
    if (isGuest) { stats.guests.orders += 1; stats.guests.drinks += n; }

    for (const it of o.items || []) {
      drink.set(it.name, (drink.get(it.name) || 0) + (Number(it.qty) || 0));
    }

    const w = stats.weekday[weekdayIndex(o.dayKey)];
    w.orders += 1; w.drinks += n;

    const c = ms(o.createdAt), r = ms(o.times && o.times.ready);
    if (c != null && r != null && r >= c) { prepSum += (r - c) / 60000; prepN += 1; }
  }

  stats.byDay = [...day.values()].sort((a, b) => a.day.localeCompare(b.day));
  stats.byPerson = [...person.values()].sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name, 'tr'));
  stats.byDrink = [...drink.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
  stats.avgPrepMin = prepN ? Math.round(prepSum / prepN) : null;
  return stats;
}

// Siparişin içeriğini tek satır metne çevirir ("2 × Normal çay (1 şeker), ...")
export function itemsText(o) {
  return (o.items || []).map((i) => `${i.qty} × ${i.name}${i.option ? ` (${i.option})` : ''}`).join(', ');
}
