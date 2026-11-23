// İçecek illüstrasyonları: emoji yerine her cihazda aynı görünen, uygulamayla uyumlu SVG çizimler.
// İçecek adından otomatik seçilir; yönetici fotoğraf (imageUrl) yüklerse fotoğraf öncelikli olur.
import { h } from './util.js';

let seq = 0;
const OUT = '#8da6a2';      // cam / seramik kontur
const SAUCER = '#f4f8f7';
const SHADOW = '#e3ebe9';
const BRAND = '#0f766e';

const steam = (dx = 0, dy = 0, op = 0.9) =>
  `<g transform="translate(${dx} ${dy})" fill="none" stroke="#b7c7c4" stroke-width="2" stroke-linecap="round" opacity="${op}">` +
  '<path d="M25 10c-2.4-2.6 2.4-4.4 0-7.5"/><path d="M32 10c-2.4-2.6 2.4-4.4 0-7.5"/><path d="M39 10c-2.4-2.6 2.4-4.4 0-7.5"/></g>';

const saucer = (rx = 19, cy = 50) =>
  `<ellipse cx="32" cy="${cy + 1.6}" rx="${rx}" ry="4" fill="${SHADOW}"/>` +
  `<ellipse cx="32" cy="${cy}" rx="${rx}" ry="3.7" fill="${SAUCER}" stroke="#cdd9d6" stroke-width="1.2"/>`;

const handle = (d) =>
  `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="5.6" stroke-linecap="round"/>` +
  `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;

// İnce belli çay bardağı (açık / normal / demli, elma, sultan çayı)
const GLASS = 'M19 13H45C45 21 41 25 40 29C39.3 32.5 42 38 43 45Q43 47 41 47H23Q21 47 21 45C22 38 24.7 32.5 24 29C23 25 19 21 19 13Z';
function teaGlass(liquid, extra = '') {
  const id = 'dg' + (++seq);
  return steam() + saucer() +
    `<defs><clipPath id="${id}"><path d="${GLASS}"/></clipPath></defs>` +
    `<path d="${GLASS}" fill="#fff" fill-opacity=".7"/>` +
    `<g clip-path="url(#${id})"><rect x="15" y="19" width="34" height="30" fill="${liquid}"/><rect x="15" y="19" width="34" height="3" fill="#fff" fill-opacity=".28"/></g>` +
    `<path d="${GLASS}" fill="none" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    '<path d="M23.5 16c.4 5 3 8.2 4 12" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>' +
    extra;
}

const APPLE = '<g transform="translate(46 40)"><path d="M0 4C-4 4-6 8-4 12C-2 16 0 15 1 15C2 15 4 16 6 12C8 8 6 4 2 4C1 4 .5 5 0 4Z" fill="#d93b3b"/>' +
  '<path d="M1 4C1 1 2 0 4-1" stroke="#6b4a2b" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M2.5 1.5C5-1 8 0 8 0C8 0 6 3.5 2.5 1.5Z" fill="#5fa35b"/></g>';
const FLOWER = '<g transform="translate(47 43)" fill="#e85d8a"><circle cx="3.6" cy="0" r="3.2"/><circle cx="1.1" cy="3.4" r="3.2"/><circle cx="-2.9" cy="2.1" r="3.2"/><circle cx="-2.9" cy="-2.1" r="3.2"/><circle cx="1.1" cy="-3.4" r="3.2"/><circle r="2.1" fill="#f6c443"/></g>';

// Türk kahvesi fincanı
function turkishCoffee() {
  return steam(0, 14) + saucer(21, 51) + handle('M46.5 30c7-1.5 9.5 9 .5 11.5') +
    `<path d="M17 27h30c0 11-6 20-15 20S17 38 17 27Z" fill="#fff" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M18.2 35h27.6" stroke="${BRAND}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse cx="32" cy="27" rx="15" ry="3.6" fill="#4a2c1d" stroke="${OUT}" stroke-width="1.4"/><ellipse cx="32" cy="27.4" rx="11.5" ry="2.3" fill="#8b5a3a"/>`;
}

