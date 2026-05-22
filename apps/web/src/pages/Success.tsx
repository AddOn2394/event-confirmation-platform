import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDetail, type ConfirmationDetailData } from '@/components/ConfirmationDetail';
import { apiGet, ApiError } from '@/lib/api';

interface PageData {
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  existing_confirmation: ConfirmationDetailData;
}

export function Success() {
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
