# Fleet setup for Rancher localhost

This directory contains the Fleet `GitRepo` resource for syncing `backend-go` development manifests from the `developer` branch.

## 1) Apply the Fleet GitRepo resource

```bash
kubectl apply -f backend/deploy/fleet/rancher-localhost-gitrepo.yaml
```

## 2) Verify sync status

```bash
kubectl get gitrepos.fleet.cattle.io -n fleet-local
kubectl get bundles.fleet.cattle.io -A | grep chatup-backend-go-dev
```

## 3) Workflow behavior

- The GitHub Action `.github/workflows/backend-go-fleet-image-update.yml` runs only when a PR is merged into `developer`.
- It builds `backend-go` and pushes the image to Docker Hub.
- It updates image tags in:
  - `backend/deploy/k8s/development/backend.yaml`
  - `backend/deploy/k8s/development/backend-go-k8s.yaml`
- Fleet detects the commit in `developer` and applies it to `clusterName: local`.

## 4) Required GitHub Secrets

Configure these repository secrets in GitHub:

- `DOCKERHUB_USERNAME` -> Docker Hub username
- `DOCKERHUB_TOKEN` -> Docker Hub personal access token (PAT)

## Notes

- If the repository is private, create and link a Fleet git credential in Rancher and attach it to the `GitRepo`.
