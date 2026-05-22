import type { DiscountResult, Item } from '@ecp/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatGTQ } from '@/lib/utils';

interface DiscountSummaryProps extends DiscountResult {
  selectedItems: Item[];
}

function DiscountCard({
  title,
  pct,
  subtotal,
  ruleLabel,
}: {
  title: string;
  pct: number;
  subtotal: number;
  ruleLabel: string;
}) {
  const active = pct > 0;
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-opacity',
        active ? 'border-green-200 bg-green-50' : 'border-border bg-muted/30 opacity-60'
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className={cn('mt-1 text-3xl font-bold', active ? 'text-green-700' : 'text-muted-foreground')}>
        {active ? `${(pct * 100).toFixed(0)}%` : '—'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{formatGTQ(subtotal)}</p>
      {active && <p className="mt-1 text-xs text-green-600">{ruleLabel}</p>}
    </div>
  );
}

function ruleLabelServicios(pct: number): string {
  if (pct === 0.05) return '2+ servicios y subtotal > Q1,500';
  if (pct === 0.03) return '2+ servicios';
  return '';
}

function ruleLabelProductos(pct: number): string {
  if (pct === 0.05) return '5+ productos';
  if (pct === 0.03) return '3+ productos';
  return '';
}

export function DiscountSummary({
  selectedItems,
  serviciosPct,
  productosPct,
  serviciosSubtotal,
  productosSubtotal,
  finalTotal,
}: DiscountSummaryProps) {
  if (selectedItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Selecciona servicios o productos para ver el resumen.
        </CardContent>
      </Card>
    );
  }

  const servicios = selectedItems.filter((i) => i.type === 'servicio');
  const productos = selectedItems.filter((i) => i.type === 'producto');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de descuento */}
        <div className="grid gap-3 sm:grid-cols-2">
          <DiscountCard
            title="Descuento Servicios"
            pct={serviciosPct}
            subtotal={serviciosSubtotal}
            ruleLabel={ruleLabelServicios(serviciosPct)}
          />
          <DiscountCard
            title="Descuento Productos"
            pct={productosPct}
            subtotal={productosSubtotal}
            ruleLabel={ruleLabelProductos(productosPct)}
          />
        </div>

        {/* Tabla de items */}
        <div className="space-y-4">
          {servicios.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Servicios
              </h4>
              <div className="divide-y rounded-md border">
                {servicios.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatGTQ(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {productos.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Productos
              </h4>
              <div className="divide-y rounded-md border">
                {productos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatGTQ(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total final */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm font-semibold">Total estimado</span>
          <span className="text-lg font-bold">{formatGTQ(finalTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
