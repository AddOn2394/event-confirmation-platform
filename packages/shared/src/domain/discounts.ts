import type { Item, DiscountResult } from '../schemas/discount';

export function computeDiscount(items: Item[]): DiscountResult {
  const servicios = items.filter((i) => i.type === 'servicio');
  const productos = items.filter((i) => i.type === 'producto');

  const serviciosSubtotal = servicios.reduce((sum, i) => sum + i.price, 0);
  const productosSubtotal = productos.reduce((sum, i) => sum + i.price, 0);

  let serviciosPct = 0;
  if (servicios.length >= 2 && serviciosSubtotal > 1500) {
    serviciosPct = 0.05;
  } else if (servicios.length >= 2) {
    serviciosPct = 0.03;
  }

  let productosPct = 0;
  if (productos.length >= 5) {
    productosPct = 0.05;
  } else if (productos.length >= 3) {
    productosPct = 0.03;
  }

  const finalTotal =
    serviciosSubtotal * (1 - serviciosPct) + productosSubtotal * (1 - productosPct);

  return { serviciosPct, productosPct, serviciosSubtotal, productosSubtotal, finalTotal };
}
