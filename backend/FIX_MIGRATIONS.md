# 🔧 Fix: Tabelas não existem - Executar Migrations

## ❌ Problema

```
Error: relation "users" does not exist
```

As migrations não foram executadas no banco de dados do Railway.

## ✅ Solução

### Opção 1: Executar Migrations Manualmente (Recomendado)

```bash
cd backend
railway run --service backend npm run migration:run
```

### Opção 2: Usar Synchronize Temporariamente (Desenvolvimento)

Se as migrations não funcionarem, você pode habilitar `synchronize` temporariamente:

1. **Editar `app.module.ts`**:
   ```typescript
   synchronize: true, // Temporariamente para criar tabelas
   ```

2. **Fazer deploy**:
   ```bash
   railway up --service backend --detach
   ```

3. **Depois desabilitar**:
   ```typescript
   synchronize: false, // Voltar para false após criar tabelas
   ```

### Opção 3: Criar Tabelas Manualmente via SQL

Conectar ao PostgreSQL e criar as tabelas:

```bash
railway connect postgres --service Postgres-u6Sf
```

Depois executar SQL baseado nas entities.

## 🔍 Verificar se Migrations Foram Executadas

```bash
railway connect postgres --service Postgres-u6Sf

# No psql:
\dt  # Listar tabelas
```

Deve mostrar:
- `users`
- `messages`
- `keys`
- `pre_keys`

## ✅ Após Executar Migrations

1. **Verificar logs**:
   ```bash
   railway logs --service backend --follow
   ```

2. **Testar criar usuário novamente** no app

---

**Status**: ✅ `data-source.ts` corrigido para usar `DATABASE_URL`  
**Próximo passo**: Executar migrations
