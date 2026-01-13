# 🔧 Correção do Build do Backend - Railway

## ❌ Problema Identificado

O build do backend está falhando com erro:
```
sh: nest: not found
ERROR: failed to build: process "/bin/sh -c npm run build" did not complete successfully
```

## ✅ Causa e Solução

### Causa
O Dockerfile estava usando `npm ci --only=production` no stage de build, mas o comando `nest build` requer `@nestjs/cli` que está em `devDependencies`.

### Solução Aplicada
✅ **Dockerfile corrigido**: Agora usa `npm ci` (sem `--only=production`) no stage de build.

## 🔧 Correções Necessárias

### 1. Dockerfile ✅ (Já Corrigido)

O `Dockerfile.backend` agora instala todas as dependências no stage de build:

```dockerfile
# Stage 1: Build
RUN npm ci && \  # ✅ Agora instala devDependencies também
    npm cache clean --force
```

### 2. Variáveis de Ambiente ⚠️ (Precisa Corrigir)

**Problemas nas variáveis atuais**:

❌ **ERRADO** (com aspas e placeholder):
```bash
DATABASE_URL="${{Postgres.DATABASE_URL}}"
NODE_ENV="production"
PORT="3000"
JWT_SECRET="<gerar chave secreta>"
JWT_EXPIRES_IN="7d"
ELECTRIC_URL="${{Electric.ELECTRIC_URL}}"
ELECTRIC_HOST="electric.railway.internal"
ELECTRIC_PORT="5133"
```

✅ **CORRETO** (sem aspas, valor real):
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
JWT_SECRET=<valor gerado com openssl rand -base64 32>
JWT_EXPIRES_IN=7d
ELECTRIC_URL=${{Electric.ELECTRIC_URL}}
ELECTRIC_HOST=electric.railway.internal
ELECTRIC_PORT=5133
```

### 3. Gerar JWT_SECRET

```bash
# Gerar chave secreta
openssl rand -base64 32

# Copiar o valor gerado e usar na variável JWT_SECRET
```

## 📋 Passo a Passo para Corrigir

### Passo 1: Corrigir Variáveis de Ambiente

1. Acesse [railway.app](https://railway.app)
2. Vá em: **Projeto** → **backend** → **Variables**
3. Para cada variável, **remova as aspas** e **substitua valores placeholder**:

   | Variável | Valor Atual | Valor Correto |
   |----------|-------------|---------------|
   | `DATABASE_URL` | `"${{Postgres.DATABASE_URL}}"` | `${{Postgres.DATABASE_URL}}` |
   | `NODE_ENV` | `"production"` | `production` |
   | `PORT` | `"3000"` | `3000` |
   | `JWT_SECRET` | `"<gerar chave secreta>"` | `<valor gerado>` |
   | `JWT_EXPIRES_IN` | `"7d"` | `7d` |
   | `ELECTRIC_URL` | `"${{Electric.ELECTRIC_URL}}"` | `${{Electric.ELECTRIC_URL}}` |
   | `ELECTRIC_HOST` | `"electric.railway.internal"` | `electric.railway.internal` |
   | `ELECTRIC_PORT` | `"5133"` | `5133` |

### Passo 2: Gerar JWT_SECRET

```bash
# No terminal local
openssl rand -base64 32

# Exemplo de saída:
# aBc123XyZ456DeF789GhI012JkL345MnO678PqR901StU234VwX567YzA890
```

Copie o valor e cole na variável `JWT_SECRET` no Railway.

### Passo 3: Forçar Novo Build

Após corrigir as variáveis:

1. **Via Railway Dashboard**:
   - Vá em: **backend** → **Deployments**
   - Clique em **"Redeploy"**
   - Ou faça um novo commit e push

2. **Via Railway CLI**:
   ```bash
   cd backend
   railway up --service backend
   ```

### Passo 4: Verificar Build

```bash
# Ver logs do build
railway logs --service backend --follow

# Aguarde ver:
# ✅ "Nest application successfully started"
```

## 🔍 Verificação

### Verificar se Build Funcionou

```bash
# Ver logs
railway logs --service backend

# Procurar por:
# ✅ "Nest application successfully started"
# ✅ "Application is running on: http://0.0.0.0:3000"
```

### Testar Health Check

```bash
# Obter URL do backend
railway status --service backend

# Testar
curl https://seu-backend.railway.app/health
```

**Resposta esperada**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T...",
  "service": "chatup-backend"
}
```

## 🐛 Troubleshooting

### Build ainda falha após correções

1. **Verificar se Dockerfile está sendo usado**:
   ```bash
   railway logs --service backend | grep -i dockerfile
   ```
   
   Deve mostrar: `Using Detected Dockerfile` ou `Dockerfile.backend`

2. **Verificar se arquivo railway.backend.json existe**:
   ```bash
   ls -la backend/railway.backend.json
   ```

3. **Forçar rebuild limpo**:
   - Railway Dashboard → backend → Settings → Deployments
   - Clique em "Redeploy" com "Clear build cache"

### Erro: "Cannot connect to database"

1. Verifique se `DATABASE_URL` está sem aspas
2. Verifique se PostgreSQL está rodando: `railway logs --service postgres`
3. Verifique se a referência está correta: `${{Postgres.DATABASE_URL}}`

### Erro: "JWT_SECRET is not defined"

1. Verifique se `JWT_SECRET` tem valor real (não placeholder)
2. Gere novo valor e configure novamente

## ✅ Checklist Final

- [x] Dockerfile corrigido (npm ci sem --only=production)
- [ ] Variáveis de ambiente corrigidas (sem aspas)
- [ ] JWT_SECRET gerado e configurado
- [ ] Novo build iniciado
- [ ] Build completado com sucesso
- [ ] Health check respondendo
- [ ] Backend conectando ao PostgreSQL

## 📚 Referências

- [Railway Variables Docs](https://docs.railway.com/guides/variables)
- [NestJS Deployment](https://docs.nestjs.com/faq/deployment)
- Ver também: `RAILWAY_BACKEND_VARIABLES.md`

---

**Status**: ✅ Dockerfile corrigido | ⚠️ Variáveis precisam ser corrigidas manualmente  
**Próximo passo**: Corrigir variáveis de ambiente no Railway Dashboard
