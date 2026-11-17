import RegionPage from '@/components/RegionPage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Borse europee' };

export default function Page() {
  return <RegionPage region="europa" />;
}
