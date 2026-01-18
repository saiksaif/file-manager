import dotenv from 'dotenv'

dotenv.config()

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toNumber(process.env.PORT, 4050),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_URL: process.env.REDIS_URL ?? '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? '',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '7d',
  SESSION_TTL_SECONDS: toNumber(process.env.SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
  S3_REGION: process.env.S3_REGION ?? '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? '',
  S3_ENDPOINT_URL: process.env.S3_ENDPOINT_URL ?? '',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? '',
}
