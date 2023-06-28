import 'loadEnv';
import { z } from 'zod';

const parseStringEnv = (key: string) =>
  z.string()
    .min(1, { message: `${key} must be at least 1 character long.` })
    .parse(Deno.env.get(key));

const parseBooleanEnv = (key: string) =>
  z.string()
    .refine(
      (value) => ['true', 'false'].includes(value.toLowerCase()),
      { message: `${key} must be either 'true' or 'false'.` },
    )
    .transform((value) => value.toLowerCase() === 'true')
    .parse(Deno.env.get(key));

export const dbUrl = parseStringEnv('DB_URL');

export const jwtSecret = parseStringEnv('JWT_SECRET');

export const googleClientId = parseStringEnv('GOOGLE_CLIENT_ID');
export const googleClientSecret = parseStringEnv('GOOGLE_CLIENT_SECRET');
export const googleRedirectUri = parseStringEnv('GOOGLE_REDIRECT_URI');
export const tickerApiKey = parseStringEnv('TICKER_API_KEY');

export const secureCookie = parseBooleanEnv('SECURE_COOKIE');
