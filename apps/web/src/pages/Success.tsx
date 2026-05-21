import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Success() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle className="mb-2 h-10 w-10 text-green-600" />
          <CardTitle>¡Confirmación exitosa!</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Tu asistencia ha sido registrada. Recibirás más detalles por correo.
        </CardContent>
      </Card>
    </div>
  );
}
