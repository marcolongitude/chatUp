# Setup de Desenvolvimento - Backend + Electric SQL

## Arquitetura

O projeto usa **3 serviços principais**:

1. **PostgreSQL** - Banco de dados principal (Docker)
2. **Electric SQL** - Sincronização em tempo real (Docker)
3. **Backend NestJS** - API REST (pode rodar localmente ou no Docker)

## Configuração para Desenvolvimento

### Opção 1: Backend Local + Docker (Recomendado para Dev)

Esta é a configuração recomendada para desenvolvimento, pois permite **hot reload** do backend:

#### 1. Iniciar PostgreSQL + Electric SQL (Docker)

```bash
cd backend/deploy
docker compose up -d postgres electric
```

Isso inicia:
- PostgreSQL na porta `5432`
- Electric SQL na porta `5133` (mapeado de 3000 interno)

#### 2. Verificar se os serviços estão rodando

```bash
cd backend/deploy
docker compose ps
```

Você deve ver:
- `deploy-postgres-1` - Status: Up (healthy)
- `deploy-electric-1` - Status: Up

#### 3. Verificar logs do Electric

```bash
cd backend/deploy
docker compose logs -f electric
```

#### 4. Rodar Backend Localmente (com hot reload)

```bash
cd backend
npm run start:dev
```

O backend vai:
- Conectar ao PostgreSQL em `localhost:5432`
- Conectar ao Electric SQL em `http://localhost:5133` (se configurado)

### Opção 2: Tudo no Docker (Sem Hot Reload)

Se você quiser rodar tudo no Docker:

```bash
cd backend/deploy
docker compose up -d
```

**⚠️ Atenção**: O backend no Docker **NÃO tem hot reload**. Qualquer mudança no código requer rebuild da imagem.

## Variáveis de Ambiente

### Backend Local (npm run start:dev)

Crie um arquivo `.env` no diretório `backend/`:

```bash
# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/chatup
# ou
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=password
DB_NAME=chatup

# Electric SQL (opcional - se o backend precisar se comunicar com Electric)
ELECTRIC_URL=http://localhost:5133

# JWT
JWT_SECRET=dev-secret-key

# Node
NODE_ENV=development
PORT=3000
```

### Frontend (React Native)

O frontend precisa acessar o Electric SQL. Configure no `app.config.js` ou `.env`:

```bash
EXPO_PUBLIC_ELECTRIC_URL=http://192.168.0.18:5133/v1/shape
EXPO_PUBLIC_ELECTRIC_API_URL=http://192.168.0.18:5133
```

**Nota**: Substitua `192.168.0.18` pelo IP da sua máquina na rede local.

## Verificar Conectividade

### Testar PostgreSQL

```bash
docker compose exec postgres psql -U admin -d chatup -c "SELECT version();"
```

### Testar Electric SQL

```bash
# Verificar se está respondendo
curl http://localhost:5133/health

# Ou verificar logs
docker compose logs electric
```

### Testar Backend

```bash
# Se backend estiver rodando localmente
curl http://localhost:3000/health

# Se backend estiver no Docker
curl http://localhost:3000/health
```

## Troubleshooting

### Electric SQL não está acessível

1. **Verificar se está rodando**:
   ```bash
   docker compose ps
   ```

2. **Verificar logs**:
   ```bash
   docker compose logs electric
   ```

3. **Verificar porta**:
   ```bash
   netstat -tuln | grep 5133
   # ou
   lsof -i :5133
   ```

4. **Reiniciar Electric**:
   ```bash
   docker compose restart electric
   ```

### Backend não conecta ao PostgreSQL

1. **Verificar se PostgreSQL está rodando**:
   ```bash
   docker compose ps postgres
   ```

2. **Verificar conexão**:
   ```bash
   docker compose exec postgres psql -U admin -d chatup
   ```

3. **Verificar variáveis de ambiente**:
   ```bash
   # No backend/.env
   DATABASE_URL=postgresql://admin:password@localhost:5432/chatup
   ```

### Frontend não conecta ao Electric

1. **Verificar URL no app.config.js**:
   ```javascript
   electricUrl: process.env.EXPO_PUBLIC_ELECTRIC_URL || 
     (`http://${process.env.LOCAL_IP || '192.168.0.18'}:5133/v1/shape`)
   ```

2. **Verificar IP da máquina**:
   ```bash
   # Linux/Mac
   ip addr show | grep "inet " | grep -v 127.0.0.1
   
   # Ou use o script
   ./scripts/get-local-ip.sh
   ```

3. **Verificar se Electric está acessível externamente**:
   ```bash
   # Do seu dispositivo móvel ou outro computador
   curl http://SEU_IP:5133/health
   ```

## Hot Reload

### Backend Local (npm run start:dev)

✅ **Tem hot reload** - Mudanças no código são detectadas automaticamente

### Backend no Docker

❌ **NÃO tem hot reload** - Requer rebuild da imagem:

```bash
docker compose build backend
docker compose up -d backend
```

### Electric SQL

✅ **Não precisa de hot reload** - É um serviço de sincronização, não tem código customizado

### PostgreSQL

✅ **Não precisa de hot reload** - É apenas banco de dados

## Recomendação para Desenvolvimento

**Use a Opção 1** (Backend Local + Docker para PostgreSQL/Electric):

1. ✅ Hot reload do backend
2. ✅ Debug mais fácil
3. ✅ Logs mais acessíveis
4. ✅ Não precisa rebuild de Docker para mudanças no backend

```bash
# Terminal 1: Docker services
cd backend/deploy
docker compose up -d postgres electric

# Terminal 2: Backend com hot reload
cd backend
npm run start:dev

# Terminal 3: Frontend (se necessário)
npm start
```
