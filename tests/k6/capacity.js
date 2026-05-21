import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Cargado una sola vez y compartido entre todos los VUs
const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open('./tokens.json'));
});

export const options = {
  scenarios: {
    capacity_test: {
      executor: 'per-vu-iterations',
      vus: 60,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    // Ningún status code inesperado (solo 201 y 410 son válidos)
    checks: ['rate==1'],
  },
};

const confirmed = new Counter('confirmed');
const full = new Counter('full');

export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const eventId = __ENV.EVENT_ID;

  if (!eventId) {
    throw new Error('EVENT_ID env var requerida: k6 run -e EVENT_ID=<uuid> capacity.js');
  }

  const res = http.get(`${baseUrl}/api/event/${eventId}`);
  if (res.status !== 200) {
    throw new Error(`No se pudo cargar el evento: HTTP ${res.status} — ${res.body}`);
  }

  const data = JSON.parse(res.body);
  if (!data.slots || data.slots.length === 0) {
    throw new Error('El evento no tiene slots');
  }
  if (!data.items || data.items.length === 0) {
    throw new Error('El evento no tiene items');
  }

  return {
    baseUrl,
    slotId: data.slots[0].id,
    itemId: data.items[0].id,
  };
}

export default function (data) {
  const vuIndex = __VU - 1; // __VU es 1-based
  const tokenObj = tokens[vuIndex];

  const payload = JSON.stringify({
    slot_id: data.slotId,
    item_ids: [data.itemId],
    phone: `555-${String(vuIndex).padStart(4, '0')}`,
  });

  const res = http.post(
    `${data.baseUrl}/api/confirm?token=${tokenObj.token}`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'status 201 o 410': (r) => r.status === 201 || r.status === 410,
  });

  if (!ok) {
    console.error(`VU ${__VU}: status inesperado ${res.status} — ${res.body}`);
  }

  if (res.status === 201) confirmed.add(1);
  else if (res.status === 410) full.add(1);
}

export function handleSummary(data) {
  const confirmedCount = data.metrics['confirmed']
    ? data.metrics['confirmed'].values['count']
    : 0;
  const fullCount = data.metrics['full'] ? data.metrics['full'].values['count'] : 0;
  const pass = confirmedCount === 50 && fullCount === 10;

  const report = [
    '',
    '=== Capacity Test — Resultados ===',
    `  201 Confirmados : ${confirmedCount}  (esperado: 50)`,
    `  410 Cupo lleno  : ${fullCount}   (esperado: 10)`,
    `  Resultado       : ${pass ? 'PASS ✓' : 'FAIL ✗'}`,
    '',
    pass
      ? 'Reconciliación post-test (ejecutar manualmente):'
      : 'ADVERTENCIA: los contadores no coinciden — revisar logs.',
    "  SELECT confirmed_count FROM event WHERE id = '<EVENT_ID>';",
    '  SELECT COUNT(*) FROM confirmation;',
    '  Ambas deben ser 50.',
    '',
  ].join('\n');

  return { stdout: report };
}
