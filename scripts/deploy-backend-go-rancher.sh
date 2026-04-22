#!/bin/bash
set -euo pipefail

# Deploy do backend-go para Kubernetes/Rancher.
# Requer:
# - docker autenticado no registry alvo
# - kubectl configurado para o cluster/contexto correto
#
# Variáveis esperadas:
# REGISTRY (ex: ghcr.io/seu-org)
# IMAGE_TAG (ex: v1.0.3 ou commit SHA)
# ENVIRONMENT (development|production)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_GO_DIR="${ROOT_DIR}/backend-go"

REGISTRY="${REGISTRY:-}"
IMAGE_TAG="${IMAGE_TAG:-}"
ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ -z "${REGISTRY}" ]]; then
  echo "❌ REGISTRY não informado. Exemplo: REGISTRY=ghcr.io/minha-org"
  exit 1
fi

if [[ -z "${IMAGE_TAG}" ]]; then
  echo "❌ IMAGE_TAG não informado. Exemplo: IMAGE_TAG=v1.0.3"
  exit 1
fi

if [[ "${ENVIRONMENT}" != "development" && "${ENVIRONMENT}" != "production" ]]; then
  echo "❌ ENVIRONMENT inválido. Use development ou production."
  exit 1
fi

IMAGE_REPO="${REGISTRY}/chatup-backend-go"
FULL_IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"

echo "🐳 Build da imagem backend-go"
docker build -t "${FULL_IMAGE}" "${BACKEND_GO_DIR}"

echo "📤 Push da imagem ${FULL_IMAGE}"
docker push "${FULL_IMAGE}"

if [[ "${ENVIRONMENT}" == "development" ]]; then
  MANIFEST="${ROOT_DIR}/backend/deploy/k8s/development/backend.yaml"
  DEPLOYMENT="backend-go"
  NAMESPACE="chatup-dev"
else
  MANIFEST="${ROOT_DIR}/backend/deploy/k8s/production/backend.yaml"
  DEPLOYMENT="backend-go"
  NAMESPACE="chatup-prod"
fi

echo "📝 Atualizando manifest ${MANIFEST} com ${FULL_IMAGE}"
sed -i "s|image: .*chatup-backend-go:.*|image: ${FULL_IMAGE}|g" "${MANIFEST}"

echo "🚀 Aplicando manifest no cluster"
kubectl apply -f "${MANIFEST}"

echo "♻️ Forçando rollout da deployment ${DEPLOYMENT} no namespace ${NAMESPACE}"
kubectl rollout restart "deployment/${DEPLOYMENT}" -n "${NAMESPACE}"
kubectl rollout status "deployment/${DEPLOYMENT}" -n "${NAMESPACE}" --timeout=180s

echo "✅ Deploy finalizado com sucesso."
