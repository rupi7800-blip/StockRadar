import Link from 'next/link';
export default function NotFound() {
  return (<div className="mx-auto max-w-md py-16 text-center"><h1 className="text-2xl font-bold">Pagina non trovata</h1><p className="mt-2 text-mute">Il contenuto richiesto non esiste o è stato rimosso.</p><Link href="/" className="btn btn-primary mt-4">Torna al Radar</Link></div>);
}
