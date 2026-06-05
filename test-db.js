const { PrismaClient } = require('./src/lib/generated/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

let connectionString = process.env.DATABASE_URL;
if (connectionString) {
  if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify');
  } else if (connectionString.includes('sslmode=prefer')) {
    connectionString = connectionString.replace('sslmode=prefer', 'sslmode=no-verify');
  } else if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}sslmode=no-verify`;
  }
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Connection successful:', result);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
