# ArgoCD GitOps layout

How dev gets from "empty cluster" to "everything running", and where to add things.

## The chain

```
Terraform (infrastructure/environments/dev/argocd)
  └─ installs argo-cd            (values: install/dev/argocd-values.yaml)
  └─ installs argocd-apps chart  (values: install/dev/appsets.yaml)
        ├─ AppProjects:  dev-platform, dev-apps
        ├─ Application:  platform-root   (app-of-apps over platform/*.yaml)
        └─ ApplicationSet: dev-apps      (one Application per apps/*.yaml)
```

Terraform only renders `install/dev/appsets.yaml` (one Terraform→Helm hop). From
there ArgoCD owns everything; there is no further templating indirection.

## Two categories

| Dir         | What                                   | Delivery                         | Project       |
|-------------|----------------------------------------|----------------------------------|---------------|
| `platform/` | opensource / third-party cluster tools | app-of-apps over real manifests  | `dev-platform`|
| `apps/`     | first-party user applications          | ApplicationSet (templated)       | `dev-apps`    |

`dev-platform` is broad (installs CRDs / cluster-scoped resources). `dev-apps` is
scoped to the service namespaces, no cluster-scoped resources.

Platform tools have heterogeneous sources (remote Helm repos, a local chart), so
they are **explicit `Application` manifests** you can read directly. User apps are
homogeneous (git path + `values-<env>.yaml`), so an **ApplicationSet** templates
them and keeps the per-app files tiny.

## Adding things

- **A user app:** drop `apps/<name>.yaml` with `{name, namespace, path}`, add the
  namespace to the `dev-apps` project destinations in `install/dev/appsets.yaml`,
  and add `charts/<name>/values-<env>.yaml`.
- **A platform tool:** drop a real `Application` manifest in `platform/`. Use a
  sync-wave annotation if ordering matters (CRDs install before consumers).
- **A new environment:** add `install/<env>/{argocd-values.yaml,appsets.yaml}` and
  point that env's bootstrap root at them. App param files in `apps/` are
  env-agnostic; the env-specific `values-<env>.yaml` overlays carry the differences.

## Conventions

- Generated/synced apps use `ServerSideApply=true` (accurate drift detection;
  tolerates HPA/Istio/webhook field managers).
- ArgoCD's own repo + admin secrets are created by Terraform (see the cluster
  root `secrets.tf`); app-level secrets come from External Secrets reading AWS
  Secrets Manager via the `aws-secretsmanager` ClusterSecretStore.
- Per-env user-app values live in the service chart: `charts/<svc>/values-<env>.yaml`.
