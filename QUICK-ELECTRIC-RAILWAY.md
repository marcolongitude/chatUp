# ⚡ Configurar Electric SQL no Railway - Guia Rápido

## 🎯 Objetivo

Criar um serviço separado no Railway para rodar o Electric SQL, que é necessário para sincronização em tempo real.

## 📋 Passos

### 1. Criar Serviço Electric SQL no Railway

1. **No Railway Dashboard:**
   - Vá no seu projeto
   - Clique em **"New"** > **"Empty Service"** (ou **"GitHub Repo"**)
   - Nome: `electric-sql`

2. **Configurar como Docker:**
   - No serviço criado, vá em **Settings**
   - **Source:** Docker Image
   - **Docker Image:** `electricsql/electric:latest`
   - **Port:** `5133`

### 2. Configurar Variáveis de Ambiente

No serviço Electric SQL, vá em **Variables** e adicione:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_MODE=insecure
LOGICAL_PUBLISHER_HOST=${{Postgres.PGHOST}}
LOGICAL_PUBLISHER_PORT=${{Postgres.PGPORT}}
LOGICAL_PUBLISHER_USER=${{Postgres.PGUSER}}
LOGICAL_PUBLISHER_PASSWORD=${{Postgres.PGPASSWORD}}
LOGICAL_PUBLISHER_DATABASE=${{Postgres.PGDATABASE}}
```

**Nota:** `${{Postgres.*}}` são referências automáticas do Railway ao serviço PostgreSQL.

### 3. Expor Porta Publicamente

1. No serviço Electric SQL > **Settings** > **Networking**
2. Clique em **"Generate Domain"**
3. Anote a URL (ex: `electric-chatup.railway.app`)

### 4. Atualizar Backend

No serviço backend, adicione variável:

```
ELECTRIC_URL=https://electric-chatup.railway.app
ELECTRIC_WS_URL=wss://electric-chatup.railway.app
```

Ou use referência de serviço (se Railway suportar):
```
ELECTRIC_URL=${{Electric.ELECTRIC_URL}}
```

### 5. Atualizar Frontend

No `eas.json`, atualize:

```json
"EXPO_PUBLIC_ELECTRIC_URL": "wss://electric-chatup.railway.app",
"EXPO_PUBLIC_ELECTRIC_API_URL": "https://electric-chatup.railway.app"
```

## ✅ Verificação

1. **Verificar Electric SQL:**
   ```bash
   curl https://electric-chatup.railway.app
   ```

2. **Verificar Backend:**
   ```bash
   curl https://seu-backend.railway.app/health
   ```

3. **Verificar Logs:**
   - Railway Dashboard > Electric SQL > Logs
   - Deve mostrar: "Electric SQL started successfully"

## 🐛 Troubleshooting

### Electric SQL não inicia

- Verifique se todas as variáveis `LOGICAL_PUBLISHER_*` estão configuradas
- Confirme que o PostgreSQL está rodando
- Veja os logs no Railway Dashboard

### Erro de conexão

- Verifique se `DATABASE_URL` está correto
- Confirme que o PostgreSQL tem `wal_level=logical` (Railway já configura)

### Porta não exposta

- Gere um domínio público no Railway
- Ou use a URL interna do serviço

## 📚 Documentação Completa

Veja `RAILWAY-ELECTRIC-SETUP.md` para mais detalhes.

