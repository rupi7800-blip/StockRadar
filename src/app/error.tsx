'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (<div className="mx-auto max-w-md py-16 text-center"><h1 className="text-2xl font-bold">Si è verificato un errore</h1><p className="mt-2 text-mute">La sezione non è stata caricata correttamente. I dati non vengono inventati: riprova tra poco.</p><button onClick={reset} className="btn btn-primary mt-4">Riprova</button></div>);
}
