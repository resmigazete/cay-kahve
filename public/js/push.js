// Web Push (Firebase Cloud Messaging): telefon ekranı kapalıyken / uygulama arka plandayken bile
// yeni sipariş ve personel çağrısı bildirimi. Bildirimi sunucu tarafı (functions/index.js) gönderir.
import { app, db, session, doc, setDoc, deleteDoc, serverTimestamp } from './firebase.js';
import { VAPID_KEY } from './firebase-config.js';

const TOKEN_KEY = 'cay.pushToken';
const MSG_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'ok' | 'need-install' (iPhone: önce Ana ekrana ekle) | 'unsupported' | 'not-configured'
export function pushSupport() {
  if (!VAPID_KEY) return 'not-configured';
  if (isIOS && !isStandalone) return 'need-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'ok';
}
export const pushPermission = () => ('Notification' in window ? Notification.permission : 'denied');
export const hasToken = () => { try { return !!localStorage.getItem(TOKEN_KEY); } catch { return false; } };

async function registerToken() {
  const { getMessaging, getToken } = await import(MSG_URL);
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error('Bildirim anahtarı alınamadı');
  await setDoc(doc(db, 'pushTokens', token), {
    uid: session.user.uid,
    role: session.isAdmin ? 'admin' : 'staff',
    name: session.isAdmin ? 'Yönetici' : (session.staffName || ''),
    ua: navigator.userAgent.slice(0, 120),
    updatedAt: serverTimestamp()
  });
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* yoksay */ }
  return token;
}

// Kullanıcı dokunuşuyla çağrılır (izin penceresi ancak böyle açılır).
export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { const e = new Error('Bildirim izni verilmedi'); e.code = 'push/denied'; throw e; }
  return registerToken();
}

// İzin zaten verilmişse (ör. oturum yeniden açıldı) jetonu bu hesaba bağlar/yeniler.
export async function refreshPush() {
  if (pushSupport() !== 'ok' || pushPermission() !== 'granted') return false;
  await registerToken();
  return true;
}

// Çıkışta: bu cihaz artık bu hesabın bildirimini almasın (oturum hâlâ açıkken çağrılmalı).
export async function releasePush() {
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch { /* yoksay */ }
  if (!token) return;
  try { await deleteDoc(doc(db, 'pushTokens', token)); } catch (e) { console.warn(e); }
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* yoksay */ }
}
