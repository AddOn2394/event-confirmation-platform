import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InvalidToken() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <ShieldAlert className="mb-2 h-10 w-10 text-destructive" />
          <CardTitle>Enlace no válido o expirado</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Este enlace de invitación no es válido o ha expirado. Contacta a nuestro
          equipo de ventas para solicitar un nuevo acceso.
        </CardContent>
      </Card>
    </div>
  );
}
