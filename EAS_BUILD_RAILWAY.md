# 🚀 EAS Build com Railway - Configuração

## ✅ Correções Aplicadas

### 1. eas.json Atualizado

Todas as URLs foram atualizadas para usar Railway:
- ✅ `preview` → URLs do Railway
- ✅ `production` → URLs do Railway  
- ✅ `production-aab` → URLs do Railway

**URLs configuradas**:
- `EXPO_PUBLIC_API_URL`: `https://backend-production-38c9.up.railway.app`
- `EXPO_PUBLIC_ELECTRIC_URL`: `wss://backend-production-38c9.up.railway.app`
- `EXPO_PUBLIC_ELECTRIC_API_URL`: `https://backend-production-38c9.up.railway.app`

### 2. app.config.js Atualizado

Adicionado fallback direto para URL do Railway caso variáveis de ambiente não estejam disponíveis.

### 3. AndroidManifest.xml

- ✅ `usesCleartextTraffic="true"`
- ✅ `networkSecurityConfig="@xml/network_security_config"`

### 4. network_security_config.xml

- ✅ Criado para permitir conexões HTTPS com Railway
- ✅ Configurado para Android 15

## 🚀 Gerar APK

### Build Local (Recomendado)

```bash
# Build preview (APK)
eas build --platform android --profile preview --local

# Build production (APK)
eas build --platform android --profile production --local
```

### Instalar no Dispositivo

```bash
# Após build, instalar diretamente
adb install build-*.apk

# Ou usar script
./scripts/install-apk-device.sh
```

## 🔍 Verificar Configuração

### Antes do Build

```bash
# Verificar eas.json
cat eas.json | grep EXPO_PUBLIC_API_URL

# Deve mostrar:
# "EXPO_PUBLIC_API_URL": "https://backend-production-38c9.up.railway.app"
```

### Após Instalar APK

1. Abra o app no dispositivo
2. Abra DevTools (shake device → "Debug Remote JS")
3. Verifique logs:
   - `🔍 [API] URL configurada: https://backend-production-38c9.up.railway.app`
   - Não deve mostrar `http://192.168.0.14:3000`

## ✅ Checklist

- [x] `eas.json` atualizado com URLs do Railway
- [x] `app.config.js` com fallback para Railway
- [x] `AndroidManifest.xml` configurado para Android 15
- [x] `network_security_config.xml` criado
- [x] Logs de debug adicionados
- [ ] APK gerado com `eas build --local`
- [ ] APK instalado no dispositivo
- [ ] Testado criação de usuário

## 🐛 Troubleshooting

### Se ainda der NETWORK ERROR

1. **Verificar logs no dispositivo**:
   - Deve mostrar URL do Railway
   - Se mostrar IP local, o `eas.json` não foi usado

2. **Verificar qual perfil está sendo usado**:
   ```bash
   eas build --platform android --profile preview --local
   ```

3. **Limpar cache do EAS**:
   ```bash
   eas build:cancel
   rm -rf .expo
   eas build --platform android --profile preview --local
   ```

---

**Status**: ✅ `eas.json` atualizado com URLs do Railway  
**Próximo passo**: Gerar APK com `eas build --local`
