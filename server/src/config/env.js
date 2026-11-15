const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_SSL: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET_NAME: z.string().default('evidence-vault-private'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform((val) => parseInt(val, 10)),
  INSPECTOR_INVITE_CODE: z.string().min(6).default('INSP-AUTH-2026-KEY-9821'),
  DCP_INVITE_CODE: z.string().min(6).default('DCP-AUTH-2026-KEY-5541'),
  JUDGE_INVITE_CODE: z.string().min(6).default('JUDGE-AUTH-2026-KEY-1102'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsedEnv.data;

