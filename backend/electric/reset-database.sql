-- Script para resetar o banco de dados (apagar todos os dados)
-- ATENÇÃO: Isso apaga TODOS os dados do banco!
-- Use apenas em desenvolvimento

-- Desabilitar constraints temporariamente
SET session_replication_role = 'replica';

-- Apagar dados de todas as tabelas (respeitando foreign keys)
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE pre_keys CASCADE;
TRUNCATE TABLE keys CASCADE;
TRUNCATE TABLE users CASCADE;

-- Reabilitar constraints
SET session_replication_role = 'origin';

-- Opcional: Se quiser recriar as tabelas do zero, descomente as linhas abaixo:
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS pre_keys CASCADE;
-- DROP TABLE IF EXISTS keys CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

