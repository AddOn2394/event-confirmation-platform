export type ItemType = 'servicio' | 'producto';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  price: number;
}

export interface DiscountResult {
  serviciosPct: number;
  productosPct: number;
  serviciosSubtotal: number;
  productosSubtotal: number;
  finalTotal: number;
}
