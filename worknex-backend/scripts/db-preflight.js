#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');

const REQUIRED_TABLES = [
  'Organization',
  'User',
  'Department',
  'Attendance',
  'LeaveRequest',
  'LeaveBalance',
  'LeavePolicy',
  'OrganizationSettings',
  'PolicyDocument',
  'LeaveDecisionLog',
];

async function tableExists(prisma, tableName) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = ${tableName}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const prisma = new PrismaClient({ log: [] });
  const missing = [];

  try {
    await prisma.$connect();
    console.log('[db-preflight] Connected to database');

    for (const table of REQUIRED_TABLES) {
      const ok = await tableExists(prisma, table);
      if (ok) {
        console.log(`[db-preflight] OK       ${table}`);
      } else {
        console.error(`[db-preflight] MISSING  ${table}`);
        missing.push(table);
      }
    }
  } catch (err) {
    console.error('[db-preflight] Database connection failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  if (missing.length > 0) {
    console.error('');
    console.error('[db-preflight] FAIL — Database is not migrated.');
    console.error('[db-preflight] Missing tables: ' + missing.join(', '));
    console.error('[db-preflight] Run: cd worknex-backend && npm run db:setup');
    process.exit(1);
  }

  console.log('[db-preflight] PASS — All required tables are present. Database is ready.');
  process.exit(0);
}

main();
