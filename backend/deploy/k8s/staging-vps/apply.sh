#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KUBECONFIG_FILE="${KUBECONFIG_FILE:-}"

if [[ -z "${KUBECONFIG_FILE}" ]]; then
  echo "KUBECONFIG_FILE is required (path to Rancher-generated kubeconfig)"
  exit 1
fi

export KUBECONFIG="${KUBECONFIG_FILE}"

kubectl apply -f "${ROOT}/namespace.yaml"
kubectl apply -f "${ROOT}/postgres.yaml"
kubectl apply -f "${ROOT}/backend.yaml"

kubectl -n chatup rollout status deployment/postgres --timeout=180s
kubectl -n chatup rollout status deployment/backend-go --timeout=180s
kubectl -n chatup get pods,svc,ingress
