# 🔧 Correção: Erro ao Entrar na Tela de Chat

## ✅ Problema Identificado

O erro ao entrar na tela de chat quando seleciona um contato pode estar relacionado a:
1. O `useLiveQuery` sendo chamado antes da collection estar inicializada
2. O Electric SQL não estar conectado quando a query é executada
3. A query tentando acessar propriedades que não existem

## ✅ Correções Aplicadas

### 1. Simplificado `useMessages.ts`
- ✅ Removido try/catch ao redor do hook (não é permitido)
- ✅ Removido opção `enabled` (pode não ser suportada)
- ✅ Adicionado valor padrão `[]` para `messageRows`
- ✅ Query sempre retorna uma query válida, mesmo que vazia

### 2. Validações Melhoradas
- ✅ Verificação de `chatId`, `user` e `contactId` antes de construir query
- ✅ Retorno de query vazia quando dados não estão disponíveis
- ✅ Tratamento de erro no decrypt de mensagens

## 🚀 Como Funciona

1. **Query Vazia**: Quando não há dados necessários, retorna query vazia
2. **Query Completa**: Quando há dados, constrói query completa com filtros
3. **Decrypt**: Mensagens são descriptografadas após serem retornadas da query

## 🔍 Verificações

### Testar no Genymotion
1. Abrir app
2. Selecionar um contato
3. Verificar se carrega a tela de chat sem erro

### Se ainda houver erro
- Verificar logs no console
- Verificar se o Electric SQL está conectado
- Verificar se o `contactId` está sendo passado corretamente

## 📝 Notas

- O `useLiveQuery` deve sempre retornar uma query válida
- A query vazia (`where(() => false)`) é usada quando não há dados
- O erro pode estar relacionado à inicialização do Electric SQL

---

**Status**: ✅ Query simplificada e validações melhoradas  
**Próximo passo**: Testar no Genymotion e verificar se o erro foi resolvido
