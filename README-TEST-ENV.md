# Ambiente de Testes para Dispositivos Físicos

Este guia explica como configurar o ambiente para testar o app em dispositivos físicos Android/iOS conectados à mesma rede WiFi do seu computador.

## 🚀 Configuração Rápida

### 1. Configurar o Ambiente

Execute o script de configuração automática:

```bash
npm run setup:test-env
```

Ou manualmente:

```bash
./scripts/setup-test-env.sh
```

Este script irá:
- Detectar automaticamente o IP local da sua máquina
- Configurar as variáveis de ambiente no arquivo `.env`
- Configurar as URLs da API e Electric SQL

### 2. Verificar Configuração

Verifique se tudo está configurado corretamente:

```bash
npm run check:test-env
```

Ou:

```bash
./scripts/check-test-env.sh
```

### 3. Iniciar os Serviços

#### Backend (NestJS)
```bash
cd backend
npm run start:dev
```

O backend já está configurado para escutar em `0.0.0.0:3000`, permitindo conexões de todas as interfaces de rede.

#### Docker Compose (PostgreSQL + Electric SQL)
```bash
cd backend
docker compose up -d
```

Isso iniciará:
- PostgreSQL na porta `5432`
- Electric SQL na porta `5133`

Ambos já estão expostos para todas as interfaces de rede.

### 4. Configurar Firewall (se necessário)

Se você estiver usando firewall (ufw), permita as portas:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5133/tcp
```

### 5. Verificar IP Local

Para verificar o IP local da sua máquina:

```bash
./scripts/get-local-ip.sh
```

Ou manualmente:

```bash
ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1
```

## 📱 Configuração do App

### Variáveis de Ambiente

O app usa as seguintes variáveis de ambiente (definidas no `.env`):

- `EXPO_PUBLIC_API_URL`: URL da API backend (ex: `http://192.168.0.14:3000`)
- `EXPO_PUBLIC_ELECTRIC_URL`: URL WebSocket do Electric SQL (ex: `ws://192.168.0.14:5133`)
- `EXPO_PUBLIC_ELECTRIC_API_URL`: URL HTTP do Electric SQL (ex: `http://192.168.0.14:5133`)

### Prioridade de Configuração

O app usa a seguinte ordem de prioridade para determinar as URLs:

1. **Variáveis de ambiente** (`EXPO_PUBLIC_*`)
2. **app.config.js** (`extra.apiUrl`, `extra.electricUrl`, etc.)
3. **Fallback por plataforma**:
   - Android: IP da rede local (192.168.0.14 por padrão)
   - iOS Simulator/Web: localhost

## 🔧 Configuração Manual

Se o script automático não funcionar, você pode configurar manualmente:

1. Edite o arquivo `.env` na raiz do projeto:

```env
LOCAL_IP=192.168.0.14
EXPO_PUBLIC_API_URL=http://192.168.0.14:3000
EXPO_PUBLIC_ELECTRIC_URL=ws://192.168.0.14:5133
EXPO_PUBLIC_ELECTRIC_API_URL=http://192.168.0.14:5133
```

2. Substitua `192.168.0.14` pelo IP real da sua máquina na rede local.

## 🏗️ Gerar APK para Testes

### Opção 1: Build Local (Recomendado para testes rápidos)

```bash
npm run build:android:dev
```

Ou:

```bash
eas build --platform android --profile preview --local
```

### Opção 2: Build na Nuvem

```bash
npm run build:android:apk:cloud
```

Ou:

```bash
eas build --platform android --profile production
```

## ✅ Verificação

### Verificar Backend

```bash
curl http://localhost:3000/health
# ou
curl http://192.168.0.14:3000/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T...",
  "service": "chatup-backend"
}
```

### Verificar Electric SQL

```bash
curl http://localhost:5133
# ou
curl http://192.168.0.14:5133
```

### Verificar Docker

```bash
cd backend
docker compose ps
```

Deve mostrar os containers `chatup_postgres` e `chatup_electric` rodando.

## 🐛 Troubleshooting

### Dispositivo não consegue conectar

1. **Verifique se está na mesma rede WiFi**
   - O dispositivo físico e o computador devem estar na mesma rede

2. **Verifique o IP**
   ```bash
   ./scripts/get-local-ip.sh
   ```
   - Certifique-se de que o IP no `.env` corresponde ao IP real

3. **Verifique o firewall**
   ```bash
   sudo ufw status
   ```
   - Certifique-se de que as portas 3000 e 5133 estão abertas

4. **Teste a conectividade**
   - No dispositivo, abra um navegador e acesse: `http://SEU_IP:3000/health`
   - Deve retornar o JSON de health check

### Backend não responde

1. Verifique se está rodando:
   ```bash
   cd backend && npm run start:dev
   ```

2. Verifique os logs para erros

3. Verifique se está escutando em `0.0.0.0`:
   ```bash
   netstat -tulpn | grep 3000
   ```
   Deve mostrar `0.0.0.0:3000` ou `:::3000`

### Electric SQL não conecta

1. Verifique se o container está rodando:
   ```bash
   docker ps | grep electric
   ```

2. Verifique os logs:
   ```bash
   docker logs chatup_electric
   ```

3. Verifique se o PostgreSQL está acessível do container Electric

## 📝 Notas Importantes

- **IP Dinâmico**: Se o IP da sua máquina mudar (após reiniciar o roteador, por exemplo), execute `npm run setup:test-env` novamente
- **Rede WiFi**: Certifique-se de que o dispositivo e o computador estão na mesma rede WiFi
- **Firewall**: Alguns firewalls podem bloquear conexões mesmo com as regras configuradas
- **CORS**: O backend já está configurado com `app.enableCors()` para permitir todas as origens

## 🔒 Segurança

⚠️ **Atenção**: Esta configuração é apenas para desenvolvimento e testes locais. 

Para produção:
- Use HTTPS/WSS
- Configure autenticação adequada
- Use variáveis de ambiente seguras
- Configure CORS adequadamente
- Use um servidor de produção (não `0.0.0.0` em produção)

