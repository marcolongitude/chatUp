# 🔧 Fix: NETWORK ERROR no Android 15

## ❌ Problema

Erro `NETWORK ERROR` no dispositivo físico Android 15, mas funciona no emulador Genymotion.

## ✅ Correções Aplicadas

### 1. AndroidManifest.xml

Adicionado:
- `android:usesCleartextTraffic="true"` - Permite tráfego HTTP/HTTPS
- `android:networkSecurityConfig="@xml/network_security_config"` - Configuração de segurança de rede

### 2. network_security_config.xml

Criado arquivo em `android/app/src/main/res/xml/network_security_config.xml`:
- Permite HTTPS para domínios Railway
- Permite HTTP para desenvolvimento local
- Configuração específica para Android 15

### 3. Logs de Debug

Adicionado logs no `src/services/api/index.ts` para verificar qual URL está sendo usada:
- Mostra a URL configurada
- Mostra se `EXPO_PUBLIC_API_URL` está definido
- Mostra se `Constants.extra.apiUrl` está definido

## 🚀 Próximos Passos

### 1. Rebuild do App

```bash
# Limpar cache e rebuild
npx expo start --clear

# Ou rebuild completo
npx expo run:android
```

### 2. Verificar Logs

No dispositivo, abra o DevTools e verifique os logs:
- Deve mostrar: `🔍 [API] URL configurada: https://backend-production-38c9.up.railway.app`
- Se mostrar `http://192.168.0.14:3000`, significa que o `.env` não está sendo carregado

### 3. Se a URL estiver errada

O problema pode ser que o `.env` não está sendo carregado no build. Soluções:

**Opção A: Rebuild com .env carregado**
```bash
# Garantir que .env existe
cat .env | grep EXPO_PUBLIC_API_URL

# Rebuild
npx expo start --clear
```

**Opção B: Usar app.config.js diretamente**
Edite `app.config.js` e adicione a URL diretamente:
```javascript
apiUrl: 'https://backend-production-38c9.up.railway.app',
```

## 🔍 Verificar

Após rebuild, no dispositivo:
1. Abra DevTools (shake device → "Debug Remote JS")
2. Verifique os logs:
   - `🔍 [API] URL configurada: ...`
   - Deve ser `https://backend-production-38c9.up.railway.app`
3. Tente criar usuário novamente

## ✅ Arquivos Modificados

- ✅ `android/app/src/main/AndroidManifest.xml` - Adicionado `usesCleartextTraffic` e `networkSecurityConfig`
- ✅ `android/app/src/main/res/xml/network_security_config.xml` - Criado (novo)
- ✅ `src/services/api/index.ts` - Adicionado logs de debug

---

**Status**: ✅ Correções aplicadas  
**Próximo passo**: Rebuild do app e verificar logs
