# ⚡ Configurar Electric SQL no Railway

## Problema

O backend precisa do Electric SQL rodando para sincronização em tempo real. No Railway, precisamos configurar o Electric SQL como um serviço separado.

## Solução: Serviço Separado no Railway

O Railway suporta múltiplos serviços. Vamos criar um serviço separado para Electric SQL.

### Opção 1: Adicionar Serviço Electric SQL no Railway (Recomendado)

1. **No Railway Dashboard:**
   - Vá no seu projeto
   - Clique em **"New"** > **"GitHub Repo"**
   - Selecione o mesmo repositório
   - **IMPORTANTE:** Configure:
     - **Root Directory:** `backend`
     - **Service Name:** `electric-sql` (ou `chatup-electric`)

2. **Configurar como Docker:**
   - No serviço criado, vá em **Settings**
   - Em **"Build Command"**, deixe vazio (ou remova)
   - Em **"Start Command"**, configure:
     ```
     docker run -d \
       -e DATABASE_URL=$DATABASE_URL \
       -e AUTH_MODE=insecure \
       -e LOGICAL_PUBLISHER_HOST=${{Postgres.PGHOST}} \
       -e LOGICAL_PUBLISHER_PORT=${{Postgres.PGPORT}} \
       -e LOGICAL_PUBLISHER_USER=${{Postgres.PGUSER}} \
       -e LOGICAL_PUBLISHER_PASSWORD=${{Postgres.PGPASSWORD}} \
       -e LOGICAL_PUBLISHER_DATABASE=${{Postgres.PGDATABASE}} \
       -p 5133:5133 \
       electricsql/electric:latest
     ```

3. **Ou usar Railway Dockerfile:**
   - Crie um arquivo `backend/Dockerfile.electric`
   - Railway detectará automaticamente

4. **Configurar Variáveis de Ambiente:**
   - No serviço Electric SQL, vá em **Variables**
   - Adicione referências ao PostgreSQL:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
     - `AUTH_MODE` = `insecure` (ou configure autenticação)
     - `LOGICAL_PUBLISHER_HOST` = `${{Postgres.PGHOST}}`
     - `LOGICAL_PUBLISHER_PORT` = `${{Postgres.PGPORT}}`
     - `LOGICAL_PUBLISHER_USER` = `${{Postgres.PGUSER}}`
     - `LOGICAL_PUBLISHER_PASSWORD` = `${{Postgres.PGPASSWORD}}`
     - `LOGICAL_PUBLISHER_DATABASE` = `${{Postgres.PGDATABASE}}`

5. **Expor Porta:**
   - No serviço Electric SQL, vá em **Settings** > **Networking**
   - Gere um domínio público (ex: `electric.railway.app`)
   - Ou use porta interna (5133)

### Opção 2: Usar Docker Compose no Railway (Avançado)

O Railway suporta Docker Compose, mas requer configuração manual:

1. **Criar `railway.toml`:**
   ```toml
   [build]
   builder = "DOCKERFILE"
   dockerfilePath = "backend/Dockerfile.electric"
   
   [deploy]
   startCommand = "docker-compose up"
   ```

2. **Ou usar Railway CLI:**
   ```bash
   railway link
   railway up --service electric
   ```

### Opção 3: Rodar Electric SQL no Mesmo Serviço (Não Recomendado)

Não recomendado porque:
- Electric SQL precisa rodar como processo separado
- Dificulta escalabilidade
- Pode causar problemas de recursos

## Configuração Recomendada

### Estrutura no Railway:

```
Projeto ChatUp
├── chatup-backend (serviço Node.js)
│   ├── Root Directory: backend
│   ├── Start Command: npm run start:prod
│   └── Variables:
│       ├── DATABASE_URL = ${{Postgres.DATABASE_URL}}
│       └── ELECTRIC_URL = ${{Electric.ELECTRIC_URL}}
│
├── Postgres (banco de dados)
│   └── Criado automaticamente
│
└── electric-sql (serviço Docker)
    ├── Root Directory: backend
    ├── Docker Image: electricsql/electric:latest
    ├── Port: 5133
    └── Variables:
        ├── DATABASE_URL = ${{Postgres.DATABASE_URL}}
        ├── AUTH_MODE = insecure
        └── LOGICAL_PUBLISHER_* = ${{Postgres.*}}
```

## Passos Detalhados

### 1. Criar Serviço Electric SQL

1. Railway Dashboard > Projeto > **New** > **GitHub Repo**
2. Selecione o mesmo repositório
3. Configure:
   - **Name:** `electric-sql`
   - **Root Directory:** `backend`
   - **Build Command:** (deixe vazio ou remova)
   - **Start Command:** (veja abaixo)

### 2. Configurar Start Command

No serviço Electric SQL, configure o Start Command como:

```bash
docker run --rm -p 5133:5133 \
  -e DATABASE_URL="${{Postgres.DATABASE_URL}}" \
  -e AUTH_MODE="insecure" \
  -e LOGICAL_PUBLISHER_HOST="${{Postgres.PGHOST}}" \
  -e LOGICAL_PUBLISHER_PORT="${{Postgres.PGPORT}}" \
  -e LOGICAL_PUBLISHER_USER="${{Postgres.PGUSER}}" \
  -e LOGICAL_PUBLISHER_PASSWORD="${{Postgres.PGPASSWORD}}" \
  -e LOGICAL_PUBLISHER_DATABASE="${{Postgres.PGDATABASE}}" \
  electricsql/electric:latest
```

### 3. Configurar Networking

1. No serviço Electric SQL > **Settings** > **Networking**
2. Gere um domínio público (ex: `electric-chatup.railway.app`)
3. Anote a URL para usar no frontend

### 4. Atualizar Backend para Usar Electric

No serviço backend, adicione variável:
- `ELECTRIC_URL` = `${{Electric.ELECTRIC_URL}}` ou URL pública do Electric

### 5. Atualizar Frontend

No `eas.json` e `app.config.js`, atualize:
```javascript
EXPO_PUBLIC_ELECTRIC_URL=wss://electric-chatup.railway.app
EXPO_PUBLIC_ELECTRIC_API_URL=https://electric-chatup.railway.app
```

## Verificação

Após configurar:

1. **Verificar Electric SQL:**
   ```bash
   curl https://electric-chatup.railway.app
   ```

2. **Verificar Backend:**
   ```bash
   curl https://seu-backend.railway.app/health
   ```

3. **Verificar Conexão:**
   - Backend deve conseguir conectar ao Electric SQL
   - Electric SQL deve conseguir conectar ao PostgreSQL

## Troubleshooting

### Electric SQL não inicia

1. Verifique logs no Railway Dashboard
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Verifique se o PostgreSQL está acessível

### Erro de conexão com PostgreSQL

1. Verifique se as variáveis `LOGICAL_PUBLISHER_*` estão corretas
2. Confirme que o PostgreSQL tem `wal_level=logical` (Railway já configura isso)

### Porta não exposta

1. Gere um domínio público no Railway
2. Ou use a URL interna: `${{Electric.INTERNAL_URL}}`

## Alternativa: Render.com

Se o Railway não funcionar bem com Docker, considere usar Render.com que tem melhor suporte para Docker Compose.

