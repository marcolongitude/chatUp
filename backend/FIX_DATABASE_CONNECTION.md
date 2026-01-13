# 🔧 Fix: Erro de Conexão com Banco de Dados

## ❌ Problema

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

O backend está tentando conectar em `localhost:5432`, mas no Railway o PostgreSQL está em um serviço separado.

## ✅ Solução Aplicada

Corrigido `app.module.ts` para usar `DATABASE_URL` corretamente.

## 🔍 Verificar Variáveis de Ambiente

### 1. Verificar se DATABASE_URL está configurada

```bash
railway variables --service backend
```

Procure por `DATABASE_URL`. Deve estar assim:
```
DATABASE_URL=${{Postgres-u6Sf.DATABASE_URL}}
```

### 2. Se não estiver, configure:

**Via Dashboard**:
- Backend → Variables → Add Variable
- Name: `DATABASE_URL`
- Value: `${{Postgres-u6Sf.DATABASE_URL}}`

**Via CLI**:
```bash
railway variables set DATABASE_URL='${{Postgres-u6Sf.DATABASE_URL}}' --service backend
```

**⚠️ IMPORTANTE**: Use o nome correto do serviço PostgreSQL:
- Se for `Postgres-u6Sf` → `${{Postgres-u6Sf.DATABASE_URL}}`
- Se for `Postgres` → `${{Postgres.DATABASE_URL}}`
- Verifique no Dashboard qual é o nome exato

### 3. Verificar outras variáveis necessárias

```bash
railway variables set NODE_ENV=production --service backend
railway variables set PORT=3000 --service backend
```

## 🚀 Depois de Configurar

1. **Fazer deploy novamente**:
   ```bash
   railway up --service backend --detach
   ```

2. **Ver logs**:
   ```bash
   railway logs --service backend --follow
   ```

3. **Procurar por**:
   - ✅ `Nest application successfully started`
   - ❌ Não deve mais aparecer `ECONNREFUSED`

## 🔍 Debug

Se ainda não funcionar:

1. **Verificar valor real da variável**:
   ```bash
   railway run --service backend node -e "console.log(process.env.DATABASE_URL)"
   ```

2. **Verificar se PostgreSQL está rodando**:
   ```bash
   railway logs --service Postgres-u6Sf --follow
   ```

3. **Testar conexão manualmente**:
   ```bash
   railway connect postgres --service Postgres-u6Sf
   ```

## ✅ Checklist

- [ ] `DATABASE_URL` configurada com referência ao serviço PostgreSQL
- [ ] Nome do serviço PostgreSQL está correto na referência
- [ ] `NODE_ENV=production` configurado
- [ ] Deploy realizado após configurar variáveis
- [ ] Logs mostram conexão bem-sucedida

---

**Status**: ✅ Código corrigido  
**Próximo passo**: Configurar `DATABASE_URL` no Railway e fazer deploy
