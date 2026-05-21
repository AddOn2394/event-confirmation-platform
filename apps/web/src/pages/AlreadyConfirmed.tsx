import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AlreadyConfirmed() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <CalendarCheck className="mb-2 h-10 w-10 text-blue-600" />
          <CardTitle>Ya confirmaste tu asistencia</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Tu confirmación ya fue registrada para este evento. No necesitas hacerlo de nuevo.
        </CardContent>
      </Card>
    </div>
  );
}
