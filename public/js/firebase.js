// Firebase başlatma, oturum yönetimi ve SDK yeniden dışa aktarımları.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';

export { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, runTransaction, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export { ADMIN_EMAIL };

export const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_');

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getFirestore(app) : null;

// Oturum durumu: herkes (sabit kullanıcı / misafir) anonim olarak oturum açar,
// yönetici ise e-posta + şifre ile giriş yapar ve /admins/{uid} kaydı ile doğrulanır.
export const session = { user: null, isAdmin: false, error: null, ready: false };

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
    if (!u.isAnonymous) {
      try {
        session.isAdmin = (await getDoc(doc(db, 'admins', u.uid))).exists();
      } catch (e) {
        console.warn('Yönetici kontrolü yapılamadı', e);
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
