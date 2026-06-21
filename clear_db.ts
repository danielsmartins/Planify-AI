import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`DELETE FROM transactions`);
  await db.execute(sql`DELETE FROM users`);
  console.log("Database cleared");
  process.exit(0);
}
run();
