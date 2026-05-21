import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { apiGet } from '@/lib/api';

interface SiteConfig {
  contact_email: string;
  contact_phone: string;
  contact_hours: string;
}

export function Layout() {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    apiGet<SiteConfig>('/api/config')
      .then(setConfig)
      .catch(() => null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Feria de Promociones 2026
          </h1>
          <p className="text-sm text-muted-foreground">Plataforma de Confirmación de Asistencia</p>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          {config ? (
            <p>
              ¿Preguntas? Escríbenos a{' '}
              <a href={`mailto:${config.contact_email}`} className="underline hover:text-foreground">
                {config.contact_email}
              </a>{' '}
              · {config.contact_phone} · {config.contact_hours}
            </p>
          ) : (
            <p>Feria de Promociones 2026</p>
          )}
        </div>
      </footer>
    </div>
  );
}
