# ⚡ Configuração Electric SQL: Offline-First

## ✅ Configurações Aplicadas

### 1. Frontend - Offline-First

#### `electricClient.ts`
- ✅ Timeout de conexão configurado
- ✅ Logs informativos sobre status de conexão
- ✅ Tratamento de erros melhorado (não trava o app)

#### `ElectricProvider.tsx`
- ✅ Logs de conexão/desconexão
- ✅ App funciona mesmo se Electric não estiver disponível
- ✅ Modo offline suportado

#### `useMessages.ts`
- ✅ Query sempre retorna válida (mesmo quando Electric não está conectado)
- ✅ Retorna query vazia quando Electric não está pronto
- ✅ App funciona offline (sem sincronização em tempo real)

#### `messagesCollection.ts`
- ✅ Shape configuration para sincronização
- ✅ Sync mode: `progressive` (carrega subset imediatamente, sincroniza completo em background)
- ✅ Offline-first: dados locais disponíveis mesmo sem conexão

### 2. Backend - Electric SQL

O backend precisa ter Electric SQL rodando e shapes configurados.

## 🔍 Como Funciona Offline-First

1. **Modo Online**:
   - Electric SQL conecta ao backend
   - Shapes são criados automaticamente quando queries são feitas
   - Dados são sincronizados em tempo real
   - Mudanças locais são enviadas ao servidor

2. **Modo Offline**:
   - Electric SQL usa dados locais (SQLite)
   - Queries funcionam com dados locais
   - Mudanças são enfileiradas
   - Quando conexão volta, sincroniza automaticamente

3. **Transição Online/Offline**:
   - Electric detecta automaticamente
   - Sincroniza dados pendentes quando volta online
   - App continua funcionando em ambos os modos

## 🚀 Próximos Passos no Backend

### 1. Verificar se Electric SQL está rodando

```bash
railway logs --service backend --follow
```

Procurar por:
- `✅ Electric SQL está rodando na porta 5133`
- `⚡ Iniciando Electric SQL...`

### 2. Verificar se Electric SQL está acessível

```bash
# Testar health check
curl https://backend-production-38c9.up.railway.app:5133/health

# Ou via Railway CLI
railway connect --service backend
curl http://localhost:5133/health
```

### 3. Configurar Shapes no Backend (se necessário)

Electric SQL cria shapes automaticamente quando queries são feitas, mas você pode pré-configurar:

```sql
-- No PostgreSQL, verificar se publicação existe
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';
```

### 4. Verificar Logical Replication

```sql
-- Verificar se logical replication está habilitado
SELECT name, setting FROM pg_settings WHERE name = 'wal_level';
-- Deve retornar: logical
```

## 📝 Notas Importantes

- **Offline-First**: O app funciona mesmo sem Electric SQL conectado
- **Shapes Automáticos**: Electric SQL cria shapes quando queries são feitas
- **Sync Progressivo**: Carrega dados da query imediatamente, sincroniza completo em background
- **Erros Tratados**: Se Electric falhar, app continua funcionando (modo offline)

## 🔧 Troubleshooting

### Se "Unknown expression type: undefined" continuar:

1. **Verificar se Electric está conectado**:
   - Logs devem mostrar `✅ Electric client connected successfully`
   - Se não, verificar URL e conexão

2. **Verificar se shapes estão sendo criados**:
   - Electric cria shapes automaticamente
   - Verificar logs do Electric SQL no backend

3. **Verificar se publicação existe**:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
   ```

### Se app não funciona offline:

- Electric SQL usa SQLite local para dados offline
- Verificar se SQLite está configurado corretamente
- Dados locais devem estar disponíveis mesmo sem conexão

---

**Status**: ✅ Configuração offline-first aplicada  
**Próximo passo**: Verificar se Electric SQL está rodando no backend
