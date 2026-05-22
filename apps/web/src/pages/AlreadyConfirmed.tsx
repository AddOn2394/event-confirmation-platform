import { useSearchParams } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useExistingConfirmation } from '@/hooks/useExistingConfirmation';
import { useContact } from '@/contexts/ContactContext';
import { ConfirmationDetail } from '@/components/ConfirmationDetail';
import { ConfirmationPageSkeleton } from '@/components/ConfirmationPageSkeleton';
import { Button } from '@/components/ui/button';

export function AlreadyConfirmed() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  usePageMeta('Ya confirmaste tu asistencia', 'Tu asistencia a la Feria de Promociones 2026 ya está registrada.');

  const { data, loading } = useExistingConfirmation(token);
  const contact = useContact();

  if (loading) return <ConfirmationPageSkeleton />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <CalendarCheck className="h-12 w-12 text-blue-600" />
        <h1 className="text-2xl font-bold">Ya confirmaste tu asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Tu confirmación ya fue registrada para este evento.
        </p>
      </div>

      <ConfirmationDetail client={data.client} confirmation={data.existing_confirmation} />

      {contact && (
        <div className="mt-8 rounded-lg border p-5 text-center">
          <p className="mb-4 text-sm font-medium">¿Necesitas hacer cambios? Contacta a ventas</p>
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
        </div>
      )}
    </div>
  );
}
