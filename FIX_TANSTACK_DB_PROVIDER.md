# 🔧 Correção: TanStack DB DatabaseProvider

## ✅ Problema Identificado

O erro "Unknown expression type: undefined" ocorria porque:
1. O `useLiveQuery` do TanStack DB precisa de um `DatabaseProvider` para funcionar
2. O `DatabaseProvider` não estava configurado no app
3. Sem o provider, o `useLiveQuery` não conseguia acessar o contexto do database

## ✅ Correções Aplicadas

### 1. Criado `src/core/database/DatabaseProvider.tsx`
- ✅ Criado provider para TanStack DB
- ✅ Usa `createDatabase()` do `@tanstack/react-db`
- ✅ Collections são registradas automaticamente quando criadas com `createCollection`

### 2. Adicionado ao `app/_layout.tsx`
- ✅ `DatabaseProvider` adicionado antes do `ElectricProvider`
- ✅ Ordem correta: `DatabaseProvider` → `ElectricProvider` → `AppContent`

**Ordem dos Providers**:
```tsx
<QueryClientProvider>
  <DatabaseProvider>      // ← Novo: TanStack DB context
    <ElectricProvider>    // Electric SQL connection
      <AppContent />
    </ElectricProvider>
  </DatabaseProvider>
</QueryClientProvider>
```

## 🚀 Como Funciona

1. **DatabaseProvider**: Fornece contexto do TanStack DB para `useLiveQuery`
2. **Collections**: Criadas com `createCollection()` são automaticamente registradas
3. **useLiveQuery**: Agora pode acessar o contexto do database e executar queries

## 🔍 Verificações

### Antes de Testar
```bash
# Verificar se não há erros de lint
npm run lint

# Verificar se compila
npx expo start --clear
```

### Após Aplicar Correção
1. **No Genymotion**:
   - Abrir app
   - Selecionar um contato
   - Deve carregar sem erro "Unknown expression type: undefined"

2. **Verificar logs**:
   - Não deve mostrar erro de "Unknown expression type"
   - Deve mostrar mensagens sendo carregadas (mesmo que vazio)

## 📝 Notas

- O `DatabaseProvider` é necessário para qualquer hook do TanStack DB (`useLiveQuery`, etc.)
- As collections criadas com `createCollection()` são automaticamente registradas no database
- O provider deve estar acima de qualquer componente que use `useLiveQuery`

---

**Status**: ✅ `DatabaseProvider` criado e adicionado ao app  
**Próximo passo**: Testar no Genymotion e verificar se o erro foi resolvido
