# 🔧 Correção: Electric SQL com Railway

## ✅ Problema Identificado

Quando o usuário seleciona um contato no chat, o erro ocorre porque:
1. As collections do Electric SQL estavam usando fallback para `localhost` ou IP local
2. No build do EAS, as variáveis de ambiente podem não estar disponíveis na inicialização das collections
3. O `config.ts` do Electric tinha fallback para IP local ao invés de Railway

## ✅ Correções Aplicadas

### 1. `src/core/electric/config.ts`
- ✅ Removido fallback para IP local (`192.168.0.14:5133`)
- ✅ Adicionado fallback direto para URL do Railway
- ✅ WebSocket: `wss://backend-production-38c9.up.railway.app`
- ✅ API: `https://backend-production-38c9.up.railway.app`

### 2. Collections Atualizadas
Todas as collections agora usam Railway como fallback:
- ✅ `messagesCollection.ts` - Adicionado `Constants.expoConfig` e fallback Railway
- ✅ `usersCollection.ts` - Adicionado `Constants.expoConfig` e fallback Railway
- ✅ `preKeysCollection.ts` - Adicionado `Constants.expoConfig` e fallback Railway
- ✅ `keysCollection.ts` - Adicionado `Constants.expoConfig` e fallback Railway

**Prioridade de URLs**:
1. `process.env.EXPO_PUBLIC_ELECTRIC_API_URL` (do `eas.json`)
2. `Constants.expoConfig?.extra?.electricApiUrl` (do `app.config.js`)
3. `https://backend-production-38c9.up.railway.app` (fallback Railway)

## 🚀 Próximos Passos

1. **Gerar novo APK**:
   ```bash
   eas build --platform android --profile preview --local
   ```

2. **Instalar no dispositivo**:
   ```bash
   adb install build-*.apk
   ```

3. **Testar seleção de contato**:
   - Abrir app
   - Selecionar um contato
   - Verificar se carrega sem erros

4. **Verificar logs** (se ainda houver erro):
   - Abrir DevTools (shake device → "Debug Remote JS")
   - Verificar logs do Electric SQL
   - Deve mostrar: `✅ Electric client connected successfully`
   - Não deve mostrar erros de conexão

## 🔍 Verificações

### Antes do Build
```bash
# Verificar se eas.json tem URLs do Railway
cat eas.json | grep EXPO_PUBLIC_ELECTRIC

# Deve mostrar:
# "EXPO_PUBLIC_ELECTRIC_URL": "wss://backend-production-38c9.up.railway.app"
# "EXPO_PUBLIC_ELECTRIC_API_URL": "https://backend-production-38c9.up.railway.app"
```

### Após Instalar APK
1. Abrir app
2. Abrir DevTools
3. Verificar logs:
   - `🔍 [API] URL configurada: https://backend-production-38c9.up.railway.app`
   - `✅ Electric client connected successfully`
   - Não deve mostrar `localhost` ou `192.168.0.14`

## 📝 Notas

- As collections são inicializadas no momento do import, então precisam de fallback seguro
- O `Constants.expoConfig` é populado pelo `app.config.js` no build do EAS
- As variáveis de ambiente do `eas.json` são injetadas como `process.env.EXPO_PUBLIC_*`
- O fallback para Railway garante que mesmo sem variáveis, o app tenta conectar ao Railway

---

**Status**: ✅ Todas as collections atualizadas com fallback Railway  
**Próximo passo**: Gerar novo APK e testar
