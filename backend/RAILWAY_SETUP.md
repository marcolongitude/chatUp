# 🚂 Guia de Configuração Railway - ChatUp Backend

## 📋 Pré-requisitos

- Conta na Railway ([railway.app](https://railway.app))
- Railway CLI instalado (opcional): `npm install -g @railway/cli`
- Repositório Git conectado

## 🗄️ Passo 1: Criar Serviço PostgreSQL

1. Acesse seu projeto na Railway
2. Clique em **"+ New"** → **"Database"** → **"PostgreSQL"**
3. A Railway criará automaticamente as seguintes variáveis:
   - `DATABASE_URL` (formato: `postgresql://user:password@host:port/database`)
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

## 🚀 Passo 2: Criar Serviço Backend (NestJS)

### Opção A: Deploy via GitHub (Recomendado)

1. Clique em **"+ New"** → **"GitHub Repo"**
2. Selecione o repositório `chatUp`
3. Configure o **Root Directory**: `backend`
4. A Railway detectará automaticamente o `railway.json`

### Opção B: Deploy via Railway CLI

```bash
cd backend
railway login
railway link
railway up
```

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

No painel do serviço Backend, adicione as seguintes variáveis:

### 🔐 Variáveis Obrigatórias

```bash
# Conexão com PostgreSQL (referência ao serviço)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Porta da aplicação
PORT=3000

# Ambiente
NODE_ENV=production

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# JWT Expiration
JWT_EXPIRES_IN=7d
```

### 📝 Como Gerar JWT_SECRET Seguro

```bash
# Opção 1: OpenSSL
openssl rand -base64 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 🔗 Referência entre Serviços

A sintaxe `${{Postgres.DATABASE_URL}}` cria uma referência ao serviço PostgreSQL.
A Railway substitui automaticamente pelo valor correto.

## 🏗️ Passo 4: Configurar Build e Deploy

A Railway usa o arquivo `railway.json` na raiz do diretório `backend`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 📦 O que acontece no Build:

1. **Nixpacks** detecta automaticamente Node.js
2. Instala dependências: `npm ci`
3. Executa build: `npm run build`
4. Inicia aplicação: `npm run start:prod`

## 🔄 Passo 5: Executar Migrations

### Opção A: Via Railway Dashboard

1. Vá em **"Settings"** → **"Deploy"**
2. Em **"Deploy Hooks"**, adicione um comando de migração:

```bash
npm run migration:run
```

### Opção B: Via Railway CLI (Local)

```bash
railway run npm run migration:run
```

### Opção C: Automático no Deploy

O `app.module.ts` já está configurado para rodar migrations automaticamente em produção:

```typescript
migrationsRun: process.env.NODE_ENV === 'production'
```

## 🌐 Passo 6: Configurar Domínio (Opcional)

1. No serviço Backend, vá em **"Settings"** → **"Networking"**
2. Clique em **"Generate Domain"** para obter um domínio `.railway.app`
3. Ou adicione um domínio customizado

## 🔍 Passo 7: Verificar Deploy

### Logs em Tempo Real

```bash
railway logs
```

### Verificar Saúde da Aplicação

```bash
curl https://seu-dominio.railway.app/health
```

## 🐛 Troubleshooting

### ❌ Erro: "Cannot connect to database"

**Causa**: Variável `DATABASE_URL` não configurada ou incorreta.

**Solução**:
1. Verifique se o serviço PostgreSQL está rodando
2. Confirme que a variável `DATABASE_URL` está usando a referência: `${{Postgres.DATABASE_URL}}`
3. Reinicie o serviço Backend

### ❌ Erro: "Port already in use"

**Causa**: Variável `PORT` não configurada.

**Solução**:
```bash
# Adicione a variável
PORT=3000
```

### ❌ Erro: "Migration failed"

**Causa**: Banco de dados não inicializado ou migrations com erro.

**Solução**:
```bash
# Conecte ao PostgreSQL via Railway CLI
railway connect postgres

# Execute migrations manualmente
railway run npm run migration:run
```

### ❌ Erro: "Module not found"

**Causa**: Dependências não instaladas corretamente.

**Solução**:
1. Verifique o `package.json` e `package-lock.json`
2. Force rebuild:
   - Vá em **"Settings"** → **"Deployments"**
   - Clique em **"Redeploy"**

### 🔒 Erro: "Security vulnerabilities detected"

**Causa**: Dependências com vulnerabilidades conhecidas.

**Solução**:
```bash
# Atualize dependências vulneráveis
npm audit fix

# Ou atualize manualmente
npm install react@^19.0.2 react-dom@^19.0.2

# Commit e push
git add package.json package-lock.json
git commit -m "fix: update dependencies to fix security vulnerabilities"
git push
```

## 📊 Monitoramento

### Métricas Disponíveis

- **CPU Usage**: Uso de CPU do serviço
- **Memory Usage**: Uso de memória
- **Network**: Tráfego de entrada/saída
- **Deployments**: Histórico de deploys

### Alertas

Configure alertas em **"Settings"** → **"Alerts"** para:
- Deploy failures
- High CPU usage
- High memory usage
- Service crashes

## 🔐 Segurança

### Checklist de Segurança

- [ ] `JWT_SECRET` é uma string aleatória forte (32+ caracteres)
- [ ] `NODE_ENV=production` está configurado
- [ ] `synchronize: false` no TypeORM (migrations apenas)
- [ ] CORS configurado adequadamente
- [ ] Variáveis sensíveis não estão no código
- [ ] PostgreSQL não está exposto publicamente (apenas via Railway)

## 🚀 Deploy Automático via GitHub Actions

O projeto já possui workflow configurado em `.github/workflows/deploy-backend.yml`.

### Configurar Secrets no GitHub

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes secrets:

```bash
RAILWAY_TOKEN=seu-token-railway
RAILWAY_SERVICE_ID=id-do-servico-backend
```

### Obter Railway Token

```bash
railway login
railway whoami --token
```

### Obter Service ID

```bash
railway status
# Ou via dashboard: Settings → General → Service ID
```

## 📚 Recursos Adicionais

- [Railway Docs](https://docs.railway.com/)
- [Railway CLI Reference](https://docs.railway.com/reference/cli-api)
- [NestJS Deployment](https://docs.nestjs.com/faq/deployment)
- [TypeORM Migrations](https://typeorm.io/migrations)

## 🆘 Suporte

- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Help Center: [help.railway.app](https://help.railway.app)
- GitHub Issues: Reporte problemas no repositório

---

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0
