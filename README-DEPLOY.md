# 🚀 Deploy Rápido do Backend

## Opção 1: Railway (Recomendado - Mais Fácil)

### Setup Automático

1. **Instalar Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Criar projeto:**
   ```bash
   cd backend
   railway init
   ```

4. **Adicionar PostgreSQL:**
   ```bash
   railway add postgresql
   ```

5. **Configurar variáveis:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

7. **Obter URL:**
   ```bash
   railway domain
   ```

### Deploy Automático via GitHub Actions

1. **Obter token do Railway:**
   - Railway Dashboard > Account Settings > Tokens
   - Copie o token

2. **Adicionar GitHub Secret:**
   - GitHub > Settings > Secrets and variables > Actions
   - Adicione: `RAILWAY_TOKEN` (valor: seu token)
   - Adicione: `RAILWAY_SERVICE_ID` (obtenha com `railway status`)

3. **Push para main:**
   - O workflow `.github/workflows/deploy-backend.yml` fará deploy automático

## Opção 2: Render (Alternativa)

1. Acesse: https://render.com
2. Crie conta com GitHub
3. New > Web Service
4. Conecte seu repositório
5. Configure:
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm run start:prod`
6. Adicione PostgreSQL (New > PostgreSQL)
7. Configure variáveis de ambiente

## Atualizar App para Usar Produção

Após obter a URL do backend em produção:

1. **Atualizar eas.json:**
   ```bash
   npm run update:eas-env
   ```
   Edite manualmente e adicione a URL de produção

2. **Atualizar app.config.js:**
   - Adicione a URL de produção nas variáveis de ambiente

3. **Gerar novo APK:**
   ```bash
   npm run build:android:apk
   ```

## 🔗 Links

- Railway: https://railway.app
- Render: https://render.com
- Guia completo: Ver `DEPLOY.md`

