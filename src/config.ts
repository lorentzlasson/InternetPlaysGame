import 'loadEnv';
import { z } from 'npm:zod';

export const dbUrl = z.string().parse(Deno.env.get('DB_URL'));
