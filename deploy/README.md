# Estratégia de Deploy ChatUp (Docker & Kubernetes)

Este diretório contém a infraestrutura necessária para o deploy do backend ChatUp em containers.

## 🏗️ Estrutura de Arquivos

- `docker/`: Dockerfiles customizados.
  - `backend/Dockerfile`: Build otimizado do NestJS.
  - `postgres/Dockerfile`: Postgres com Logical Replication (exigido pelo Electric SQL).
- `k8s/`: Manifestos Kubernetes orquestrados.
  - `development/`: Configurações para ambiente de testes/dev.
  - `production/`: Configurações de alta disponibilidade, recursos e segurança.

## 🚀 Como fazer o Deploy

### 1. Build das Imagens
Antes de aplicar no Kubernetes, as imagens devem ser construídas e enviadas para um Registry (Docker Hub, ECR, etc):

```bash
# Backend
docker build -t seu-usuario/chatup-backend:latest ./docker/backend

# Postgres
docker build -t seu-usuario/chatup-postgres:latest ./docker/postgres
```

### 2. Aplicar no Kubernetes
Navegue para a pasta `k8s` e aplique os namespaces e manifestos:

```bash
# Criar namespaces
kubectl apply -f k8s/namespace.yaml

# Desenvolvimento
kubectl apply -f k8s/development/

# Produção
kubectl apply -f k8s/production/
```

### 🖥️ Administração via Rancher

Para administrar visualmente pelo Rancher:
1. **Importar Cluster**: Se o cluster for externo, use a opção "Import Existing Cluster" no Rancher.
2. **Visualização**: No dashboard do Rancher, selecione o namespace `chatup-dev` ou `chatup-prod`.
3. **Workloads**: Você verá os 3 pods (Backend, Postgres, Electric) com 3 réplicas cada.
4. **Escalonamento**: O Rancher permite aumentar ou diminuir as instâncias com um clique na interface web.

## ⚙️ Configuração dos Pods (Estratégia)

| Serviço      | Tipo         | Replicas | Observação                                      |
|--------------|--------------|----------|-------------------------------------------------|
| Backend      | Deployment   | 3        | Balanceamento de carga automático via Service.  |
| Postgres     | StatefulSet  | 1        | Instância única para consistência simplificada. |
| Electric SQL | Deployment   | 3        | Sincronização em tempo real.                    |

---
**Nota**: O banco de dados Postgres utiliza uma única instância para evitar a necessidade de sincronização complexa de escrita/leitura entre volumes distribuídos.
