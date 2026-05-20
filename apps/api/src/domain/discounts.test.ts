import { describe, it, expect } from 'vitest';
import { computeDiscount } from '../../../../packages/shared/src/domain/discounts';
import type { Item } from '../../../../packages/shared/src/schemas/discount';

// Helpers para construir items de test sin repetir boilerplate
const svc = (price: number, id = Math.random().toString()): Item => ({
  id,
  name: `Servicio ${id}`,
  type: 'servicio',
  price,
});

const prd = (price: number, id = Math.random().toString()): Item => ({
  id,
  name: `Producto ${id}`,
  type: 'producto',
  price,
});

describe('computeDiscount — servicios', () => {
  it('0 servicios → 0%', () => {
    const r = computeDiscount([prd(100)]);
    expect(r.serviciosPct).toBe(0);
  });

  it('1 servicio → 0%', () => {
    const r = computeDiscount([svc(2000)]);
    expect(r.serviciosPct).toBe(0);
  });

  it('2 servicios con subtotal exactamente Q1500 → 3% (no 5%)', () => {
    // Borde crítico: "mayor a Q1500", no "mayor o igual"
    const r = computeDiscount([svc(750), svc(750)]);
    expect(r.serviciosPct).toBe(0.03);
  });

  it('2 servicios con subtotal Q1501 → 5%', () => {
    const r = computeDiscount([svc(750.50), svc(750.50)]);
    expect(r.serviciosPct).toBe(0.05);
  });

  it('2 servicios con subtotal Q800 (< Q1500) → 3%', () => {
    const r = computeDiscount([svc(400), svc(400)]);
    expect(r.serviciosPct).toBe(0.03);
  });

  it('3 servicios con subtotal > Q1500 → 5%', () => {
    const r = computeDiscount([svc(600), svc(600), svc(600)]);
    expect(r.serviciosPct).toBe(0.05);
  });

  it('subtotal de servicios se calcula correctamente', () => {
    const r = computeDiscount([svc(800), svc(950)]);
    expect(r.serviciosSubtotal).toBe(1750);
  });
});

describe('computeDiscount — productos', () => {
  it('0 productos → 0%', () => {
    const r = computeDiscount([svc(500)]);
    expect(r.productosPct).toBe(0);
  });

  it('2 productos → 0%', () => {
    const r = computeDiscount([prd(100), prd(100)]);
    expect(r.productosPct).toBe(0);
  });

  it('3 productos → 3%', () => {
    const r = computeDiscount([prd(100), prd(100), prd(100)]);
    expect(r.productosPct).toBe(0.03);
  });

  it('4 productos → 3% (borde: transición 4→5)', () => {
    const r = computeDiscount([prd(100), prd(100), prd(100), prd(100)]);
    expect(r.productosPct).toBe(0.03);
  });

  it('5 productos → 5%', () => {
    const r = computeDiscount([prd(100), prd(100), prd(100), prd(100), prd(100)]);
    expect(r.productosPct).toBe(0.05);
  });
});

describe('computeDiscount — combinaciones y total final', () => {
  it('descuentos de servicios y productos son independientes', () => {
    // 2 servicios Q600 (subtotal Q1200 < Q1500) → 3%; 5 productos Q100 → 5%
    const r = computeDiscount([svc(600), svc(600), prd(100), prd(100), prd(100), prd(100), prd(100)]);
    expect(r.serviciosPct).toBe(0.03);
    expect(r.productosPct).toBe(0.05);
  });

  it('total final aplica ambos descuentos correctamente', () => {
    // Servicios: 800+950=1750 > 1500 → 5%; Productos: 5×100=500 → 5%
    const r = computeDiscount([svc(800), svc(950), prd(100), prd(100), prd(100), prd(100), prd(100)]);
    const esperado = 1750 * 0.95 + 500 * 0.95;
    expect(r.finalTotal).toBeCloseTo(esperado, 5);
  });

  it('lista vacía → todo cero', () => {
    const r = computeDiscount([]);
    expect(r.serviciosPct).toBe(0);
    expect(r.productosPct).toBe(0);
    expect(r.finalTotal).toBe(0);
  });
});
