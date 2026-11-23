// ============================================================
//  FIREBASE AYARLARI  —  BURAYI KENDİ PROJENİZLE DOLDURUN
//  Firebase Console > Proje ayarları > Genel > "Web uygulaması" > SDK kurulumu
// ============================================================
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// Yönetici e-posta adresi (Firebase Authentication'da oluşturduğunuz kullanıcı).
// Doldurursanız yönetici girişinde sadece şifre sorulur. Boş bırakırsanız e-posta da sorulur.
export const ADMIN_EMAIL = '';
