// Yeni sipariş / personel çağrısı olduğunda görevli ve yönetici cihazlarına arka plan (Web Push) bildirimi gönderir.
// Ekran kapalı olsa da bildirim gelir. Jetonlar /pushTokens/{token} belgelerinde tutulur.
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

// Firestore veritabanının bulunduğu bölgeyle aynı (ya da yakın) olmalı. Gerekirse FUNCTIONS_REGION değişkeniyle değiştirin.
const REGION = process.env.PUSH_REGION || 'europe-west1';

// Yetkisi hâlâ geçerli olan jetonlar (pasife alınan görevlinin jetonu silinir).
async function activeTokens() {
  const snap = await db.collection('pushTokens').get();
  if (snap.empty) return [];
  const staffCache = new Map();
  const adminCache = new Map();
  const ok = [];
  const stale = [];
  for (const d of snap.docs) {
    const { uid, role } = d.data();
    let allowed = false;
    if (role === 'admin') {
      if (!adminCache.has(uid)) adminCache.set(uid, (await db.doc(`admins/${uid}`).get()).exists);
      allowed = adminCache.get(uid);
    } else {
      if (!staffCache.has(uid)) { const s = await db.doc(`staff/${uid}`).get(); staffCache.set(uid, s.exists && s.data().active === true); }
      allowed = staffCache.get(uid);
    }
    (allowed ? ok : stale).push(d);
  }
  await Promise.all(stale.map((d) => d.ref.delete().catch(() => {})));
  return ok.map((d) => d.id);
}

async function push({ title, body, tag, url }) {
  const tokens = await activeTokens();
  if (!tokens.length) return;
  // Yalnızca "data" gönderilir; bildirimi sw.js içindeki push olayı gösterir (ses, titreşim, tekrar uyarı).
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title, body, tag, url },
    webpush: { headers: { Urgency: 'high', TTL: '1800' } },
    android: { priority: 'high', ttl: 1800 * 1000 }
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    const c = r.error && r.error.code;
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') dead.push(tokens[i]);
    else if (r.error) console.warn('FCM hata', c);
  });
  await Promise.all(dead.map((t) => db.doc(`pushTokens/${t}`).delete().catch(() => {})));
}

const itemsText = (items) => (items || []).map((i) => `${i.qty || 1}× ${i.name}${i.option ? ' (' + i.option + ')' : ''}`).join(', ');

exports.notifyNewOrder = onDocumentCreated({ document: 'orders/{id}', region: REGION }, async (event) => {
  const o = event.data && event.data.data();
  if (!o || o.status !== 'new') return;
  await push({
    title: `🔔 Yeni sipariş #${o.number}`,
    body: `${o.name}${o.qrName ? ' · ' + o.qrName : ''} — ${itemsText(o.items)}${o.note ? ' · Not: ' + o.note : ''}`.slice(0, 240),
    tag: `order-${event.params.id}`,
    url: './#/admin/orders'
  });
});

exports.notifyCall = onDocumentWritten({ document: 'calls/{uid}', region: REGION }, async (event) => {
  const after = event.data && event.data.after && event.data.after.data();
  const before = event.data && event.data.before && event.data.before.data();
  if (!after || after.status !== 'open') return;
  // Yeni çağrı: belge yeni oluştu ya da önceki çağrı kapanıp yenisi açıldı (createdAt değişti)
  const isNew = !before || before.status !== 'open' || String(before.createdAt && before.createdAt.toMillis()) !== String(after.createdAt && after.createdAt.toMillis());
  if (!isNew) return;
  await push({
    title: '🛎️ Personel çağrısı',
    body: `${after.name}${after.qrName ? ' · ' + after.qrName : ''}${after.message ? ' — ' + after.message : ''}`.slice(0, 240),
    tag: `call-${event.params.uid}-${after.createdAt ? after.createdAt.toMillis() : Date.now()}`,
    url: './#/admin/orders'
  });
});
