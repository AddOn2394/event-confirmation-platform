import { z } from 'zod';

export const ConfirmationBodySchema = z.object({
  token: z.string().min(1),
  slot_id: z.string().uuid(),
  item_ids: z.array(z.string().uuid()).min(1, 'Debes seleccionar al menos un item'),
  phone: z.string().optional(),
  document_type: z.enum(['DPI', 'Pasaporte', 'NIT', 'Otro']).optional(),
  document_number: z.string().optional(),
});

export type ConfirmationBody = z.infer<typeof ConfirmationBodySchema>;
