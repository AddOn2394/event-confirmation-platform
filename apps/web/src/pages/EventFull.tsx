import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EventFull() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <Users className="mb-2 h-10 w-10 text-amber-600" />
          <CardTitle>Cupo agotado</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Lamentamos informarte que el cupo del evento se ha completado. Comunícate
          con nuestro equipo de ventas para explorar alternativas.
        </CardContent>
      </Card>
    </div>
  );
}
