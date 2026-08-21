/* eslint-disable */
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('ERRO: DATABASE_URL não encontrada no ambiente. Certifique-se de executar com --env-file=.env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const queryStr = process.argv.slice(2).join(' ').trim();
  if (!queryStr) {
    console.log('Uso: node --env-file=.env.local .agents/skills/db-inspector/scripts/query.cjs "<SQL_QUERY>"');
    console.log('Exemplo: node --env-file=.env.local .agents/skills/db-inspector/scripts/query.cjs "SELECT id, name, email FROM users"');
    process.exit(1);
  }

  try {
    const results = await sql.query(queryStr);
    if (Array.isArray(results) && results.length > 0) {
      console.log(`\nResultados (${results.length} registros):`);
      console.table(results);
    } else {
      console.log('\nQuery executada com sucesso.');
      console.log(results);
    }
  } catch (err) {
    console.error('\nErro ao executar query:', err.message);
    process.exit(1);
  }
}

main();
