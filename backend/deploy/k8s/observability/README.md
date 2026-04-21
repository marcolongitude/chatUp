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
