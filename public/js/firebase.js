// Firebase başlatma, oturum yönetimi ve SDK yeniden dışa aktarımları.
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';

export { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, runTransaction, writeBatch, deleteField
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export { ADMIN_EMAIL };

// Görevliler kullanıcı adıyla girer; Firebase Auth e-posta istediği için kullanıcı adından
// arka planda sahte bir e-posta üretilir (görevli bunu görmez, gerçek posta kutusu gerekmez).
export const STAFF_EMAIL_DOMAIN = 'gorevli.local';
export function normalizeUsername(u) {
  const tr = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
  return String(u || '').trim().toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (c) => tr[c]).replace(/\s+/g, '');
}
export const staffEmail = (u) => `${normalizeUsername(u)}@${STAFF_EMAIL_DOMAIN}`;

export const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_');

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getFirestore(app) : null;

// Oturum durumu: herkes (sabit kullanıcı / misafir) anonim olarak oturum açar,
// yönetici ve görevli e-posta + şifre ile giriş yapar; yönetici /admins/{uid},
// görevli ise /staff/{uid} (active: true) kaydı ile doğrulanır.
export const session = { user: null, isAdmin: false, isStaff: false, staffName: '', staffGender: '', error: null, ready: false };

// Yönetici oturumunu kapatmadan yeni görevli hesabı açar (ikinci, geçici Firebase app örneği).
// Yalnızca Auth kullanıcısını oluşturur ve UID döndürür; /staff/{uid} belgesini çağıran yazar.
// Not: Tarayıcıdan Auth hesabı silinemez; görevli listeden silinse de hesabı Auth'ta kalır.
// Aynı kullanıcı adı yeniden eklenirse, girilen şifre eski hesabın şifresiyse hesap yeniden
// kullanılır; değilse 'staff/old-account-password' hatası verilir.
export async function createStaffAccount(email, password) {
  const second = initializeApp(firebaseConfig, 'staff-creator-' + Date.now());
  try {
    const a2 = getAuth(second);
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(a2, email, password);
    } catch (err) {
      if (err.code !== 'auth/email-already-in-use') throw err;
      try {
        cred = await fbSignIn(a2, email, password);
      } catch (err2) {
        if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(err2.code)) {
          const e = new Error('Eski hesabın şifresi farklı'); e.code = 'staff/old-account-password'; throw e;
        }
        throw err2;
      }
    }
    const uid = cred.user.uid;
    await fbSignOut(a2);
    return uid;
  } finally {
    deleteApp(second).catch(() => {});
  }
}

const listeners = new Set();
let resolveReady;
const readyPromise = new Promise((r) => { resolveReady = r; });

export const whenReady = () => readyPromise;
export function onSession(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emit() {
  listeners.forEach((f) => { try { f(session); } catch (e) { console.error(e); } });
}

if (configured) {
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
        session.user = null;
        session.error = e;
        session.ready = true;
        resolveReady();
        emit();
      }
      return;
    }
    session.user = u;
    session.error = null;
    session.isAdmin = false;
    session.isStaff = false;
    session.staffName = '';
    session.staffGender = '';
    if (!u.isAnonymous) {
      try {
        session.isAdmin = (await getDoc(doc(db, 'admins', u.uid))).exists();
        if (!session.isAdmin) {
          const st = await getDoc(doc(db, 'staff', u.uid));
          session.isStaff = st.exists() && st.data().active === true;
          if (session.isStaff) { session.staffName = st.data().name || ''; session.staffGender = st.data().gender || ''; }
        }
      } catch (e) {
        console.warn('Yönetici/görevli kontrolü yapılamadı', e);
      }
    }
    session.ready = true;
    resolveReady();
    emit();
  });
} else {
  session.ready = true;
  resolveReady();
}
