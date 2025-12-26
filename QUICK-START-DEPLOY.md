# ⚡ Deploy Rápido - 5 Minutos

## 🚀 Railway (Recomendado)

### Passo 1: Criar Projeto no Railway

1. Acesse: https://railway.app
2. Login com GitHub
3. **New Project** > **Deploy from GitHub repo**
4. Selecione seu repositório
5. Selecione pasta `backend`

### Passo 2: Adicionar PostgreSQL

1. No projeto Railway, clique em **New** > **Database** > **PostgreSQL**
2. Railway criará automaticamente e injetará `DATABASE_URL`

### Passo 3: Configurar Variáveis

No dashboard do Railway, vá em **Variables** e adicione:

```
NODE_ENV=production
PORT=3000
```

As variáveis do PostgreSQL (`DB_HOST`, `DB_USERNAME`, etc.) serão criadas automaticamente a partir do `DATABASE_URL`.

### Passo 4: Obter URL

1. No dashboard, vá em **Settings** > **Networking**
2. Clique em **Generate Domain**
3. Copie a URL (ex: `seu-backend.railway.app`)

### Passo 5: Configurar GitHub Actions (Opcional)

1. **Obter Token Railway:**
   - Railway Dashboard > Account Settings > Tokens
   - Clique em **New Token**
   - Copie o token

2. **Obter Project ID e Service ID:**
   - No projeto Railway, vá em **Settings**
   - Copie o **Project ID**
   - Para Service ID, use o nome do serviço (geralmente é o nome do repositório)

3. **Adicionar Secrets no GitHub:**
   - GitHub > Settings > Secrets and variables > Actions
   - Adicione:
     - `RAILWAY_TOKEN` = seu token
     - `RAILWAY_PROJECT_ID` = ID do projeto
     - `RAILWAY_SERVICE_ID` = nome do serviço (ou deixe vazio para usar o padrão)

### Passo 6: Atualizar App

1. **Atualizar eas.json:**
   ```bash
   # Edite eas.json e adicione a URL de produção
   "EXPO_PUBLIC_API_URL": "https://seu-backend.railway.app"
   ```

2. **Gerar novo APK:**
   ```bash
   npm run build:android:apk
   ```

## ✅ Pronto!

Agora o app se conectará ao backend em produção automaticamente.

## 🔄 Deploy Automático

Após configurar os secrets, cada push para `main` fará deploy automático!

---

**Problemas?** Veja `DEPLOY.md` para troubleshooting.

