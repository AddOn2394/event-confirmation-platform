import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import type { Client, ConfirmationDetail, ConfirmationPageData } from '@/types/confirmation';

interface RawResponse {
  client: Client;
  existing_confirmation: ConfirmationDetail | null;
}

export function useExistingConfirmation(token: string): {
  data: ConfirmationPageData | null;
  loading: boolean;
} {
  const navigate = useNavigate();
  const [data, setData] = useState<ConfirmationPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/confirm/invalid', { replace: true });
      return;
    }

    apiGet<RawResponse>(`/api/event/${token}/confirmation`)
      .then((res) => {
        if (!res.existing_confirmation) {
          navigate('/confirm/invalid', { replace: true });
          return;
        }
        setData({ client: res.client, existing_confirmation: res.existing_confirmation });
      })
      .catch(() => navigate('/confirm/invalid', { replace: true }))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  return { data, loading };
}
