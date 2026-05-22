import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConfirmationDetail, type ConfirmationDetailData } from '@/components/ConfirmationDetail';
import { apiGet, ApiError } from '@/lib/api';

const SALES_EMAIL = 'ventas@feria-promociones.example';
const SALES_PHONE = '+50250000000';

interface PageData {
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  existing_confirmation: ConfirmationDetailData;
}

export function AlreadyConfirmed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/confirm/invalid', { replace: true });
      return;
    }

    apiGet<{ client: PageData['client']; existing_confirmation: ConfirmationDetailData | null }>(
      `/api/event/${token}/confirmation`
    )
      .then((res) => {
        if (!res.existing_confirmation) {
          navigate('/confirm/invalid', { replace: true });
          return;
        }
        setData({ client: res.client, existing_confirmation: res.existing_confirmation });
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          navigate('/confirm/invalid', { replace: true });
        } else {
          navigate('/confirm/invalid', { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

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

      {/* CTA contacto */}
      <div className="mt-8 rounded-lg border p-5 text-center">
        <p className="mb-4 text-sm font-medium">¿Necesitas hacer cambios? Contacta a ventas</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" asChild>
            <a href={`mailto:${SALES_EMAIL}`}>Enviar correo</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`tel:${SALES_PHONE}`}>Llamar</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
