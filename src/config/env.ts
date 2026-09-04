import 'dotenv/config';
import { z } from 'zod';

const DEFAULT_JWT_SECRET = 'development-secret-change-me-123456';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  JWT_SECRET: z.string().min(16).default(DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('*'),
  DATA_SOURCE: z.enum(['memory', 'sqlserver']).default('memory'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(1433),
  DB_USER: z.string().default('sa'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('LinxCommerceTest'),
  DB_SCHEMA: z.string().default('dbo'),
  DB_PRODUCTS_TABLE: z.string().default('linx_products'),
  DB_ENCRYPT: z.enum(['true', 'false']).default('false'),
  DB_TRUST_SERVER_CERTIFICATE: z.enum(['true', 'false']).default('true'),
  ADMIN_EMAIL: z.email().default('admin@local.test'),
  ADMIN_PASSWORD: z.string().min(8).default(DEFAULT_ADMIN_PASSWORD),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
}

export const env = parsed.data;

// Os defaults existem para facilitar o `npm run dev`; em produção eles seriam
// credenciais públicas conhecidas, então a API se recusa a subir com elas.
if (env.NODE_ENV === 'production') {
  const insecure: string[] = [];
  if (env.JWT_SECRET === DEFAULT_JWT_SECRET) insecure.push('JWT_SECRET');
  if (env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) insecure.push('ADMIN_PASSWORD');
  if (env.CORS_ORIGIN === '*') insecure.push('CORS_ORIGIN');
  if (insecure.length) {
    throw new Error(`Defina valores próprios para ${insecure.join(', ')} antes de rodar em produção.`);
  }
}

export const isProduction = env.NODE_ENV === 'production';
