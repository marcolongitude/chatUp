# ChatUp

Monorepo do produto ChatUp (estilo FiscalCore: uma pasta raiz por entregável).

```text
chatUp/
├── mobile/        # App Expo / React Native (package.json aqui)
├── backend-go/    # API HTTP + WebSocket (Go)
├── deploy/        # Docker Compose, Kubernetes, Fleet
├── docs/          # Documentação de produto
├── e2e/           # Harness e2e (Python)
├── scripts/       # Scripts cross-stack
└── README.md
```

Não há `package.json` na raiz — o app Node/Expo vive só em `mobile/`.

## Desenvolvimento local

### API + Postgres

```bash
cd deploy && docker compose up -d
```

### App mobile

```bash
cd mobile
npm ci --legacy-peer-deps
npm start
```

### Guardrails / e2e (a partir da raiz do monorepo)

```bash
./scripts/test-guardrails.sh --unit
./e2e/run-api.sh tests/test_family_security_api.py
```

### Variáveis de ambiente

- Monorepo: `.env` na raiz (scripts de IP / API URL).
- Expo: `mobile/.env` (ver `mobile/.env.example`).

## CI

Workflows em `.github/workflows/` usam `working-directory: mobile` para npm/Jest e `backend-go` para Go. Manifestos Fleet em `deploy/k8s/`.
