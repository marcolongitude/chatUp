# 🔧 Correção: Electric SQL no Backend

## ✅ Problema Identificado

O erro "Unknown expression type: undefined" no frontend está ocorrendo porque:
1. **Electric SQL pode não estar rodando no Railway**
2. **Electric SQL precisa de shapes configurados** para sincronizar dados
3. **O endpoint `/v1/shape` pode não estar acessível** ou não existir
4. **As collections do frontend estão tentando acessar shapes que não existem**

## ✅ Correções Aplicadas no Frontend

### 1. Desabilitado `useLiveQuery` temporariamente
- ✅ Comentado import do `useLiveQuery`
- ✅ Substituído por estado vazio até Electric SQL estar configurado
- ✅ Tela de chat deve abrir sem erros (mas sem mensagens)

## 🔍 Verificações Necessárias no Backend

### 1. Verificar se Electric SQL está rodando no Railway

```bash
# Verificar logs do backend no Railway
railway logs --service backend

# Procurar por:
# - "✅ Electric SQL está rodando na porta 5133"
# - "⚡ Iniciando Electric SQL..."
# - Erros relacionados ao Docker ou Electric SQL
```

### 2. Verificar se Electric SQL está acessível

```bash
# Testar endpoint de health
curl https://backend-production-38c9.up.railway.app:5133/health

# Ou via Railway CLI
railway connect --service backend
# Depois testar: curl http://localhost:5133/health
```

### 3. Verificar se shapes estão configurados

O Electric SQL precisa de shapes configurados para sincronizar dados. Verificar:
- Se há migrations do Electric SQL em `backend/electric/migrations/`
- Se o Electric SQL está configurado para criar shapes automaticamente
- Se a publicação lógica está configurada no PostgreSQL

### 4. Verificar variáveis de ambiente no Railway

```bash
# Verificar variáveis do backend
railway variables --service backend

# Deve ter:
# - DATABASE_URL
# - ELECTRIC_PORT (ou padrão 5133)
# - AUTH_MODE (ou padrão insecure)
```

## 🚀 Próximos Passos

### Opção 1: Verificar e Corrigir Electric SQL no Railway

1. **Verificar logs do backend**:
   ```bash
   railway logs --service backend
   ```

2. **Verificar se Docker está disponível** no Railway:
   - O script `start-with-electric.js` tenta usar Docker
   - Se não tiver Docker, Electric SQL não vai iniciar

3. **Verificar se Electric SQL está acessível**:
   - Testar endpoint `/health` do Electric SQL
   - Verificar se porta 5133 está exposta

### Opção 2: Usar API REST Temporariamente (Até Electric SQL estar configurado)

Se Electric SQL não estiver funcionando, podemos:
1. Usar API REST para buscar mensagens
2. Desabilitar `useLiveQuery` completamente
3. Usar `useQuery` do React Query ao invés de `useLiveQuery`

## 📝 Notas

- O erro "Unknown expression type: undefined" indica que o TanStack DB não consegue processar a query
- Isso pode acontecer se o Electric SQL não está rodando ou não tem shapes configurados
- A solução temporária desabilita `useLiveQuery` para permitir que a tela de chat abra sem erros

---

**Status**: ✅ Frontend temporariamente desabilitado para evitar erros  
**Próximo passo**: Verificar se Electric SQL está rodando no Railway e configurar shapes
