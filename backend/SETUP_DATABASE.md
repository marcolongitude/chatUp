# Setup do Banco de Dados PostgreSQL

## PostgreSQL é um Container Docker

Sim, o PostgreSQL é um container Docker configurado no `backend/deploy/docker-compose.yml`.

## Como Iniciar o Banco de Dados

### 1. Iniciar apenas o PostgreSQL

```bash
cd backend/deploy
docker compose up -d postgres
```

### 2. Iniciar PostgreSQL + ElectricSQL (recomendado)

```bash
cd backend/deploy
docker compose up -d postgres electric
```

### 3. Iniciar todos os serviços (PostgreSQL + ElectricSQL + Backend)

```bash
cd backend/deploy
docker compose up -d
```

## Verificar Status dos Containers

```bash
cd backend/deploy
docker compose ps
```

## Ver Logs do PostgreSQL

```bash
cd backend/deploy
docker compose logs -f postgres
```

## Configuração de Conexão

O backend está configurado para conectar ao PostgreSQL usando:

- **Host**: `localhost` (quando rodando fora do Docker) ou `postgres` (quando rodando dentro do Docker)
- **Porta**: `5432`
- **Database**: `chatup`
- **User**: `admin`
- **Password**: `password`

### Variáveis de Ambiente

Se você estiver rodando o backend **fora do Docker**, configure:

```bash
# Opção 1: Usar DATABASE_URL
export DATABASE_URL=postgresql://admin:password@localhost:5432/chatup

# Opção 2: Usar variáveis individuais
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=admin
export DB_PASSWORD=password
export DB_NAME=chatup
```

## Parar os Containers

```bash
cd backend/deploy
docker compose down
```

## Parar e Remover Volumes (CUIDADO - apaga dados!)

```bash
cd backend/deploy
docker compose down -v
```

## Troubleshooting

### Erro: "Connection refused"

1. Verifique se o container está rodando:
   ```bash
   docker compose ps
   ```

2. Verifique os logs:
   ```bash
   docker compose logs postgres
   ```

3. Verifique se a porta 5432 está disponível:
   ```bash
   netstat -tuln | grep 5432
   ```

### Erro: "Database does not exist"

O banco `chatup` é criado automaticamente pelo container. Se não existir, recrie o container:

```bash
docker compose down -v
docker compose up -d postgres
```

### Verificar Conexão Manualmente

```bash
docker compose exec postgres psql -U admin -d chatup -c "SELECT version();"
```
