# 🧹 Limpeza de Configuração Railway - Remover Electric SQL

## ⚠️ Problema

Erro: `Dockerfile '/Dockerfile.electric' does not exist`

**Causa**: A Railway tem um serviço configurado para Electric SQL que está tentando usar um Dockerfile que foi removido.

## ✅ Solução: Remover Serviço Electric SQL

### Opção 1: Via Railway Dashboard (Recomendado)

1. **Acesse o Dashboard da Railway**:
   - Vá para [railway.app](https://railway.app)
   - Selecione o projeto `chatUp`

2. **Identifique o serviço Electric SQL**:
   - Procure por um serviço chamado "Electric" ou "electric-sql"
   - Ou qualquer serviço que mostre erro sobre `Dockerfile.electric`

3. **Remover o serviço**:
   - Clique no serviço Electric
   - Vá em **Settings** → **Danger Zone**
   - Clique em **Delete Service**
   - Confirme a remoção

4. **Verificar serviços restantes**:
   - Você deve ter apenas 2 serviços:
     - ✅ **Postgres** (Database)
     - ✅ **Backend** (NestJS)

### Opção 2: Via Railway CLI

```bash
# Listar todos os serviços
railway status

# Identificar o ID do serviço Electric
# Procure por um serviço com erro ou relacionado ao Electric

# Remover o serviço (substitua SERVICE_ID pelo ID real)
railway service delete SERVICE_ID
```

## 🔍 Verificação

Após remover o serviço Electric SQL:

1. **Verifique os serviços ativos**:

   ```bash
   railway status
   ```

   **Resultado esperado**:

   ```
   ✅ Postgres (postgres)
   ✅ Backend (backend)
   ```

2. **Verifique se o Backend está deployando**:
   - Dashboard → Backend → Deployments
   - Deve mostrar um novo deploy em andamento
   - Logs não devem mais mencionar `Dockerfile.electric`

3. **Teste o health check**:
   ```bash
   curl https://seu-backend.railway.app/health
   ```

## 📝 Por que Remover Electric SQL?

O Electric SQL foi **descontinuado** neste projeto porque:

1. **Complexidade desnecessária** para o caso de uso atual
2. **WebSockets já implementados** para chat em tempo real
3. **Firestore** é usado no frontend para sincronização
4. **Simplificação da arquitetura** reduz custos e manutenção

## 🔄 Arquitetura Atual (Sem Electric SQL)

```
┌─────────────────┐
│  React Native   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│   Firebase      │  │   Railway    │
│   (Firestore)   │  │   Backend    │
└─────────────────┘  └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  PostgreSQL  │
                     └──────────────┘
```

**Comunicação em tempo real**:

- Frontend ↔ Backend: WebSockets (Socket.io)
- Frontend ↔ Firestore: Real-time listeners
- Backend ↔ PostgreSQL: TypeORM

## 🗑️ Arquivos Relacionados ao Electric SQL (Mantidos para Referência)

Os seguintes arquivos ainda existem no repositório mas **não são usados** no deploy:

```
backend/
├── electric/                    # Schemas e migrations (não usado)
│   ├── init-postgres.sql
│   ├── reset-database.sql
│   ├── schema.sql
│   └── migrations/
├── src/infra/database/
│   ├── electric.module.ts       # Módulo (importado mas não essencial)
│   └── electric.service.ts      # Service (não usado ativamente)
└── docker-compose.yml           # Apenas para dev local
```

**Nota**: Esses arquivos podem ser removidos no futuro se não forem mais necessários.

## 🚀 Próximos Passos Após Limpeza

1. **Commit das mudanças**:

   ```bash
   git add .
   git commit -m "fix: remove Electric SQL service and Dockerfile references"
   git push origin refatorar-app
   ```

2. **Verificar deploy automático**:
   - Railway detectará as mudanças
   - Fará novo deploy do Backend
   - Não tentará mais usar `Dockerfile.electric`

3. **Configurar variáveis de ambiente** (se ainda não configurou):
   - Ver **[RAILWAY_SETUP.md](./RAILWAY_SETUP.md)**

4. **Testar aplicação**:

   ```bash
   # Health check
   curl https://seu-backend.railway.app/health

   # Test auth endpoint
   curl -X POST https://seu-backend.railway.app/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","displayName":"Test User"}'
   ```

## ❓ FAQ

### Q: Posso remover os arquivos do Electric SQL do repositório?

**A**: Sim, mas recomendo manter por enquanto caso precise reverter. Você pode removê-los depois que confirmar que tudo está funcionando.

### Q: O WebSocket ainda funciona sem Electric SQL?

**A**: Sim! O WebSocket (Socket.io) está implementado em `src/infra/websockets/chat.gateway.ts` e funciona independentemente do Electric SQL.

### Q: Preciso recriar o banco de dados?

**A**: Não. O PostgreSQL continua funcionando normalmente. Apenas o serviço Electric SQL (que era um middleware) foi removido.

### Q: E se eu quiser usar Electric SQL no futuro?

**A**: Você pode recriar o serviço a qualquer momento:

1. Restaurar o `railway.dockerfile`
2. Criar novo serviço na Railway
3. Configurar variáveis de ambiente
4. Conectar ao PostgreSQL

## 🆘 Troubleshooting

### Erro persiste após remover serviço

1. **Limpar cache do Railway**:
   - Dashboard → Backend → Settings → Deployments
   - Clique em **"Redeploy"** com **"Clear build cache"**

2. **Verificar variáveis de ambiente**:
   - Remova qualquer variável relacionada ao Electric:
     - `ELECTRIC_URL`
     - `ELECTRIC_HOST`
     - `ELECTRIC_PORT`
     - `ELECTRIC_WS_URL`

3. **Verificar GitHub Actions**:
   - Se usar CI/CD, verifique se não há referências ao Electric no workflow

### Backend não inicia após remoção

1. **Verificar logs**:

   ```bash
   railway logs
   ```

2. **Verificar se ElectricModule está causando erro**:
   - Se sim, remova a importação em `src/app.module.ts`:

   ```typescript
   // Remover esta linha:
   import { ElectricModule } from './infra/database/electric.module';

   // E remover do array imports:
   imports: [
     // ...
     // ElectricModule,  // <-- Comentar ou remover
   ];
   ```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `railway logs`
2. Consulte [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
3. Consulte [DATABASE_TROUBLESHOOTING.md](./DATABASE_TROUBLESHOOTING.md)
4. Abra uma issue no GitHub
5. Railway Discord: [discord.gg/railway](https://discord.gg/railway)

---

**Última atualização**: Janeiro 2026  
**Status**: ✅ Electric SQL removido, arquitetura simplificada