// Kupa (Nescafe, sütlü Nescafe, filtre kahve)
function mug(liquid) {
  return steam(-3, 10) + `<ellipse cx="29" cy="53" rx="17" ry="3" fill="${SHADOW}"/>` + handle('M41 29h3.5a6 6 0 0 1 0 12H41') +
    `<path d="M17 24h24v22a5 5 0 0 1-5 5H22a5 5 0 0 1-5-5Z" fill="#fff" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="18" y="35" width="22" height="5" fill="${BRAND}" opacity=".9"/>` +
    `<ellipse cx="29" cy="24" rx="12" ry="3.2" fill="${liquid}" stroke="${OUT}" stroke-width="1.4"/>`;
}

// Geniş fincan (bitki çayı, yeşil çay, sıcak su)
function cup(liquid, leaf, strongSteam) {
  const lf = leaf
    ? `<g transform="translate(5 36)"><path d="M0 8C0 2 5-1 11-1C11 5 7 9 0 8Z" fill="${leaf}"/><path d="M1 7L9 1" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/></g>`
    : '';
  return steam(0, 13, strongSteam ? 1 : 0.85) + saucer(21, 51) + handle('M49.5 29c7-1.5 9.5 9 .5 11.5') +
    `<path d="M14 26h36c0 11-7 20-18 20S14 37 14 26Z" fill="#fff" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<ellipse cx="32" cy="26" rx="18" ry="4" fill="${liquid}" stroke="${OUT}" stroke-width="1.4"/>` + lf;
}

const DROP = '<path d="M32 8C32 8 17 25 17 38a15 15 0 0 0 30 0C47 25 32 8 32 8Z" fill="#4fb3e8" stroke="#2f8fc4" stroke-width="1.6" stroke-linejoin="round"/>' +
  '<path d="M24 38c0 5 3 9 7 10" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".75"/>';

const TEA = { light: '#f1bf63', normal: '#d9822b', strong: '#a0431a' };

function pick(d) {
  const n = String(d.name || '').toLocaleLowerCase('tr');
  const cat = String(d.category || '').toLocaleLowerCase('tr');
  if (/elma/.test(n)) return teaGlass('#e6a93c', APPLE);
  if (/sultan/.test(n)) return teaGlass('#b52a35', FLOWER);
  if (/türk kahvesi|turk kahvesi/.test(n)) return turkishCoffee();
  if (/nescafe|neskafe/.test(n)) return mug(/süt/.test(n) ? '#d1a679' : '#6b4226');
  if (/filtre/.test(n)) return mug('#5b3a29');
  if (/yeşil|yesil/.test(n)) return cup('#b7d36a', '#4f9a4a');
  if (/bitki|ihlamur|adaçay|adacay|papatya|kuşburnu|nane|zencefil|kekik|rezene/.test(n)) return cup('#d9b84a', '#5fa35b');
  if (/sıcak su/.test(n)) return cup('#d6edf6', '', true);
  if (/(^|\s)su$/.test(n)) return DROP;
  if (/demli/.test(n)) return teaGlass(TEA.strong);
  if (/açık|acik/.test(n)) return teaGlass(TEA.light);
  if (/çay|cay/.test(n)) return teaGlass(TEA.normal);
  if (/kahve/.test(n)) return mug('#6b4226');
  if (cat === 'çay') return teaGlass(TEA.normal);
  if (cat === 'kahve') return mug('#6b4226');
  return null;
}

// Fotoğraf varsa onu, yoksa içecek çizimini, o da yoksa emojiyi gösteren kare kutu.
export function drinkArt(d, px = 80) {
  const box = { width: px + 'px', height: px + 'px', borderRadius: Math.round(px * 0.28) + 'px' };
  if (d.imageUrl) return h('img', { class: 'art art-img', src: d.imageUrl, alt: d.name || '', loading: 'lazy', style: box });
  const svg = pick(d);
  const el = h('span', { class: 'art', role: 'img', 'aria-label': d.name || 'İçecek', style: box });
  if (svg) {
    const s = Math.round(px * 0.86);
    el.innerHTML = `<svg viewBox="4 1 56 56" width="${s}" height="${s}" aria-hidden="true">${svg}</svg>`;
  } else {
    el.style.fontSize = Math.round(px * 0.55) + 'px';
    el.textContent = d.icon || '☕';
  }
  return el;
}
