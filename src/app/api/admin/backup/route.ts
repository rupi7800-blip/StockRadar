import fs from 'node:fs';
import path from 'node:path';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { backupNow } from '@/lib/scheduler';
import { dbPath, audit } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  await requireAdmin();
  backupNow();
  const file = path.join(path.dirname(dbPath()), 'backups', `stock-radar-${new Date().toISOString().slice(0, 10)}.db`);
  audit('backup_download', {});
  const data = fs.readFileSync(file);
  return new Response(data, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${path.basename(file)}"`, 'Cache-Control': 'no-store' } });
});
