import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useContact } from '@/contexts/ContactContext';

export function InvalidToken() {
  usePageMeta('Enlace no válido', 'El enlace de invitación no es válido o ha expirado.');
  const contact = useContact();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <ShieldAlert className="mb-2 h-10 w-10 text-destructive" />
          <CardTitle>Enlace no válido o expirado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center text-sm text-muted-foreground">
          <p>
            Este enlace de invitación no es válido o ha expirado. Contacta a nuestro
            equipo de ventas para solicitar un nuevo acceso.
          </p>
          {contact && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <a
                  href={`mailto:${contact.contact_email}`}
                  aria-label={`Enviar correo a ${contact.contact_email}`}
                >
                  Enviar correo
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={`tel:${contact.contact_phone}`}
                  aria-label={`Llamar a ${contact.contact_phone}`}
                >
                  Llamar
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
