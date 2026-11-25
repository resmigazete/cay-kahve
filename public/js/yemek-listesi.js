// Aylık öğle yemek listesi (yemek listesi sayfasından aktarıldı).
// Anahtar 'YYYY-AA'; içeride gün numarası -> { items: [...], cal: 'xxxx kcal' }.
// Yeni ay eklemek için aşağıya yeni bir 'YYYY-AA' bloğu eklemek yeterlidir.
export const MENUS = {
  '2026-11': {
    2: { items: ["Şehriye Çorba", "Pide Üzeri Et Döner", "Zyt. Bamya", "Ayran", "Salata"], cal: '976 kcal' },
    3: { items: ["Süzme Mercimek Çorba", "Tas Kebabı", "Yoğurtlu Brokoli", "Meyve", "Salata"], cal: '1021 kcal' },
    4: { items: ["Arabaşı Çorba", "Püreli Hasanpaşa Köfte", "Zyt. Kereviz", "Supangle", "Salata"], cal: '1031 kcal' },
    5: { items: ["Ekşili Maraş Çorba", "Piliç Topkapı", "Zeytinyağlı Kabak Yemeği", "Ayran", "Salata"], cal: '919 kcal' },
    6: { items: ["Yayla Çorba", "Terbiyeli Et Haşlama", "Patlıcanlı Bulgur Pilavı", "Tulumba Tatlısı", "Salata"], cal: '1271 kcal' },
    9: { items: ["Köz Patlıcan Çorba", "Etli Nohut", "Şehriyeli Pirinç Pilavı", "Yoğurt", "Salata", "Turşu"], cal: '1105 kcal' },
    10: { items: ["Ezogelin Çorba", "Lavaş Üzeri Tavuk Tantuni", "Yoğurtlu Soslu Karışık Kızartma", "Meyve", "Salata"], cal: '1181 kcal' },
    11: { items: ["Brokoli Çorba", "Adana Köfte", "Bulgur Pilavı", "Ayran", "Salata"], cal: '1054 kcal' },
    12: { items: ["Sebzeli Şehriye Çorba", "Pazı Yatağında Fırın Balık", "Zyt. Kereviz", "Tahin Helva", "Roka / Kırmızı Soğan"], cal: '1273 kcal' },
    13: { items: ["Mantar Çorba", "Çoban Kavurma", "Zerdeçallı Havuçlu Basmati Pilav", "Soğuk Sütlü Kadayıf", "Salata"], cal: '1064 kcal' },
    16: { items: ["Tarhana Çorba", "Pilav Üzeri Et Döner", "Zyt. Taze Fasulye", "Ayran", "Salata"], cal: '864 kcal' },
    17: { items: ["Çeşminigar Çorba", "Arnavut Ciğeri + Sumaklı Soğan", "Zeytinyağlı Piyaz", "Ayran", "Salata", "Meyve"], cal: '1079 kcal' },
    18: { items: ["Yayla Çorba", "Sebze Garnili Tavuk Pirzola", "Kısır", "İncirli Muhallebi", "Salata"], cal: '1011 kcal' },
    19: { items: ["Kırmızı Mercimek Çorba", "İslim Köfte", "Şehriyeli Pirinç Pilavı", "Yoğurt", "Salata", "Meyve"], cal: '1163 kcal' },
    20: { items: ["Kereviz Çorba", "Elbasan Tava", "Zyt. Fırın Sebze", "Fıstıklı Dolama", "Salata"], cal: '1139 kcal' },
    23: { items: ["Brokoli Çorba", "Pastırmalı Kurufasulye", "Şehriyeli Pirinç Pilavı", "Yoğurt", "Salata", "Turşu"], cal: '994 kcal' },
    24: { items: ["Yayla Çorba", "Izgara Köfte - Köz Biber", "Sebzeli Fesleğenli Makarna", "Meyve", "Salata"], cal: '837 kcal' },
    25: { items: ["Süzme Mercimek Çorba", "Patates Oturtma", "Mercimekli Bulgur Pilavı", "Haydari", "Salata"], cal: '1059 kcal' },
    26: { items: ["Kaşarlı Domates Çorba", "Püreli Rosto Et", "İç Pilav", "Meyve", "Salata"], cal: '1058 kcal' },
    27: { items: ["Erişteli Yeşil Mercimek Çorba", "Fırın Balık", "Fırında Baharatlı Patates", "Tahinli Cevizli Kabak Tatlısı", "Salata"], cal: '1053 kcal' },
    30: { items: ["Kırmızı Mercimek Çorba", "Alinazik Kebabı", "Su Böreği", "Meyve Suyu", "Salata"], cal: '1055 kcal' }
  }
};

// Verilen güne ait menü (liste yoksa null). Hafta sonu / resmî tatil kontrolü çağıranda yapılır.
export function lunchFor(date = new Date()) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const m = MENUS[key];
  return (m && m[date.getDate()]) || null;
}
