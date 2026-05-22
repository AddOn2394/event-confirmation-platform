import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatGTQ } from '@/lib/utils';
import { partitionConfirmationItems } from '@/lib/items';
import type { Client, ConfirmationDetail as ConfirmationDetailType } from '@/types/confirmation';

export type { ConfirmationDetail as ConfirmationDetailData } from '@/types/confirmation';

interface ConfirmationDetailProps {
  client: Client;
  confirmation: ConfirmationDetailType;
}

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'long',
  timeStyle: 'short',
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ConfirmationDetail({ client, confirmation }: ConfirmationDetailProps) {
  const { slot, items, discount_services, discount_products, final_total, created_at } = confirmation;
  const { services, products } = partitionConfirmationItems(items);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del asistente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Nombre</p>
            <p className="font-medium">{client.first_name} {client.last_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Correo</p>
            <p className="font-medium">{client.email}</p>
          </div>
          {client.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="font-medium">{client.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {slot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horario confirmado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{slot.label}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Servicios
              </h4>
              <div className="divide-y rounded-md border">
                {services.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatGTQ(item.price_at_confirmation)}</span>
                  </div>
                ))}
              </div>
              {discount_services > 0 && (
                <p className="mt-1 text-right text-xs text-green-600">
                  Descuento aplicado: {(discount_services * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}

          {products.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Productos
              </h4>
              <div className="divide-y rounded-md border">
                {products.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatGTQ(item.price_at_confirmation)}</span>
                  </div>
                ))}
              </div>
              {discount_products > 0 && (
                <p className="mt-1 text-right text-xs text-green-600">
                  Descuento aplicado: {(discount_products * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold">{formatGTQ(final_total)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Confirmado el {formatDate(created_at)}
      </p>
    </div>
  );
}
