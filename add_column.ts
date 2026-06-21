import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const dbUrlLine = envFile.split('\n').find(l => l.startsWith('DATABASE_URL='));
  const dbUrl = dbUrlLine?.split('=')[1]?.replace(/"/g, '');
  
  if (!dbUrl) throw new Error("No URL");

  const sql = neon(dbUrl);
  
  try {
    await sql`ALTER TABLE users ADD COLUMN telegram_chat_id text UNIQUE;`;
    console.log("Column added successfully!");
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log("Error or column already exists:", e.message);
    }
  }
  process.exit(0);
}
run();
