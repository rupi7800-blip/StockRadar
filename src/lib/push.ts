import 'server-only';
import webpush from 'web-push';
import { all, run, getSetting, setSetting } from './db';

/** Chiavi VAPID: da env, altrimenti generate al primo avvio e salvate nel DB (mai esposta la privata). */
export function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  let k = getSetting<{ publicKey: string; privateKey: string } | null>('vapid', null);
  if (!k) {
    k = webpush.generateVAPIDKeys();
    setSetting('vapid', k);
  }
  return k;
}

let configured = false;
function setup() {
  if (configured) return;
  const k = vapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.invalid', k.publicKey, k.privateKey);
  configured = true;
}

export async function pushToDevice(deviceId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  setup();
  const subs = all<{ endpoint: string; p256dh: string; auth: string }>('SELECT endpoint, p256dh, auth FROM push_subs WHERE device_id = ?', deviceId);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) run('DELETE FROM push_subs WHERE endpoint = ?', s.endpoint);
    }
  }
  return sent;
}
