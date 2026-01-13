# 🧪 Guia de Testes: Backend via cURL

Este guia fornece exemplos de comandos `curl` para testar todas as funcionalidades do backend diretamente, sem depender do frontend ou Electric SQL.

## 📋 Pré-requisitos

1. **URL do Backend**: `https://backend-production-38c9.up.railway.app`
2. **Ou local**: `http://localhost:3000` (se testando localmente)

## 🔐 1. Autenticação

### 1.1 Registrar Novo Usuário

```bash
curl -X POST https://backend-production-38c9.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario1@teste.com",
    "password": "senha123",
    "displayName": "Usuário Teste 1"
  }'
```

**Resposta esperada**:
```json
{
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario1@teste.com",
    "displayName": "Usuário Teste 1"
  }
}
```

### 1.2 Fazer Login

```bash
curl -X POST https://backend-production-38c9.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario1@teste.com",
    "password": "senha123"
  }'
```

**Resposta esperada**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario1@teste.com",
    "displayName": "Usuário Teste 1"
  }
}
```

**⚠️ IMPORTANTE**: Salve o `accessToken` para usar nas próximas requisições!

```bash
# Salvar token em variável (bash)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 💬 2. Mensagens (Chat)

### 2.1 Enviar Mensagem

```bash
curl -X POST https://backend-production-38c9.up.railway.app/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "receiverId": "uuid-do-contato",
    "content": "Olá! Esta é uma mensagem de teste"
  }'
```

**Resposta esperada**:
```json
{
  "id": "uuid-da-mensagem",
  "senderId": "uuid-do-usuario",
  "receiverId": "uuid-do-contato",
  "content": "Olá! Esta é uma mensagem de teste",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "isDelivered": false,
  "isRead": false
}
```

### 2.2 Buscar Mensagens de um Contato

```bash
curl -X GET "https://backend-production-38c9.up.railway.app/chat/messages/uuid-do-contato?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada**:
```json
[
  {
    "id": "uuid-da-mensagem",
    "senderId": "uuid-do-usuario",
    "receiverId": "uuid-do-contato",
    "content": "Olá! Esta é uma mensagem de teste",
    "timestamp": "2026-01-12T10:30:00.000Z",
    "isDelivered": false,
    "isRead": false
  }
]
```

## 👥 3. Usuários

### 3.1 Buscar Usuários

```bash
curl -X GET "https://backend-production-38c9.up.railway.app/users/search?query=teste" \
  -H "Authorization: Bearer $TOKEN"
```

### 3.2 Atualizar Perfil

```bash
curl -X PUT https://backend-production-38c9.up.railway.app/users/uuid-do-usuario \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "displayName": "Novo Nome",
    "bio": "Nova bio"
  }'
```

## 🔑 4. Chaves (Signal Protocol)

### 4.1 Upload de Bundle de Chaves

```bash
curl -X POST https://backend-production-38c9.up.railway.app/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "identityKey": "chave-identidade",
    "registrationId": 12345,
    "signedPreKey": {
      "keyId": 1,
      "publicKey": "chave-publica",
      "signature": "assinatura"
    },
    "publicKey": "chave-publica",
    "preKeys": [
      {
        "keyId": 1,
        "publicKey": "chave-prekey-1"
      }
    ]
  }'
```

### 4.2 Buscar Bundle de Chaves de um Usuário

```bash
curl -X GET https://backend-production-38c9.up.railway.app/keys/uuid-do-usuario \
  -H "Authorization: Bearer $TOKEN"
```

### 4.3 Contar PreKeys

```bash
curl -X GET https://backend-production-38c9.up.railway.app/keys/count/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📍 5. Localização

### 5.1 Atualizar Localização

```bash
curl -X PUT https://backend-production-38c9.up.railway.app/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": -23.5505,
    "longitude": -46.6333
  }'
```

### 5.2 Buscar Usuários Próximos

```bash
curl -X GET "https://backend-production-38c9.up.railway.app/location/nearby?radius=5000" \
  -H "Authorization: Bearer $TOKEN"
```

## 🏥 6. Health Check

