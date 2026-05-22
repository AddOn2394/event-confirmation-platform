import { Outlet } from 'react-router-dom';
import { useContact } from '@/contexts/ContactContext';

export function Layout() {
  const contact = useContact();

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
          {contact ? (
            <p>
              ¿Preguntas? Escríbenos a{' '}
              <a href={`mailto:${contact.contact_email}`} className="underline hover:text-foreground">
                {contact.contact_email}
              </a>{' '}
              · {contact.contact_phone} · {contact.contact_hours}
            </p>
          ) : (
            <p>Feria de Promociones 2026</p>
          )}
        </div>
      </footer>
    </div>
  );
}
