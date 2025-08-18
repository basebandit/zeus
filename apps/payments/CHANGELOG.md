## v2.1.0 (2025-08-18)

### Feat

- **ci**: add docker build and push step
- **ci**: add gha workflow and commit pre-hook for payments app
- **terraform**: create iam role and pod identity association for use as eso provider
- **argocd**: configure and bootstrap argocd porject and application sets for staging environment
- **apps**: add payments monrepo directory
- **argocd**: add payments app of apps project to manage payments applications
- **helm**: create payments chart for staging deployment
- **argocd**: create application resources for our payments application deployment
- **argocd**: add argocd server bootstrapping configuration
- **argocd**: add argocd bootstrapping config
- **argocd**: provision resources for bootstrapping argocd

### Fix

- **python**: remove unused import
- **argocd**: add missing property field
- **argocd**: update ExternalSecrets to use ClusterSecretStore
- **argocd-server**: update apiVersion
- **argocd-server**: update apiVersion
- **argocd**: fix repo url typo
- **dockerfile**: generate .venv directory in the image
- **python**: install fastapi
- **argocd**: add missing chart name

## v2.0.0 (2025-07-26)

### Feat

- **terraform**: provision eks resources

## v1.0.0 (2025-07-25)

### Feat

- **terraform**: vpc resources to be provisioned
