import { LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageMeta } from '@/hooks/usePageMeta';

export function Home() {
  usePageMeta('Feria de Promociones 2026', 'Confirma tu asistencia a la Feria de Promociones 2026.');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <LockKeyhole className="mb-2 h-10 w-10 text-muted-foreground" />
          <CardTitle>Acceso solo por invitación</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Si recibiste una invitación, accede usando el enlace personalizado
          enviado a tu correo.
        </CardContent>
      </Card>
    </div>
  );
}
