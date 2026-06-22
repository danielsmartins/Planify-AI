import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  
  // Get all users
  const users = await sql`SELECT id FROM users`;
  
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
  
  for (const user of users) {
    // Get unique expense categories for this user
    const txs = await sql`SELECT DISTINCT category FROM transactions WHERE user_id = ${user.id} AND type = 'expense'`;
    
    // Default categories if they have no transactions
    const defaultCats = ['Alimentação', 'Transporte', 'Lazer'];
    const categoriesToAdd = txs.length > 0 ? txs.map(t => t.category) : defaultCats;
    
    for (let i = 0; i < categoriesToAdd.length; i++) {
      const cat = categoriesToAdd[i];
      const color = colors[i % colors.length];
      
      // Check if exists
      const exists = await sql`SELECT id FROM categories WHERE user_id = ${user.id} AND name = ${cat}`;
      if (exists.length === 0) {
        await sql`INSERT INTO categories (user_id, name, color, monthly_limit) VALUES (${user.id}, ${cat}, ${color}, '0')`;
      }
    }
  }
  
  console.log('Categories migrated successfully!');
}

main().catch(console.error);
