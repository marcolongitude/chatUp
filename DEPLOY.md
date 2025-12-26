# 🚀 Guia de Deploy do Backend

Este guia explica como fazer deploy do backend para serviços gratuitos com deploy automático via GitHub Actions.

## 📋 Opções de Deploy Gratuito

### 1. Railway (Recomendado) ⭐

**Vantagens:**
- Plano gratuito generoso ($5 de crédito/mês)
- Deploy automático via GitHub
- Suporta PostgreSQL e Docker
- Configuração simples

**Passos:**

1. **Criar conta no Railway:**
   - Acesse: https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto:**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha seu repositório
   - Selecione a pasta `backend`

3. **Configurar variáveis de ambiente:**
   - No dashboard do Railway, vá em "Variables"
   - Adicione as variáveis:
     ```
     NODE_ENV=production
     PORT=3000
     DB_HOST=<host do PostgreSQL>
     DB_PORT=5432
     DB_USERNAME=admin
     DB_PASSWORD=<senha>
     DB_NAME=chatup
     ```

4. **Adicionar PostgreSQL:**
   - No dashboard, clique em "New" > "Database" > "PostgreSQL"
   - Railway criará automaticamente e injetará as variáveis `DATABASE_URL`

5. **Configurar GitHub Secret:**
   - No GitHub, vá em Settings > Secrets and variables > Actions
   - Adicione: `RAILWAY_TOKEN`
   - Obtenha o token em: Railway Dashboard > Account Settings > Tokens

6. **Deploy automático:**
   - O workflow `.github/workflows/deploy-backend.yml` fará deploy automático
   - Ou faça deploy manual: `railway up` (após instalar CLI)

### 2. Render (Alternativa)

**Vantagens:**
- Plano gratuito (com limitações)
- Deploy automático via GitHub
- Suporta PostgreSQL

**Passos:**

1. **Criar conta no Render:**
   - Acesse: https://render.com
   - Faça login com GitHub

2. **Criar Web Service:**
   - Clique em "New" > "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Build Command:** `cd backend && npm install && npm run build`
     - **Start Command:** `cd backend && npm run start:prod`
     - **Environment:** Node

3. **Adicionar PostgreSQL:**
   - Clique em "New" > "PostgreSQL"
   - Escolha plano "Free"
   - Anote as credenciais

4. **Configurar variáveis de ambiente:**
   - No Web Service, vá em "Environment"
   - Adicione:
     ```
     NODE_ENV=production
     PORT=10000
     DB_HOST=<host do PostgreSQL>
     DB_PORT=5432
     DB_USERNAME=<user>
     DB_PASSWORD=<password>
     DB_NAME=chatup
     ```

5. **Configurar GitHub Secrets:**
   - Adicione `RENDER_API_KEY` e `RENDER_SERVICE_ID`
   - Obtenha em: Render Dashboard > Account Settings > API Keys

### 3. Fly.io (Alternativa Avançada)

**Vantagens:**
- Plano gratuito generoso
- Suporta Docker
- Global edge network

**Passos:**

1. Instalar Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Criar app:
   ```bash
   cd backend
   fly launch
   ```

4. Configurar variáveis:
   ```bash
   fly secrets set DB_HOST=... DB_PASSWORD=...
   ```

## 🔧 Configuração do Backend para Produção

### Variáveis de Ambiente Necessárias

```env
NODE_ENV=production
PORT=3000
DB_HOST=<host do banco>
DB_PORT=5432
DB_USERNAME=<usuario>
DB_PASSWORD=<senha>
DB_NAME=chatup
JWT_SECRET=<seu-secret-jwt>
```

### Atualizar app.config.js

Após o deploy, atualize o `app.config.js` com a URL de produção:

```javascript
apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://seu-backend.railway.app',
electricUrl: process.env.EXPO_PUBLIC_ELECTRIC_URL || 'wss://seu-electric.railway.app',
electricApiUrl: process.env.EXPO_PUBLIC_ELECTRIC_API_URL || 'https://seu-electric.railway.app',
```

## 🚀 Deploy Automático via GitHub Actions

O workflow `.github/workflows/deploy-backend.yml` está configurado para:

1. **Trigger:** Push para branch `main` (apenas mudanças em `backend/`)
2. **Build:** Instala dependências e compila o projeto
3. **Deploy:** Faz deploy para Railway (ou Render como fallback)

### Configurar Secrets no GitHub

1. Vá em: `Settings` > `Secrets and variables` > `Actions`
2. Adicione:
   - `RAILWAY_TOKEN` (obtido no Railway Dashboard)
   - `RENDER_API_KEY` (opcional, para fallback)
   - `RENDER_SERVICE_ID` (opcional, para fallback)

## 📝 Checklist de Deploy

- [ ] Conta criada no Railway/Render
- [ ] Projeto criado e conectado ao GitHub
- [ ] PostgreSQL configurado
- [ ] Variáveis de ambiente configuradas
- [ ] GitHub Secrets configurados
- [ ] Workflow testado (push para main)
- [ ] URL de produção atualizada no `app.config.js`
- [ ] Testado cadastro de usuário no app

## 🐛 Troubleshooting

### Backend não inicia
- Verifique logs no dashboard do Railway/Render
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o PostgreSQL está acessível

### Deploy falha no GitHub Actions
- Verifique se os secrets estão configurados corretamente
- Confirme que o token do Railway/Render está válido
- Veja os logs do workflow em "Actions" > "Deploy Backend"

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais nas variáveis de ambiente
- Teste a conexão manualmente

## 🔗 Links Úteis

- Railway: https://railway.app
- Render: https://render.com
- Fly.io: https://fly.io
- GitHub Actions: https://docs.github.com/en/actions

