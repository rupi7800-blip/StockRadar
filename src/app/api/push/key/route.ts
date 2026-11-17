import { json, handler } from '@/lib/api';
import { vapidKeys } from '@/lib/push';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => json({ publicKey: vapidKeys().publicKey }));
