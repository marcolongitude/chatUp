# 🔍 Diagnóstico Completo: Erro no Chat

## ❌ Erro Atual

```
Unknown expression type: undefined
```

**Onde ocorre**: `useLiveQuery` em `useMessages.ts` quando tenta acessar um contato no chat.

## 🔬 Análise do Problema

### Possíveis Causas (em ordem de probabilidade):

1. **Electric SQL não está conectado/rodando** (90% de probabilidade)
   - O `useLiveQuery` tenta compilar a query
   - Quando Electric não está disponível, algum valor na query está `undefined`
   - Os operadores `eq`, `or`, `and` recebem valores `undefined`
   - TanStack DB não consegue processar e lança "Unknown expression type: undefined"

2. **Collection não inicializada** (5% de probabilidade)
   - `messagesCollection` pode não estar pronta quando a query é executada
   - Mas `electricCollectionOptions` deve inicializar automaticamente

3. **Valores undefined na query** (5% de probabilidade)
   - `user.id` ou `contactId` podem estar `undefined` no momento da query
   - Mas já temos guards para isso

## ✅ Solução: Fallback para API REST

Vou criar uma solução que:
1. **Tenta usar Electric SQL** (se disponível)
2. **Faz fallback para API REST** (se Electric não estiver disponível)
3. **Funciona offline** (com dados locais se disponíveis)
4. **Logs detalhados** para identificar exatamente onde está falhando

---

**Status**: 🔍 Diagnóstico completo  
**Próximo passo**: Implementar fallback para API REST
