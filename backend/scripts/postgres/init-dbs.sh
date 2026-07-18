#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE worknex_agent_memory'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'worknex_agent_memory')\gexec
EOSQL
