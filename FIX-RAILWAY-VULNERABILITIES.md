# 🔒 Correção de Vulnerabilidades no Railway

## Problema

O Railway está detectando vulnerabilidades no pacote `react-server-dom-webpack@19.0.0`, que não deveria estar no backend.

## Solução

### Opção 1: Limpar e Reinstalar (Recomendado)

1. **No diretório backend:**
   ```bash
   cd backend
   npm run audit:fix
   ```

2. **Ou manualmente:**
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   npm audit fix --force
   ```

### Opção 2: Configurar Railway para Ignorar

O Railway pode estar analisando o `package-lock.json` da raiz. Certifique-se de que:

1. **O Railway está configurado para usar apenas a pasta `backend/`**
   - No dashboard Railway, verifique o "Root Directory" = `backend`

2. **Arquivos criados para ajudar:**
   - `backend/.railwayignore` - Ignora arquivos da raiz
   - `backend/.npmrc` - Configura npm para produção
   - `backend/nixpacks.toml` - Configuração específica do Nixpacks

### Opção 3: Atualizar Dependências Vulneráveis

Se o `react-server-dom-webpack` realmente estiver sendo usado (não deveria):

```bash
cd backend
npm install react-server-dom-webpack@^19.0.2 --save-dev
```

Mas isso não deveria ser necessário, pois o backend não usa React.

## Verificação

Após corrigir, verifique:

```bash
cd backend
npm audit --production
```

Não deve haver vulnerabilidades críticas em dependências de produção.

## Deploy no Railway

Após corrigir:

1. **Commit as mudanças:**
   ```bash
   git add backend/
   git commit -m "fix: corrigir vulnerabilidades de segurança"
   git push origin main
   ```

2. **O Railway fará deploy automático** (se configurado)

3. **Ou faça deploy manual:**
   ```bash
   railway up
   ```

## Troubleshooting

### Railway ainda detecta vulnerabilidades

1. **Verifique o Root Directory:**
   - Railway Dashboard > Settings > Root Directory = `backend`

2. **Limpe o cache do Railway:**
   - No dashboard, vá em "Deployments" > "Clear Cache"

3. **Force rebuild:**
   - No dashboard, clique em "Redeploy" > "Clear Build Cache"

### react-server-dom-webpack ainda aparece

Isso indica que há uma dependência transitiva puxando React. Verifique:

```bash
cd backend
npm ls react-server-dom-webpack
```

Se aparecer, identifique qual dependência está puxando e remova ou atualize.

