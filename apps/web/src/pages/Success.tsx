import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useExistingConfirmation } from '@/hooks/useExistingConfirmation';
import { ConfirmationDetail } from '@/components/ConfirmationDetail';
import { ConfirmationPageSkeleton } from '@/components/ConfirmationPageSkeleton';

export function Success() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  usePageMeta('¡Confirmación exitosa!', 'Tu asistencia a la Feria de Promociones 2026 ha sido confirmada.');

  const { data, loading } = useExistingConfirmation(token);

  if (loading) return <ConfirmationPageSkeleton />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <CheckCircle className="h-12 w-12 text-green-600" />
        <h1 className="text-2xl font-bold">¡Confirmación exitosa!</h1>
        <p className="text-sm text-muted-foreground">
          Tu asistencia ha sido registrada. Recibirás más detalles por correo.
        </p>
      </div>
      <ConfirmationDetail client={data.client} confirmation={data.existing_confirmation} />
    </div>
  );
}
