import 'loadEnv';
import { z } from 'zod';

export const dbUrl = z.string().parse(Deno.env.get('DB_URL'));