```bash
curl -X GET https://backend-production-38c9.up.railway.app/health
```

**Resposta esperada**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-12T10:30:00.000Z"
}
```

## 🧪 Script Completo de Teste

Crie um arquivo `test-backend.sh`:

```bash
#!/bin/bash

BASE_URL="https://backend-production-38c9.up.railway.app"
# BASE_URL="http://localhost:3000"  # Para testar localmente

echo "🧪 Testando Backend..."
echo ""

# 1. Health Check
echo "1. Health Check..."
curl -s "$BASE_URL/health" | jq .
echo ""

# 2. Registrar Usuário 1
echo "2. Registrando Usuário 1..."
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123",
    "displayName": "User 1"
  }')
echo "$USER1_RESPONSE" | jq .
USER1_ID=$(echo "$USER1_RESPONSE" | jq -r '.user.id')
echo "User 1 ID: $USER1_ID"
echo ""

# 3. Login Usuário 1
echo "3. Login Usuário 1..."
LOGIN1_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123"
  }')
echo "$LOGIN1_RESPONSE" | jq .
TOKEN1=$(echo "$LOGIN1_RESPONSE" | jq -r '.accessToken')
echo "Token 1: ${TOKEN1:0:50}..."
echo ""

# 4. Registrar Usuário 2
echo "4. Registrando Usuário 2..."
USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "password123",
    "displayName": "User 2"
  }')
echo "$USER2_RESPONSE" | jq .
USER2_ID=$(echo "$USER2_RESPONSE" | jq -r '.user.id')
echo "User 2 ID: $USER2_ID"
echo ""

# 5. Login Usuário 2
echo "5. Login Usuário 2..."
LOGIN2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "password123"
  }')
echo "$LOGIN2_RESPONSE" | jq .
TOKEN2=$(echo "$LOGIN2_RESPONSE" | jq -r '.accessToken')
echo "Token 2: ${TOKEN2:0:50}..."
echo ""

# 6. Enviar Mensagem (User 1 -> User 2)
echo "6. Enviando mensagem (User 1 -> User 2)..."
MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/chat/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"receiverId\": \"$USER2_ID\",
    \"content\": \"Olá User 2! Esta é uma mensagem de teste.\"
  }")
echo "$MESSAGE_RESPONSE" | jq .
echo ""

# 7. Buscar Mensagens (User 2 vendo mensagens de User 1)
echo "7. Buscando mensagens (User 2)..."
curl -s -X GET "$BASE_URL/chat/messages/$USER1_ID?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN2" | jq .
echo ""

# 8. Enviar Mensagem (User 2 -> User 1)
echo "8. Enviando mensagem (User 2 -> User 1)..."
curl -s -X POST "$BASE_URL/chat/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{
    \"receiverId\": \"$USER1_ID\",
    \"content\": \"Olá User 1! Resposta de teste.\"
  }" | jq .
echo ""

# 9. Buscar Mensagens (User 1 vendo mensagens de User 2)
echo "9. Buscando mensagens (User 1)..."
curl -s -X GET "$BASE_URL/chat/messages/$USER2_ID?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN1" | jq .
echo ""

echo "✅ Testes completos!"
```

**Para executar**:
```bash
chmod +x test-backend.sh
./test-backend.sh
```

## 🔍 Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se o token está correto
- Verifique se o header `Authorization: Bearer $TOKEN` está presente

### Erro 502 (Bad Gateway)
- Backend não está rodando
- Verifique logs: `railway logs --service backend`

### Erro 500 (Internal Server Error)
- Verifique logs do backend
- Pode ser erro de conexão com banco de dados

### Erro 404 (Not Found)
- Verifique se a URL está correta
- Verifique se o endpoint existe no backend

## 📝 Notas

- Todos os endpoints (exceto `/health` e `/auth/*`) requerem autenticação
- O token JWT expira após o tempo configurado (padrão: 7 dias)
- Mensagens são armazenadas no PostgreSQL
- Electric SQL sincroniza mensagens automaticamente (se configurado)

---

**Status**: ✅ Endpoint POST para mensagens adicionado  
**Próximo passo**: Testar com curl para verificar se backend está funcionando
