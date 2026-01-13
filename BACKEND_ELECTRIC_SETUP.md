# 🚀 Backend + Electric SQL - Um Serviço Node.js

## ✅ Configuração Simples

Tudo rodando em **um único serviço Node.js** sem Docker!

## 📋 Como Funciona

1. **Script de inicialização** (`scripts/start-with-electric.js`)

    - Inicia Electric SQL via Docker (se disponível)
    - Inicia Backend NestJS
    - Gerencia ambos os processos

2. **Railway detecta automaticamente**:
    - `package.json` → instala dependências
    - `npm run build` → compila TypeScript
    - `node scripts/start-with-electric.js` → inicia tudo

## 🚀 Setup

### 1. Criar Serviço Backend

```bash
cd backend
railway add --service backend
# Escolha: Empty Service, nome: backend
```

### 2. Linkar Serviço

```bash
railway service link backend
```

### 3. Configurar Variáveis de Ambiente

No Dashboard Railway → **backend** → **Variables**:

```bash
# Backend
DATABASE_URL=${{Postgres-u6Sf.DATABASE_URL}}
NODE_ENV=production
PORT=3000
JWT_SECRET=<gerar: openssl rand -base64 32>
JWT_EXPIRES_IN=7d

# Electric SQL
ELECTRIC_PORT=5133
AUTH_MODE=insecure
LOGICAL_PUBLISHER_HOST=${{Postgres-u6Sf.RAILWAY_PRIVATE_DOMAIN}}
LOGICAL_PUBLISHER_PORT=5432
LOGICAL_PUBLISHER_USER=${{Postgres-u6Sf.POSTGRES_USER}}
LOGICAL_PUBLISHER_PASSWORD=${{Postgres-u6Sf.POSTGRES_PASSWORD}}
LOGICAL_PUBLISHER_DATABASE=${{Postgres-u6Sf.POSTGRES_DB}}
```

**OU via CLI**:

```bash
railway variables set DATABASE_URL='${{Postgres-u6Sf.DATABASE_URL}}'
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set ELECTRIC_PORT=5133
railway variables set AUTH_MODE=insecure
railway variables set LOGICAL_PUBLISHER_HOST='${{Postgres-u6Sf.RAILWAY_PRIVATE_DOMAIN}}'
railway variables set LOGICAL_PUBLISHER_PORT=5432
railway variables set LOGICAL_PUBLISHER_USER='${{Postgres-u6Sf.POSTGRES_USER}}'
railway variables set LOGICAL_PUBLISHER_PASSWORD='${{Postgres-u6Sf.POSTGRES_PASSWORD}}'
railway variables set LOGICAL_PUBLISHER_DATABASE='${{Postgres-u6Sf.POSTGRES_DB}}'
```

### 4. Deploy

```bash
railway up --service backend --detach
```

### 5. Ver Logs

```bash
railway logs --service backend --follow
```

## 🔍 Como Funciona

### Script `start-with-electric.js`

1. **Tenta iniciar Electric SQL via Docker**:

    - Verifica se Docker está disponível
    - Executa `docker run electricsql/electric:latest`
    - Configura variáveis de ambiente

2. **Inicia Backend NestJS**:

    - Executa `node dist/main.js`
    - Usa variáveis de ambiente configuradas

3. **Gerencia processos**:
    - Monitora ambos os processos
    - Encerra Electric quando Backend para
    - Trata sinais SIGTERM/SIGINT

## ⚠️ Requisitos

-   **Docker disponível no Railway**: O script tenta usar Docker para rodar Electric SQL
-   Se Docker não estiver disponível, Electric SQL não iniciará (mas Backend continua)

## ✅ Verificar

```bash
# Ver logs
railway logs --service backend --follow

# Verificar Backend
curl https://seu-backend.railway.app/health

# Verificar Electric (se estiver rodando)
curl http://localhost:5133/health
```

## 🎯 Arquitetura

```
┌─────────────────────────────────┐
│   Serviço Backend (Railway)     │
│   ┌──────────────────────────┐  │
│   │  Node.js Process         │  │
│   │  ┌──────────┬──────────┐ │  │
│   │  │ Electric │ Backend  │ │  │
│   │  │ (Docker) │ (NestJS) │ │  │
│   │  └──────────┴──────────┘ │  │
│   └──────────────────────────┘  │
│            ↓                     │
│   PostgreSQL (Railway)          │
└─────────────────────────────────┘
```

## 📝 Arquivos

-   `backend/scripts/start-with-electric.js` - Script de inicialização
-   `backend/railway.json` - Configuração Railway (Nixpacks)
-   `backend/package.json` - Scripts npm

---

**Status**: ✅ Configurado para rodar Backend + Electric SQL em um serviço  
**Próximo passo**: Criar serviço e fazer deploy
