import RegionPage from '@/components/RegionPage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wall Street' };

export default function Page() {
  return <RegionPage region="usa" />;
}
