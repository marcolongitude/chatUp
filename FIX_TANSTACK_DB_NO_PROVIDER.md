# 🔧 Correção: TanStack DB sem DatabaseProvider

## ✅ Problema Identificado

O erro "Unknown expression type: undefined" ocorria porque:
1. Tentamos criar um `DatabaseProvider` que não existe no `@tanstack/react-db`
2. As collections criadas com `electricCollectionOptions` já têm um database interno
3. O `useLiveQuery` funciona diretamente com as collections, sem precisar de um provider separado

## ✅ Correções Aplicadas

### 1. Removido `DatabaseProvider`
- ✅ Arquivo `src/core/database/DatabaseProvider.tsx` removido
- ✅ Removido do `app/_layout.tsx`
- ✅ Collections do `electricCollectionOptions` já têm database interno

### 2. Melhorado tratamento de erro no `useMessages`
- ✅ Adicionado try/catch na query
- ✅ Verificação de `contactId` antes de executar query
- ✅ Retorno de query vazia em caso de erro

## 🚀 Como Funciona

1. **Collections**: Criadas com `createCollection(electricCollectionOptions(...))` já têm database interno
2. **useLiveQuery**: Funciona diretamente com as collections, sem provider
3. **Electric SQL**: Sincroniza automaticamente através do `electricCollectionOptions`

## 🔍 Verificações

### Testar no Genymotion
1. Abrir app
2. Selecionar um contato
3. Verificar se carrega sem erro "Unknown expression type: undefined"

### Se ainda houver erro
- Verificar logs no console
- Verificar se o Electric SQL está conectado
- Verificar se as collections estão sendo inicializadas corretamente

## 📝 Notas

- O `electricCollectionOptions` cria um database interno automaticamente
- Não é necessário criar um `DatabaseProvider` separado
- O `useLiveQuery` funciona diretamente com as collections

---

**Status**: ✅ `DatabaseProvider` removido, collections funcionam diretamente  
**Próximo passo**: Testar no Genymotion e verificar se o erro foi resolvido
