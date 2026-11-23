// Firebase başlatma, oturum yönetimi ve SDK yeniden dışa aktarımları.
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';

export { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, runTransaction, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export { ADMIN_EMAIL };

// Görevli girişi için kullanıcı adı → arka plandaki e-posta dönüşümü.
// Firebase Auth e-posta ister; görevli yalnızca kullanıcı adını yazar. Bu adrese hiçbir zaman posta gitmez.
const TR_ASCII = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
export function normUsername(s) {
  return String(s || '').trim().toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (c) => TR_ASCII[c]).replace(/\s+/g, '');
}
export const isValidUsername = (u) => /^[a-z0-9._-]{2,20}$/.test(u);
export function staffEmail(username) {
  return `${normUsername(username)}@gorevli.${firebaseConfig.authDomain || 'cay-kahve.app'}`;
}

export const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_');

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getFirestore(app) : null;

// Oturum durumu: herkes (sabit kullanıcı / misafir) anonim olarak oturum açar,
// yönetici ve görevli e-posta + şifre ile giriş yapar; yönetici /admins/{uid},
// görevli ise /staff/{uid} (active: true) kaydı ile doğrulanır.
export const session = { user: null, isAdmin: false, isStaff: false, error: null, ready: false };

// Yönetici oturumunu kapatmadan yeni görevli hesabı açar (ikinci, geçici Firebase app örneği).
// Yalnızca Auth kullanıcısını oluşturur ve UID döndürür; /staff/{uid} belgesini çağıran yazar.
export async function createStaffAccount(email, password) {
  const second = initializeApp(firebaseConfig, 'staff-creator-' + Date.now());
  try {
    const a2 = getAuth(second);
    const cred = await createUserWithEmailAndPassword(a2, email, password);
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
    if (!u.isAnonymous) {
      try {
        session.isAdmin = (await getDoc(doc(db, 'admins', u.uid))).exists();
        if (!session.isAdmin) {
          const st = await getDoc(doc(db, 'staff', u.uid));
          session.isStaff = st.exists() && st.data().active === true;
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
