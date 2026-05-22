import { useMemo } from 'react';
import { computeDiscount, type Item, type DiscountResult } from '@ecp/shared';

export function useDiscount(
  itemIds: string[],
  items: Item[]
): DiscountResult & { selectedItems: Item[] } {
  return useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const selectedItems = itemIds
      .map((id) => byId.get(id))
      .filter((i): i is Item => Boolean(i));
    return { ...computeDiscount(selectedItems), selectedItems };
  }, [itemIds, items]);
}
