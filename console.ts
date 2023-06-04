import 'loadEnv';
import { sql } from 'npm:slonik';
import { db } from './src/db.ts';

// Run `deno task console`
console.log('Running console', { sql, db });
