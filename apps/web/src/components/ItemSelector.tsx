import type { Item } from '@ecp/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ItemSelectorProps {
  items: Item[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(price);
}

function ItemGroup({
  title,
  items,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  items: Item[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item) => {
          const checked = selected.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => !disabled && onToggle(item.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors',
                checked
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <Checkbox
                id={`item-${item.id}`}
                checked={checked}
                onCheckedChange={() => !disabled && onToggle(item.id)}
                disabled={disabled}
              />
              <Label
                htmlFor={`item-${item.id}`}
                className="flex flex-1 cursor-pointer items-center justify-between"
              >
                <span className="text-sm">{item.name}</span>
                <span className="ml-4 shrink-0 text-sm font-medium text-muted-foreground">
                  {formatPrice(item.price)}
                </span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ItemSelector({ items, value, onChange, disabled }: ItemSelectorProps) {
  const selected = new Set(value);

  const services = items.filter((i) => i.type === 'servicio');
  const products = items.filter((i) => i.type === 'producto');

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-6">
      <ItemGroup
        title="Servicios"
        items={services}
        selected={selected}
        onToggle={toggle}
        disabled={disabled}
      />
      <ItemGroup
        title="Productos"
        items={products}
        selected={selected}
        onToggle={toggle}
        disabled={disabled}
      />
    </div>
  );
}
