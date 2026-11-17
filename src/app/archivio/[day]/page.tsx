import { notFound } from 'next/navigation';
import { ArchiveDay, archiveDays, STATIC_DAYS } from '@/components/ArchiveDay';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Archivio storico' };

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== '1') return [];
  return archiveDays(STATIC_DAYS).map((d) => ({ day: d.d }));
}

export default async function Giorno({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();
  return <ArchiveDay day={day} />;
}
