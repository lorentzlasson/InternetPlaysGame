import 'loadEnv';

// Used by console
// deno-lint-ignore no-unused-vars
import { sql } from './src/db.ts';

// Run `deno task console`
console.log(`
Console running.

Example:
  await sql\`select count(*) from move\`
`);
