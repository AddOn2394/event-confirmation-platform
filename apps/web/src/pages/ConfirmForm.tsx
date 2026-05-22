import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Item } from '@ecp/shared';
import { ConfirmationBodySchema, type ConfirmationBody } from '@ecp/shared';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { ItemSelector } from '@/components/ItemSelector';
import { DiscountSummary } from '@/components/DiscountSummary';
import { useDiscount } from '@/hooks/useDiscount';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EventSlot {
  id: string;
  label: string;
  starts_at: string;
  ends_at: string;
}

interface ClientData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
}

interface ConfirmationData {
  client: ClientData;
  event: { id: string; name: string; capacity: number; confirmed_count: number } | null;
  slots: EventSlot[];
  items: Item[];
  existing_confirmation: { id: string } | null;
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Skeleton className="mb-4 h-8 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

export function ConfirmForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  usePageMeta('Confirmar asistencia', 'Selecciona tus servicios y productos para confirmar tu asistencia.');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmationBody>({
    resolver: zodResolver(ConfirmationBodySchema),
    defaultValues: {
      token,
      item_ids: [],
    },
  });

  // Observar item_ids de forma aislada para no re-renderizar todo el form
  const itemIds = useWatch({ control, name: 'item_ids' }) ?? [];
  const catalogItems = data?.items ?? [];
  const discount = useDiscount(itemIds, catalogItems);

  useEffect(() => {
    if (!token) {
      navigate('/confirm/invalid', { replace: true });
      return;
    }

    apiGet<ConfirmationData>(`/api/event/${token}/confirmation`)
      .then((res) => {
        if (res.existing_confirmation) {
          navigate(`/confirm/already?token=${token}`, { replace: true });
          return;
        }

        setData(res);

        if (res.client.phone) setValue('phone', res.client.phone);
        if (res.client.document_type) {
          setValue(
            'document_type',
            res.client.document_type as ConfirmationBody['document_type']
          );
        }
        if (res.client.document_number) setValue('document_number', res.client.document_number);
        if (res.slots.length > 0) setValue('slot_id', res.slots[0].id);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/confirm/invalid', { replace: true });
        } else {
          navigate('/confirm/invalid', { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate, setValue]);

  async function onSubmit(values: ConfirmationBody) {
    try {
      await apiPost<{ id: string }>(`/api/confirm?token=${token}`, values);
      navigate(`/confirm/success?token=${token}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          navigate('/confirm/full', { replace: true });
        } else if (err.status === 409 || err.status === 200) {
          navigate(`/confirm/already?token=${token}`, { replace: true });
        } else if (err.status === 401) {
          navigate('/confirm/invalid', { replace: true });
        } else {
          toast.error('Ocurrió un error al procesar tu confirmación. Intenta de nuevo.');
        }
      }
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const { client, slots } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">Confirmar asistencia</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna izquierda — datos del cliente */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tus datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <p className="text-sm font-medium">{client.first_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Apellido</Label>
                    <p className="text-sm font-medium">{client.last_name}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Correo</Label>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input id="phone" type="tel" placeholder="555-0000" {...register('phone')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="document_type">Tipo de documento (opcional)</Label>
                  <Controller
                    name="document_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="document_type"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value as ConfirmationBody['document_type'] | undefined
                          )
                        }
                      >
                        <option value="">Sin documento</option>
                        <option value="DPI">DPI</option>
                        <option value="Pasaporte">Pasaporte</option>
                        <option value="NIT">NIT</option>
                        <option value="Otro">Otro</option>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="document_number">Número de documento (opcional)</Label>
                  <Input
                    id="document_number"
                    placeholder="0000-00000-0000"
                    {...register('document_number')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selección de horario */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selecciona tu horario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {slots.map((slot) => (
                  <label
                    key={slot.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      value={slot.id}
                      {...register('slot_id')}
                      className="accent-primary"
                    />
                    <span className="text-sm">{slot.label}</span>
                  </label>
                ))}
                {errors.slot_id && (
                  <p className="text-xs text-destructive">{errors.slot_id.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha — catálogo de items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Servicios y Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Controller
                name="item_ids"
                control={control}
                render={({ field }) => (
                  <ItemSelector
                    items={catalogItems}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    query={searchQuery}
                  />
                )}
              />
              {errors.item_ids && (
                <p className="mt-2 text-xs text-destructive">{errors.item_ids.message}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen de descuentos */}
        <div className="mt-6">
          <DiscountSummary {...discount} />
        </div>

        {/* Submit */}
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || itemIds.length === 0}
            className="w-full sm:w-auto sm:min-w-40"
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar asistencia'}
          </Button>
        </div>
      </form>
    </div>
  );
}
