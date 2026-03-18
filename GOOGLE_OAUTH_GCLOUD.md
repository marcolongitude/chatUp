# Google OAuth via Google Cloud CLI (gcloud)

Este guia mostra como instalar o Google Cloud CLI e criar um OAuth client via CLI.

Observação rápida:
- O comando `gcloud iam oauth-clients` cria **OAuth clients do IAM** (geral).
- Para **Android/iOS OAuth Client IDs** usados no Google Sign-In mobile, normalmente o fluxo oficial ainda é pelo **Google Cloud Console** (APIs & Services → Credentials) porque exige package name + SHA-1 (Android) e bundle ID (iOS).
- Use o CLI para um client **web/public** e para automações; para Android/iOS, finalize no Console.

## 1. Instalar o Google Cloud CLI (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates gnupg curl
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list > /dev/null
sudo apt-get update
sudo apt-get install -y google-cloud-cli
```

Resumo:
- Adiciona o repositório oficial do Google Cloud.
- Instala o pacote `google-cloud-cli` com o comando `gcloud`.

## 2. Autenticar e configurar o projeto

```bash
gcloud init
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Resumo:
- `gcloud init`: inicia a configuração do CLI.
- `gcloud auth login`: faz login com sua conta Google.
- `gcloud config set project`: define o projeto padrão.

## 3. Criar OAuth client via CLI (IAM OAuth Client)

```bash
gcloud iam oauth-clients create my-oauth-client \
  --location="global" \
  --client-type="public-client" \
  --display-name="ChatUp Mobile OAuth" \
  --allowed-grant-types="authorization-code-grant,refresh-token-grant" \
  --allowed-scopes="openid,email" \
  --allowed-redirect-uris="chatup-ddcf8"
```

Resumo:
- Cria um OAuth client do IAM com grant types e redirect URIs.
- Substitua `YOUR_REDIRECT_URI` pelo redirect real do app.

## 4. Criar credenciais para o OAuth client

```bash
gcloud iam oauth-clients credentials create \
  --oauth-client="my-oauth-client" \
  --location="global"
```

Resumo:
- Gera as credenciais associadas ao OAuth client.

## 5. Onde pegar o Client ID gerado

```bash
gcloud iam oauth-clients credentials list \
  --oauth-client="my-oauth-client" \
  --location="global"
```

Resumo:
- Lista as credenciais e o `clientId`.

## 6. Se precisar de Android/iOS Client IDs (Google Sign-In)

Para Google Sign-In mobile, crie os client IDs específicos no Console:
- Android: exige **package name** e **SHA-1** do keystore.
- iOS: exige **bundle ID**.

Isso é feito em:
`Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID`.

## 7. Como usar no ChatUp

No app (`.env`):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
```

No backend (`backend/.env`):
```
GOOGLE_CLIENT_ID=...  # normalmente o Web Client ID
```
