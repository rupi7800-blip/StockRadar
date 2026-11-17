import { listNews, type NewsFilter } from '@/lib/news';
import { Card } from './ui';
import NewsFeed from './NewsFeed';

/** Feed notizie di una sezione (fino a 80 eventi), filtrabile per stato di verifica lato browser. */
export function SectionNews({ title = 'Notizie', filter }: { title?: string; filter: NewsFilter; sp?: Record<string, string | undefined>; basePath?: string; perPage?: number }) {
  const items = listNews({ ...filter, limit: 80 });
  return (
    <Card id="notizie" title={title}>
      <NewsFeed items={items} />
    </Card>
  );
}
