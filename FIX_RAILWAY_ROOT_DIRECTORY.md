# 🔧 Correção: Railway executando Expo no Backend

## ❌ Problema

O Railway está executando `expo start` no serviço backend, o que está errado. Os logs mostram:

```
npm error command sh -c expo start
```

**Causa**: O Railway está usando o `package.json` da **raiz** do projeto (que tem Expo) ao invés do `package.json` do **backend**.

## ✅ Solução: Configurar Root Directory

O serviço backend no Railway precisa ter o **Root Directory** configurado para `backend/`.

### Opção 1: Via Railway Dashboard (Recomendado)

1. Acesse o **Dashboard do Railway**: [railway.app](https://railway.app)
2. Selecione o projeto `chatUp`
3. Clique no serviço **backend**
4. Vá em **Settings** → **Service Settings**
5. Procure por **Root Directory** ou **Working Directory**
6. Configure para: `backend`
7. Salve as alterações
8. O Railway vai fazer redeploy automaticamente

### Opção 2: Via Railway CLI

```bash
# Verificar configuração atual
railway status --service backend

# Linkar serviço backend
cd backend
railway service link backend

# Verificar se está no diretório correto
pwd  # Deve mostrar: .../chatUp/backend

# Fazer deploy do diretório backend
railway up --service backend
```

### Opção 3: Criar Serviço Novamente (se necessário)

Se o serviço não tiver Root Directory configurável:

1. **Deletar serviço atual** (se necessário):
   - Dashboard → backend → Settings → Danger Zone → Delete Service

2. **Criar novo serviço**:
   ```bash
   cd backend
   railway add --service backend
   # Escolha: Empty Service ou GitHub Repo
   # Configure Root Directory: backend
   ```

3. **Linkar serviço**:
   ```bash
   railway service link backend
   ```

4. **Configurar variáveis de ambiente**:
   ```bash
   railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   ```

5. **Fazer deploy**:
   ```bash
   railway up --service backend
   ```

## 🔍 Verificação

Após configurar o Root Directory, verifique os logs:

```bash
railway logs --service backend --follow
```

**Deve mostrar**:
- ✅ `npm run build` (compilando TypeScript)
- ✅ `node scripts/start-with-electric.js` ou `node dist/main.js`
- ✅ `🚀 Iniciando NestJS Backend...`
- ✅ `✅ Backend rodando na porta 3000`

**NÃO deve mostrar**:
- ❌ `expo start`
- ❌ `npm error command sh -c expo start`

## 📝 Notas

- O `railway.json` no diretório `backend/` será usado automaticamente
- O `package.json` do backend tem `"name": "backend"` e scripts do NestJS
- O `package.json` da raiz tem `"name": "chatup"` e scripts do Expo

---

**Status**: ⚠️ Root Directory precisa ser configurado  
**Próximo passo**: Configurar Root Directory no Railway Dashboard
