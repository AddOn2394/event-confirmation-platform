import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';

const SALES_EMAIL = 'ventas@feria-promociones.example';
const SALES_PHONE = '+50250000000';

export function InvalidToken() {
  usePageMeta('Enlace no válido', 'El enlace de invitación no es válido o ha expirado.');
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" asChild>
              <a href={`mailto:${SALES_EMAIL}`}>Enviar correo</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`tel:${SALES_PHONE}`}>Llamar</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
