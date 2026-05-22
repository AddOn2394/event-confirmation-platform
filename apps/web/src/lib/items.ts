import type { Item } from '@ecp/shared';
import type { ConfirmationItem } from '@/types/confirmation';

export function partitionByType(items: Item[]): { services: Item[]; products: Item[] } {
  return {
    services: items.filter((i) => i.type === 'servicio'),
    products: items.filter((i) => i.type === 'producto'),
  };
}

export function partitionConfirmationItems(items: ConfirmationItem[]): {
  services: ConfirmationItem[];
  products: ConfirmationItem[];
} {
  return {
    services: items.filter((i) => i.type === 'servicio'),
    products: items.filter((i) => i.type === 'producto'),
  };
}
