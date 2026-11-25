// 2026 Sağlık Takvimi "Önemli Günler" listesi (Sağlık Bakanlığı).
// Satır biçimi: [başlangıçAy, başlangıçGün, bitişAy, bitişGün, 'Ad', tatil?]
// Tek günlük kayıtta bitiş = başlangıç. Tatil işareti (1) resmî tatil günlerini vurgular.
export const YEAR = 2026;

const D = (m, d, name, t) => [m, d, m, d, name, t ? 1 : 0];
const R = (m1, d1, m2, d2, name, t) => [m1, d1, m2, d2, name, t ? 1 : 0];

export const DAYS = [
  // Ocak
  D(1, 1, 'Yılbaşı', 1),
  R(1, 1, 1, 31, 'Serviks Kanseri Farkındalık Ayı'),
  R(1, 4, 1, 10, 'Verem Eğitimi ve Farkındalık Haftası'),
  R(1, 7, 1, 14, 'Beyaz Baston Görme Engelliler Haftası'),
  // Şubat
  D(2, 4, 'Dünya Kanser Günü'),
  D(2, 9, 'Sigarayı Bırakma Günü'),
  D(2, 9, 'Uluslararası Epilepsi Günü'),
  D(2, 15, 'Uluslararası Çocukluk Çağı Kanseri Günü'),
  D(2, 28, 'Sivil Savunma Günü'),
  D(2, 28, 'Nadir Hastalıklar Günü'),
  // Mart
  R(3, 1, 3, 31, 'Ulusal Kolorektal Kanser Farkındalık Ayı'),
  R(3, 1, 3, 7, 'Yeşilay Haftası'),
  R(3, 1, 3, 7, 'Deprem Haftası'),
  D(3, 3, 'Dünya Kulak ve İşitme Günü'),
  D(3, 4, 'Dünya Obezite Günü'),
  D(3, 8, 'Dünya Kadınlar Günü'),
  R(3, 8, 3, 14, 'Pulmoner Rehabilitasyon Haftası'),
  R(3, 8, 3, 14, 'Dünya Glokom Haftası'),
  D(3, 12, 'Dünya Böbrek Günü'),
  D(3, 14, 'Tıp Bayramı'),
  R(3, 18, 3, 24, 'Ulusal Yaşlılar Haftası'),
  D(3, 19, 'Ramazan Bayramı Arifesi'),
  R(3, 20, 3, 22, 'Ramazan Bayramı', 1),
  D(3, 20, 'Dünya Oral Sağlık Günü'),
  D(3, 21, 'Dünya Down Sendromlular Günü'),
  D(3, 22, 'Dünya Su Günü'),
  D(3, 22, 'Acil Tıp Teknisyenleri ve Teknikerleri Günü'),
  D(3, 23, 'Dünya Meteoroloji Günü'),
  D(3, 24, 'Dünya Tüberküloz Günü'),
  // Nisan
  R(4, 1, 4, 7, 'Ulusal Kanser Haftası'),
  D(4, 2, 'Dünya Otizm Farkındalık Günü'),
  D(4, 7, 'Dünya Sağlık Günü'),
  D(4, 11, 'Dünya Parkinson Hastalığı Günü'),
  R(4, 12, 4, 18, 'Kalp Sağlığı Haftası'),
  D(4, 17, 'Dünya Hemofili Günü'),
  R(4, 20, 4, 26, 'Tıbbi Laboratuvar Çalışanları Haftası'),
  R(4, 21, 4, 28, 'Ebeler Haftası'),
  D(4, 23, 'Ulusal Egemenlik ve Çocuk Bayramı', 1),
  R(4, 24, 4, 30, 'Dünya Aşı Haftası'),
  D(4, 25, 'Dünya Sıtma Günü'),
  // Mayıs
  R(5, 1, 5, 31, 'Cilt Kanseri Farkındalık Ayı'),
  R(5, 1, 5, 31, 'Yoğun Bakım Farkındalık Ayı'),
  D(5, 1, 'Emek ve Dayanışma Günü', 1),
  R(5, 4, 5, 10, 'İş Sağlığı ve Güvenliği Haftası'),
  D(5, 5, 'Dünya Ebeler Günü'),
  D(5, 5, 'Dünya Astım Günü'),
  D(5, 8, 'Dünya Talasemi Günü'),
  D(5, 8, 'Dünya Kızılhaç-Kızılay Günü'),
  R(5, 10, 5, 16, 'Engelliler Haftası'),
  D(5, 10, 'Sağlık için Hareket Et Günü'),
  D(5, 10, 'Psikologlar Günü'),
  R(5, 11, 5, 17, 'Dünya Tuza Dikkat Haftası'),
  R(5, 12, 5, 18, 'Hemşireler Haftası'),
  D(5, 12, 'Hemşireler Günü'),
  D(5, 14, 'Eczacılık Günü'),
  D(5, 16, 'Avrupa Obezite Günü'),
  D(5, 16, 'Uluslararası Çölyak Günü'),
  D(5, 17, 'Dünya Hipertansiyon Günü'),
  R(5, 19, 5, 24, 'Sağlıklı Genç Haftası'),
  D(5, 19, 'Atatürk\'ü Anma Gençlik ve Spor Bayramı', 1),
  D(5, 19, 'Dünya İnflamatuvar Bağırsak Hastalıkları Günü'),
  D(5, 26, 'Kurban Bayram Arifesi'),
  R(5, 27, 5, 30, 'Kurban Bayramı', 1),
  D(5, 30, 'Dünya MS Günü'),
  D(5, 31, 'Dünya Tütünsüz Günü'),
  // Haziran
  D(6, 1, 'Dünya Süt Günü'),
  D(6, 1, 'Ulusal Fenilketonüri Günü'),
  D(6, 3, 'Dünya Bisiklet Günü'),
  D(6, 5, 'Dünya Çevre Günü'),
  D(6, 6, 'Diyetisyenler Günü'),
  D(6, 14, 'Dünya Kan Bağışçıları Günü'),
  D(6, 20, 'Dünya Mülteciler Günü'),
  D(6, 21, 'Dünya ALS Günü'),
  D(6, 26, 'Dünya Uyuşturucu Kullanımı ve Kaçakçılığı ile Mücadele Günü'),
  // Temmuz
  D(7, 15, 'Demokrasi ve Birlik Günü', 1),
  D(7, 28, 'Dünya Hepatit Günü'),
  // Ağustos
  R(8, 1, 8, 7, 'Dünya Emzirme Haftası'),
  R(8, 3, 8, 9, 'Ulusal UMKE Haftası'),
  R(8, 17, 8, 23, 'İbn-i Sina Haftası'),
  D(8, 19, 'Dünya İnsani Yardım Günü'),
  D(8, 30, 'Zafer Bayramı', 1),
  // Eylül
  R(9, 1, 9, 30, 'Dünya Alzheimer Ayı'),
  R(9, 3, 9, 9, 'Halk Sağlığı Haftası'),
  D(9, 8, 'Dünya Fizyoterapi Günü'),
  D(9, 8, 'Uluslararası Okuryazarlık Günü'),
  D(9, 12, 'Dünya İlk Yardım Günü'),
  D(9, 13, 'Dünya Sepsis Günü'),
  D(9, 15, 'Prostat Kanseri Farkındalık Günü'),
  D(9, 15, 'Dünya Lenfoma Farkındalık Günü'),
  D(9, 17, 'Dünya Hasta Güvenliği Günü'),
  R(9, 19, 9, 25, 'Dünya Şeker Tüketimine Dikkat Haftası'),
  D(9, 19, 'Dünya Kemik İliği Bağışçıları Günü'),
  D(9, 21, 'Dünya Alzheimer Günü'),
  R(9, 21, 9, 27, 'Uluslararası İşitme Engelliler Haftası'),
  D(9, 25, 'Dünya Eczacılar Günü'),
  D(9, 26, 'Dünya Çevre Sağlığı Günü'),
  D(9, 28, 'Dünya Kuduz Günü'),
  D(9, 29, 'Dünya Kalp Günü'),
  // Ekim
  R(10, 1, 10, 7, 'Normal Doğum Haftası'),
  R(10, 1, 10, 31, 'Meme Kanseri Farkındalık Ayı'),
  D(10, 1, 'Dünya Yaşlılar Günü'),
  D(10, 4, 'Dünya Yürüyüş Günü'),
  D(10, 6, 'Dünya Serebral Palsi Günü'),
  D(10, 8, 'Dünya Görme Günü'),
  D(10, 10, 'Dünya Ruh Sağlığı Günü'),
  D(10, 10, 'Dünya Palyatif Bakım Günü'),
  D(10, 12, 'Dünya Artrit Günü'),
  D(10, 13, 'Uluslararası Afet Risklerinin Azaltılması Günü'),
  D(10, 15, 'Dünya El Yıkama Günü'),
  D(10, 15, 'Dünya Meme Sağlığı Günü'),
  D(10, 16, 'Dünya Anestezi Günü'),
  D(10, 16, 'Dünya Gıda Günü'),
  D(10, 18, 'Dünya Menopoz Günü'),
  D(10, 20, 'Dünya Osteoporoz Günü'),
  D(10, 21, 'Küresel İyot Eksikliği Bozukluklarını Önleme Günü'),
  D(10, 22, 'Dünya Kekemelik Günü'),
  D(10, 24, 'Dünya Polio Günü'),
  D(10, 26, 'Hasta Hakları Günü'),
  R(10, 29, 11, 4, 'Kızılay Haftası'),
  D(10, 29, 'Cumhuriyet Bayramı', 1),
  D(10, 29, 'Dünya İnme Günü'),
  // Kasım
  R(11, 1, 11, 30, 'Akciğer Kanseri Farkındalık Ayı'),
  R(11, 2, 11, 8, 'Lösemili Çocuklar Haftası'),
  R(11, 3, 11, 9, 'Organ Bağışı Haftası'),
  D(11, 3, 'Tek Sağlık Günü'),
  D(11, 8, 'Dünya Radyoloji Günü'),
  D(11, 10, 'Atatürk\'ü Anma Günü'),
  D(11, 11, 'Millî Ağaçlandırma Günü'),
  D(11, 12, 'Dünya Pnömoni Günü'),
  D(11, 14, 'Dünya Diyabet Günü'),
  R(11, 16, 11, 22, 'Toplum Ağız ve Diş Sağlığı Haftası'),
  D(11, 17, 'Dünya Prematüre Günü'),
  R(11, 18, 11, 24, 'Dünya Antimikrobiyal Farkındalık Haftası'),
  D(11, 18, 'Avrupa Antibiyotik Farkındalık Günü'),
  D(11, 18, 'Dünya KOAH Günü'),
  D(11, 20, 'Dünya Çocuk Günü'),
  D(11, 22, 'Diş Hekimliği Günü'),
  D(11, 29, 'Tıbbi Sekreterler Günü'),
  // Aralık
  R(12, 1, 12, 7, 'Acil Sağlık Hizmetleri Haftası'),
  D(12, 1, 'Dünya AIDS Günü'),
  D(12, 3, 'Dünya Engelliler Günü'),
  D(12, 10, 'İnsan Hakları Günü'),
  D(12, 27, 'Uluslararası Salgına Hazırlık Günü')
];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const key = (m, d) => m * 100 + d;

