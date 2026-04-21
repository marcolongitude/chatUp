#!/usr/bin/env bash
set -euo pipefail

helm uninstall grafana -n observability || true
helm uninstall prometheus -n observability || true
helm uninstall loki -n observability || true

kubectl delete -f "$(dirname "$0")/alloy/alloy.yaml" --ignore-not-found
kubectl delete -f "$(dirname "$0")/dashboards/backend-go-dashboard.yaml" --ignore-not-found

echo "Observability stack resources removed."
