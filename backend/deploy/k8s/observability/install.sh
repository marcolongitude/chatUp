#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kubectl apply -f "${ROOT_DIR}/namespaces.yaml"

helm repo add grafana https://grafana.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo update

helm upgrade --install loki grafana/loki \
  --namespace observability \
  --values "${ROOT_DIR}/values/loki-values.yaml"

helm upgrade --install tempo grafana/tempo \
  --namespace observability \
  --values "${ROOT_DIR}/values/tempo-values.yaml"

helm upgrade --install prometheus prometheus-community/prometheus \
  --namespace observability \
  --values "${ROOT_DIR}/values/prometheus-values.yaml"

helm upgrade --install grafana grafana/grafana \
  --namespace observability \
  --values "${ROOT_DIR}/values/grafana-values.yaml"

kubectl apply -f "${ROOT_DIR}/alloy/alloy.yaml"
kubectl apply -f "${ROOT_DIR}/dashboards/backend-go-dashboard.yaml"
kubectl apply -f "${ROOT_DIR}/dashboards/tempo-red-dashboard.yaml"

echo "Observability stack applied."
