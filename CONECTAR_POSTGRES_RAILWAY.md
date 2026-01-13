# 🔐 Conectar ao PostgreSQL no Railway

## 🚀 Método 1: Via Railway CLI (Mais Fácil)

```bash
cd backend
railway connect postgres --service Postgres-u6Sf
```

Isso abre um shell `psql` conectado diretamente ao banco.

## 📋 Método 2: Obter Credenciais

### Opção A: Script Automático

```bash
./scripts/get-postgres-credentials.sh
```

O script mostra todas as credenciais automaticamente.

### Opção B: Via Dashboard

1. Acesse: [railway.app](https://railway.app)
2. Selecione o projeto: `terrific-balance`
3. Clique no serviço PostgreSQL (ex: `Postgres-u6Sf`)
4. Vá em **Variables**
5. Você verá:
   - `DATABASE_URL` - String completa de conexão
   - `PGHOST` - Host do banco
   - `PGPORT` - Porta (geralmente 5432)
   - `PGUSER` - Usuário
   - `PGPASSWORD` - Senha
   - `PGDATABASE` - Nome do banco

### Opção C: Via CLI

```bash
cd backend

# Ver todas as variáveis do PostgreSQL
railway variables --service Postgres-u6Sf

# Ou ver apenas DATABASE_URL
railway variables --service Postgres-u6Sf | grep DATABASE_URL
```

## 🔌 Conectar com Cliente Externo

### DBeaver, pgAdmin, TablePlus, etc.

Use as credenciais obtidas acima:

- **Host**: `adaptable-wholeness.railway.internal` (ou o host da variável PGHOST)
- **Port**: `5432` (ou o valor de PGPORT)
- **User**: Valor de `PGUSER`
- **Password**: Valor de `PGPASSWORD`
- **Database**: Valor de `PGDATABASE`

**⚠️ IMPORTANTE**: O host interno (`*.railway.internal`) só funciona dentro do Railway. Para conectar de fora, você precisa:

1. **Criar um Public Network** no Railway
2. Ou usar **Railway Proxy** (túnel SSH)

### Railway Proxy (Recomendado)

```bash
# Criar túnel SSH para o PostgreSQL
railway connect postgres --service Postgres-u6Sf --proxy

# Isso cria um túnel local na porta 5432
# Conecte usando: localhost:5432
```

## 📝 Exemplo de Conexão

### Via psql (local)

```bash
# Após criar proxy
psql -h localhost -p 5432 -U admin -d chatup
```

### Via DATABASE_URL

```bash
# Copiar DATABASE_URL do Railway
export DATABASE_URL="postgresql://user:password@host:port/database"

# Conectar
psql "$DATABASE_URL"
```

## 🔍 Verificar Tabelas

Após conectar:

```sql
-- Listar todas as tabelas
\dt

-- Ver estrutura de uma tabela
\d users

-- Ver dados
SELECT * FROM users LIMIT 10;
```

## ✅ Checklist

- [ ] Credenciais obtidas
- [ ] Conectado via Railway CLI ou cliente externo
- [ ] Tabelas verificadas
- [ ] Pronto para usar!

---

**Status**: ✅ Script criado para obter credenciais automaticamente  
**Próximo passo**: Executar script ou usar Railway CLI