function toItem(r) {
  const [m1, d1, m2, d2, name, tatil] = r;
  const single = m1 === m2 && d1 === d2;
  const wholeMonth = m1 === m2 && d1 === 1 && d2 >= 28 && d2 >= new Date(YEAR, m1, 0).getDate();
  return {
    name, tatil: !!tatil,
    kind: tatil ? 'tatil' : single ? 'gun' : wholeMonth ? 'ay' : 'hafta',
    start: key(m1, d1), end: key(m2, d2), startM: m1, startD: d1
  };
}
const ITEMS = DAYS.map(toItem);
const ORDER = { tatil: 0, gun: 1, hafta: 2, ay: 3 };

// Verilen tarihte geçerli olan günler/haftalar/aylar (yalnızca 2026'da)
export function today(date = new Date()) {
  if (date.getFullYear() !== YEAR) return [];
  const k = key(date.getMonth() + 1, date.getDate());
  return ITEMS.filter((i) => i.start <= k && k <= i.end).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

// Önümüzdeki `days` gün içinde başlayan kayıtlar (en fazla `max` adet), tarih etiketiyle
export function upcoming(date = new Date(), days = 7, max = 3) {
  if (date.getFullYear() !== YEAR) return [];
  const out = [];
  for (let n = 1; n <= days && out.length < max; n++) {
    const t = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
    if (t.getFullYear() !== YEAR) break;
    const k = key(t.getMonth() + 1, t.getDate());
    const label = `${t.getDate()} ${MONTHS[t.getMonth()]}`;
    ITEMS.filter((i) => i.start === k).sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
      .forEach((i) => { if (out.length < max) out.push({ ...i, label }); });
  }
  return out;
}
