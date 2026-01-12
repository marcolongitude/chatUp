# 🔧 Troubleshooting - Conexão com Banco de Dados Railway

## 🚨 Problema: "Deploy zerado" ou "Cannot connect to database"

Se o deploy foi "zerado" na Railway, provavelmente um dos seguintes cenários ocorreu:

### Cenário 1: Serviço PostgreSQL foi removido/recriado

**Sintomas**:

- Erro: `ECONNREFUSED` ou `Connection timeout`
- Logs mostram: `Unable to connect to the database`
- Variável `DATABASE_URL` não está definida ou aponta para serviço inexistente

**Solução**:

1. **Verificar se o PostgreSQL existe**:
   - Acesse o dashboard da Railway
   - Verifique se há um serviço PostgreSQL no projeto
   - Se não existir, crie um novo: **+ New** → **Database** → **PostgreSQL**

2. **Reconectar o Backend ao PostgreSQL**:

   ```bash
   # No serviço Backend, vá em Variables
   # Adicione ou atualize:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

3. **Reiniciar o serviço Backend**:
   - Settings → Deployments → Redeploy

### Cenário 2: Variáveis de ambiente não configuradas

**Sintomas**:

- Backend inicia mas não conecta ao banco
- Logs mostram: `host: localhost` (tentando conectar localmente)

**Solução**:

1. **Verificar variáveis obrigatórias**:

   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=sua-chave-secreta
   ```

2. **Verificar referência ao serviço**:
   - A sintaxe `${{Postgres.DATABASE_URL}}` deve estar exatamente assim
   - `Postgres` é o nome do serviço PostgreSQL (case-sensitive)
   - Se o serviço tem outro nome, ajuste: `${{SeuNome.DATABASE_URL}}`

### Cenário 3: SSL não configurado

**Sintomas**:

- Erro: `no pg_hba.conf entry for host`
- Erro: `SSL connection required`

**Solução**:

✅ **Já corrigido!** O `app.module.ts` foi atualizado com:

```typescript
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;
```

Se ainda tiver problemas, verifique se `NODE_ENV=production` está configurado.

### Cenário 4: Migrations não executadas

**Sintomas**:

- Conexão funciona, mas erros de "table does not exist"
- Logs mostram: `relation "users" does not exist`

**Solução**:

**Opção A: Automático (recomendado)**

O `app.module.ts` já está configurado para rodar migrations automaticamente:

```typescript
migrationsRun: process.env.NODE_ENV === 'production';
```

Basta fazer redeploy.

**Opção B: Manual via Railway CLI**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login

# Linkar ao projeto
railway link

# Executar migrations
railway run npm run migration:run
```

**Opção C: Via Railway Shell**

1. Dashboard → Serviço Backend → Settings → Shell
2. Execute:
   ```bash
   npm run migration:run
   ```

### Cenário 5: Banco de dados corrompido ou com dados inconsistentes

**Sintomas**:

- Migrations falham com erros de constraint
- Dados antigos causam conflitos

**Solução (⚠️ CUIDADO: Apaga todos os dados)**:

```bash
# Via Railway Shell ou CLI
railway connect postgres

# No psql, execute:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Saia do psql
\q

# Execute migrations novamente
railway run npm run migration:run
```

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar Logs

```bash
# Via Railway CLI
railway logs

# Ou via Dashboard
# Serviço Backend → Deployments → View Logs
```

**Procure por**:

- `Connected to database` ✅ (sucesso)
- `Unable to connect` ❌ (falha de conexão)
- `ECONNREFUSED` ❌ (serviço não encontrado)
- `authentication failed` ❌ (credenciais erradas)

### 2. Verificar Variáveis de Ambiente

```bash
# Via Railway CLI
railway variables

# Ou via Dashboard
# Serviço Backend → Variables
```

**Verifique**:

- [ ] `DATABASE_URL` está definida
- [ ] `DATABASE_URL` usa referência `${{Postgres.DATABASE_URL}}`
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` está definido

### 3. Testar Conexão Direta

```bash
# Via Railway CLI
railway connect postgres

# Se conectar com sucesso, o problema está na aplicação
# Se falhar, o problema está no PostgreSQL
```

### 4. Verificar Health Check

```bash
# Obter URL do serviço
railway status

# Testar endpoint de health
curl https://seu-servico.railway.app/health
```

**Resposta esperada**:

```json
{
  "status": "ok",
  "timestamp": "2026-01-12T...",
  "service": "chatup-backend"
}
```

## 🛠️ Comandos Úteis

### Railway CLI

```bash
# Ver status dos serviços
railway status

# Ver variáveis de ambiente
railway variables

# Ver logs em tempo real
railway logs --follow

# Conectar ao PostgreSQL
railway connect postgres

# Executar comando no serviço
railway run <comando>

# Abrir shell no serviço
railway shell
```

### Verificação de Conexão

```bash
# Testar se o PostgreSQL está respondendo
railway run node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => console.log('✅ Connected!'))
  .catch(err => console.error('❌ Error:', err.message))
  .finally(() => client.end());
"
```

## 📋 Checklist de Verificação

Quando o banco de dados não conecta, verifique na ordem:

1. [ ] Serviço PostgreSQL existe e está rodando
2. [ ] Variável `DATABASE_URL` está configurada
3. [ ] Referência `${{Postgres.DATABASE_URL}}` está correta
4. [ ] `NODE_ENV=production` está configurado
5. [ ] SSL está habilitado no TypeORM (já corrigido)
6. [ ] Migrations foram executadas
7. [ ] Logs não mostram erros de autenticação
8. [ ] Health check responde com sucesso

## 🚀 Solução Rápida (Reset Completo)

Se nada funcionar, faça um reset completo:

```bash
# 1. Backup (se necessário)
railway connect postgres
# Execute: pg_dump > backup.sql

# 2. Remover serviço Backend
# Dashboard → Backend → Settings → Delete Service

# 3. Remover serviço PostgreSQL (⚠️ apaga dados)
# Dashboard → Postgres → Settings → Delete Service

# 4. Recriar PostgreSQL
# + New → Database → PostgreSQL

# 5. Recriar Backend
# + New → GitHub Repo → Selecionar chatUp
# Root Directory: backend

# 6. Configurar variáveis
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
JWT_SECRET=<gerar novo>

# 7. Deploy automático
# Railway detecta mudanças e faz deploy
```

## 📞 Quando Pedir Ajuda

Se após seguir todos os passos ainda tiver problemas:

1. **Colete informações**:

   ```bash
   railway logs > logs.txt
   railway variables > vars.txt
   railway status > status.txt
   ```

2. **Verifique**:
   - Versão do Node.js: `node --version`
   - Versão do npm: `npm --version`
   - Versão do TypeORM: `npm list typeorm`

3. **Contate suporte**:
   - Railway Discord: [discord.gg/railway](https://discord.gg/railway)
   - GitHub Issues do projeto
   - Railway Help: [help.railway.app](https://help.railway.app)

## 🔗 Links Úteis

- [Railway Database Docs](https://docs.railway.com/guides/postgresql)
- [Railway Variables Docs](https://docs.railway.com/guides/variables)
- [TypeORM Connection Options](https://typeorm.io/data-source-options)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

**Última atualização**: Janeiro 2026
**Status**: ✅ Configuração otimizada para Railway
