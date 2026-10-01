# Observability Stack (LGTM + Alloy)

This folder contains a development-grade observability stack for Kubernetes:

- Grafana
- Prometheus
- Loki
- Grafana Alloy (log collection agent, replacing Promtail)

## Install

```bash
./backend/deploy/k8s/observability/install.sh
```

## Uninstall

```bash
./backend/deploy/k8s/observability/uninstall.sh
```

## Local URLs

- Grafana: `http://grafana.localhost`
- Prometheus: `http://prometheus.localhost`
- Loki endpoint (internal): `http://loki.observability.svc.cluster.local:3100`

## Notes

- Backend metrics are scraped from service `backend-go` in namespace `chatup`.
- Backend logs are collected by Alloy from Kubernetes pod logs and pushed to Loki.
- Dashboards and alerting rules are provisioned from this folder.
- **Backend Go - Erros HTTP (4xx/5xx)** (`backend-go-api-errors-dashboard.yaml`): taxas de erro, ranking por `route` + `method` + `status` no intervalo selecionado (mais frequente primeiro) e painel de logs Loki; use o filtro variável **Route** para restringir os logs a um endpoint.

### Logs HTTP vs métricas Prometheus

- Cada resposta gera uma linha **`http_request`** no JSON do `slog`: **nível `INFO`** para 2xx/3xx, **`WARN`** para 4xx e **`ERROR`** para 5xx (filtre no Loki por `level`).
- **`GET /users/search`** com query inválida ou vazia responde **200** com lista (pode ser vazia); **não** é 404. 404 costuma ser rota inexistente (ex.: `/.well-known/...`) ou **`GET /users/{id}`** quando o usuário não existe.
- **`rate(...[5m])`** no Grafana pode parecer **zero** se houve poucos erros no intervalo; a tabela de ocorrências usa **`increase(...[$__range])`** e reflete melhor contagens raras.
- O scrape do Prometheus para `backend-go` usa apenas o endpoint nomeado **`http`** (evita dois alvos no mesmo `pod:port` duplicando amostras).
