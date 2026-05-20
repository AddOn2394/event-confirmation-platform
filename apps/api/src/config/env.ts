import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN debe tener al menos 32 caracteres'),
  EVENT_CAPACITY: z.coerce.number().int().min(1).max(10000),
  EVENT_ID: z.string().uuid('EVENT_ID debe ser un UUID válido'),
  INVITATION_BASE_URL: z.string().url('INVITATION_BASE_URL debe ser una URL válida'),
  CONTACT_EMAIL: z.string().email('CONTACT_EMAIL debe ser un email válido'),
  CONTACT_PHONE: z.string().min(1, 'CONTACT_PHONE es requerido'),
  CONTACT_HOURS: z.string().min(1, 'CONTACT_HOURS es requerido'),
  LOG_DIR: z.string().default('logs'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().email('RESEND_FROM debe ser un email válido').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`\nConfiguración de entorno inválida:\n${issues}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
