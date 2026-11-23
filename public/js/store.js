// Cihazda saklanan kimlik ve sepet.
const ID_KEY = 'cay.identity';
const CART_KEY = 'cay.cart';

export function getIdentity() {
  try { return JSON.parse(localStorage.getItem(ID_KEY)); } catch { return null; }
}
export function setIdentity(identity) { localStorage.setItem(ID_KEY, JSON.stringify(identity)); }
export function clearIdentity() { localStorage.removeItem(ID_KEY); }

let lines = [];
try { lines = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]'); } catch { lines = []; }
const save = () => { try { sessionStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* yoksay */ } };

export const MAX_QTY = 20;
export const lineKey = (drinkId, option) => `${drinkId}|${option || ''}`;

export const cart = {
  all: () => lines,
  count: () => lines.reduce((a, l) => a + l.qty, 0),
  qtyOf: (drinkId) => lines.filter((l) => l.drinkId === drinkId).reduce((a, l) => a + l.qty, 0),
  add(drink, option = '', qty = 1) {
    const key = lineKey(drink.id, option);
    const l = lines.find((x) => x.key === key);
    if (l) l.qty = Math.min(MAX_QTY, l.qty + qty);
    else lines.push({
      key, drinkId: drink.id, name: drink.name, icon: drink.icon || '',
      option: option || '', optionLabel: drink.optionLabel || '', qty: Math.min(MAX_QTY, qty)
    });
    save();
  },
  setQty(key, qty) {
    const l = lines.find((x) => x.key === key);
    if (!l) return;
    if (qty <= 0) lines = lines.filter((x) => x.key !== key);
    else l.qty = Math.min(MAX_QTY, qty);
    save();
  },
  clear() { lines = []; save(); }
};
