# 🔧 Correção do Erro de Build no Railway

## Problema

O Railway estava falhando com erro:
```
error: undefined variable 'nodejs-20_x'
```

Isso ocorreu porque o arquivo `nixpacks.toml` tinha sintaxe incorreta.

## Solução Aplicada

1. **Removido `nixpacks.toml`** - O Railway detecta automaticamente Node.js
2. **Simplificado `railway.json`** - Removido buildCommand customizado
3. **Adicionado `engines` no `package.json`** - Para especificar versão do Node.js

## Configuração Atual

### `backend/railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod"
  }
}
```

### `backend/package.json`
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

## Como o Railway Funciona Agora

1. **Detecção Automática:**
   - Railway detecta Node.js a partir do `package.json`
   - Usa a versão especificada em `engines.node`

2. **Build Automático:**
   - Railway executa `npm ci` automaticamente
   - Depois executa `npm run build` (definido em `package.json`)

3. **Start:**
   - Railway executa `npm run start:prod` (definido em `railway.json`)

## Próximos Passos

1. **Commit e Push:**
   ```bash
   git add backend/
   git commit -m "fix: corrigir configuração Railway - remover nixpacks.toml"
   git push origin main
   ```

2. **O Railway fará deploy automático** (se configurado)

3. **Ou faça deploy manual:**
   - No Railway Dashboard, clique em "Redeploy"

## Verificação

Após o deploy, verifique:
- ✅ Build completa sem erros
- ✅ Serviço inicia corretamente
- ✅ Health check responde (`/health`)

## Troubleshooting

### Ainda falha no build

1. **Verifique Root Directory:**
   - Railway Dashboard > Settings > Root Directory = `backend`

2. **Limpe cache:**
   - Deployments > Clear Cache > Redeploy

3. **Verifique logs:**
   - Deployments > [último deploy] > Build Logs

### Node.js version mismatch

Se o Railway usar versão errada do Node.js:
- Verifique se `engines.node` está correto no `package.json`
- Ou adicione variável de ambiente `NODE_VERSION=20` no Railway

