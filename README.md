# ☕ Çay-Kahve Sipariş ve İkram Yönetim Sistemi

Ofis için mobil öncelikli, Türkçe, ödemesiz sipariş uygulaması (PWA).
HTML + CSS + JavaScript (derleme gerektirmez) · Firebase Authentication · Cloud Firestore · Firebase Hosting / Netlify.

## Neler var?

**Kullanıcı tarafı**
- Sabit kullanıcılar: listeden adını seçer veya kişisel bağlantıyla (`#/u/…`) girer.
- Misafirler: QR kodu okutur → adını yazar (zorunlu) → sipariş verir. Hesap/indirme yok.
- Çoklu içecek, adet, şeker/özel seçenek, not. Sipariş en fazla 3-4 dokunuşta tamamlanır.
- "Siparişlerim": canlı durum takibi, "yeni" durumdaki siparişi iptal etme.

**Yönetici paneli** (şifreli)
- Canlı sipariş panosu (sayfa yenilemeden), durum renkleri, tek dokunuşla durum değiştirme, yeni siparişte sesli uyarı (açılıp kapanır), bekleme/hazırlık süreleri, tarihe göre geçmiş.
- Menü yönetimi (ekle/sil/düzenle/pasife al, ikon veya görsel, açıklama, seçenekler).
- Kişi yönetimi + kişisel bağlantı kopyalama.
- QR kod üretme (oda/alan başına ayrı), PNG indirme, yazdırma. Altında "İçecek Siparişi Vermek İçin Okutunuz" yazar. Siparişte hangi QR'ın kullanıldığı kaydedilir.
- Raporlar: günlük/kişi/içecek/misafir/haftalık dağılım, en çok tercih edilenler, tarih aralığı filtresi, Excel (.xlsx) dışa aktarma.
- Ayarlar: sipariş alımını aç/kapat, ses, gün sonu kapanışı.
- Görevliler: panelden e-posta + şifre ile görevli hesabı açma, pasife alma, silme (Firebase Console'a gitmek gerekmez).

**Görevli ekranı** (çay ocağı görevlisi)
- Giriş sayfasında "Görevli girişi" ile kendi e-posta ve şifresiyle girer.
- Yalnızca **Siparişler** sekmesini görür: yeni sipariş sesi, sipariş kartı, durum ilerletme (Hazırlamaya başla → Hazır → Teslim edildi) ve geri alma. Menü, kişi, QR, rapor ve ayarlara erişemez.

## Kurulum (yaklaşık 15 dakika)

### 1) Firebase projesi
1. https://console.firebase.google.com → **Proje ekle**.
2. **Build → Authentication → Sign-in method**: **Anonymous** ve **Email/Password** yöntemlerini **etkinleştirin**.
3. **Build → Firestore Database → Create database** (production mode, size yakın bölge).
4. **Proje ayarları → Genel → Uygulamalarınız → Web (`</>`)** ile web uygulaması ekleyin ve verilen `firebaseConfig` değerlerini `public/js/firebase-config.js` dosyasına yapıştırın.

### 2) Güvenlik kurallarını yükleyin
- Console → Firestore → **Rules** sekmesine `firestore.rules` dosyasının içeriğini yapıştırıp **Publish** edin,
  **veya** Firebase CLI ile: `firebase deploy --only firestore:rules`

### 3) Yönetici hesabı (önemli)
1. Console → Authentication → **Users → Add user**: yöneticinin e-posta + şifresi.
2. Oluşan kullanıcının **User UID** değerini kopyalayın.
3. Firestore → **Start collection** → koleksiyon: `admins` → **Document ID = o UID** → herhangi bir alan ekleyin (ör. `role: "admin"`).
   Bu belge olmadan giriş yapılsa bile yönetici yetkisi verilmez.
4. İsterseniz `public/js/firebase-config.js` içindeki `ADMIN_EMAIL` alanına e-postayı yazın; böylece giriş ekranında yalnızca şifre sorulur.

### 4) Yayına alma
**Firebase Hosting** (önerilen)
```bash
npm i -g firebase-tools
firebase login
# .firebaserc içindeki YOUR_PROJECT_ID'yi proje kimliğinizle değiştirin
firebase deploy
```
**Netlify**: `public` klasörünü sürükle-bırak ile yükleyin (Firestore kurallarını 2. adımdaki gibi Console'dan yayınlayın).

Yayın adresiniz Firebase'de otomatik olarak yetkili alan adıdır. Netlify veya özel alan adı kullanırsanız Console → Authentication → Settings → **Authorized domains** listesine ekleyin.

### 5) İlk kullanım
1. Uygulamayı açın → **Yönetici girişi** → giriş yapın.
2. **Menü** → "Başlangıç menüsünü yükle" (çay, kahve, diğer içecekler hazır gelir).
3. **Kişiler** → 4-5 sabit kullanıcıyı ekleyin; isterseniz kişisel bağlantılarını kopyalayıp gönderin.
4. **QR Kodlar** → "Genel" (veya oda adı) ile QR oluşturun → PNG indirip yazdırın.
5. Telefonlarda tarayıcı menüsünden **Ana ekrana ekle** (PWA).

## Veri yapısı (Firestore)

| Koleksiyon | İçerik |
|---|---|
| `users/{id}` | `name`, `createdAt` — sabit kullanıcılar |
| `drinks/{id}` | `name`, `category`, `icon`, `imageUrl`, `description`, `optionLabel`, `optionChoices[]`, `active`, `order` |
| `qrcodes/{id}` | `name`, `active`, `createdAt` — QR'ın bağlantısı `…/#/g/{id}` |
| `orders/{id}` | `number`, `dayKey` (YYYY-AA-GG), `customerType` (`user`/`guest`), `userId`, `name`, `qrId`, `qrName`, `ownerUid`, `items[{drinkId,name,option,optionLabel,qty}]`, `note`, `status`, `createdAt`, `times{preparing,ready,delivered,cancelled}` |
| `counters/{dayKey}` | `n` — günlük sipariş numarası sayacı |
| `settings/app` | `orderingOpen` |
| `admins/{uid}` | yönetici yetkisi (yalnızca Console'dan eklenir) |
| `staff/{uid}` | `name`, `email`, `active`, `createdAt` — görevli yetkisi (yönetici panelinden yönetilir) |

Sipariş durumları: `new` → `preparing` → `ready` → `delivered` (veya `cancelled`).

## Güvenlik modeli
- Herkes (sabit kullanıcı/misafir) Firebase'e **anonim** oturumla bağlanır; yönetici e-posta+şifre ile girer ve `admins/{uid}` kaydıyla, görevli ise `staff/{uid}` kaydıyla doğrulanır.
- Menü, kişi listesi ve QR kayıtları okunabilir ama **yalnızca yönetici yazabilir**.
- Sipariş oluşturma: geçerli alanlarla, kendi `ownerUid`'i ile ve sipariş alımı açıkken. Sipariş sahibi yalnızca **kendi** siparişini ve yalnızca **"Yeni"** durumdayken iptal edebilir. Sipariş silme yalnızca yöneticidedir.
- **Görevli** (`staff/{uid}` kaydı var ve `active: true`): tüm siparişleri okuyabilir ve yalnızca `status` ile `times` alanlarını değiştirebilir. Menü, kişi, QR ve ayarları yazamaz; kendi görevli kaydını okuyabilir, başkasınınkini okuyamaz. Pasife alınan görevli anında yetkisiz kalır.
- Misafirler yönetim verilerine (diğer siparişler, raporlar) erişemez; QR kod yalnızca sipariş ekranını açar.

## Bilinen sınırlar (bilerek basit tutuldu)
- "Siparişlerim" cihaz/tarayıcı bazlıdır: aynı kişi başka telefondan girerse eski siparişlerini göremez (yeni sipariş verebilir). Bunu aşmak için kişi bazlı gerçek hesap (e-posta/şifre) gerekir.
- Sabit kullanıcı seçimi şifresizdir (4-5 kişilik güvenilir ofis için tasarlandı). Biri başka bir kişinin adıyla sipariş verebilir; bunu istemiyorsanız kişisel bağlantı kullanımını yaygınlaştırın.
- Tarayıcı kapalıyken sesli/anlık bildirim gönderilmez (web push eklenmemiştir). Panel açıkken ses çalar; sayfa yenilendikten sonra ses için ekrana bir kez dokunmak gerekir (tarayıcı kuralı).
- QR ve Excel için jsDelivr CDN'i, Firebase için gstatic CDN'i kullanılır (internet gerekir).

## Dosya yapısı
```
firebase.json  firestore.rules  firestore.indexes.json  .firebaserc
public/
  index.html  manifest.webmanifest  sw.js  icons/
  css/style.css
  js/ app.js (yönlendirici) · firebase.js · firebase-config.js · util.js · data.js
      store.js · customer.js · admin.js · stats.js
```

## GitHub ile otomatik yayın

`main` dalına her gönderimde (`.github/workflows/deploy.yml`) site Firebase Hosting'e, Firestore kuralları da Firestore'a otomatik yayınlanır. Firebase ayarı koda yazılmaz, secret'tan üretilir.

Firebase Console'da bir kez yapılacaklar: proje oluşturma, Authentication'da Anonymous + Email/Password'u açma, Firestore'u oluşturma, yönetici kullanıcısı + `admins/{uid}` belgesi.

GitHub → Settings → Secrets and variables → Actions:

| Ad | Tür | Değer |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Secret | Proje kimliği |
| `FIREBASE_WEB_CONFIG` | Secret | Console'daki web uygulaması `firebaseConfig = {...}` nesnesi (süslü parantezler dahil) |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | Hizmet hesabı JSON anahtarının tüm içeriği (rol: Firebase Admin) |
| `ADMIN_EMAIL` | Variable (isteğe bağlı) | Yönetici e-postası; doluysa girişte yalnızca şifre sorulur |

Sonra Actions sekmesinden "Firebase'e yayınla" iş akışını çalıştırın.
