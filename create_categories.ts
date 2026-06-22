import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }
  const sql = neon(process.env.DATABASE_URL);
  
  await sql`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "name" text NOT NULL,
      "color" text NOT NULL,
      "monthly_limit" numeric NOT NULL DEFAULT '0',
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `;
  
  console.log('Categories table created successfully!');
}

main().catch(console.error);
