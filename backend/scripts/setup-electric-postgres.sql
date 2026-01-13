-- Script para configurar PostgreSQL para Electric SQL
-- Execute este script no PostgreSQL do Railway após criar as tabelas

-- 1. Garantir que logical replication está habilitado
-- (Isso pode requerer restart do PostgreSQL, mas tentamos configurar)
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- 2. Recarregar configuração (sem restart)
SELECT pg_reload_conf();

-- 3. Criar publicação para Electric SQL (após tabelas existirem)
-- Se as tabelas ainda não existem, execute após TypeORM criar
DO $$
BEGIN
  -- Verificar se tabelas existem
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Criar publicação se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
      CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
      RAISE NOTICE '✅ Publication electric_publication criada';
    ELSE
      RAISE NOTICE 'ℹ️  Publication electric_publication já existe';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Tabelas ainda não existem. Execute este script após TypeORM criar as tabelas.';
  END IF;
END $$;

-- 4. Verificar configuração
SELECT 
  name, 
  setting, 
  source 
FROM pg_settings 
WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');

-- 5. Verificar publicação
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
