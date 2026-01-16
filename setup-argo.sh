#!/bin/zsh
# This is a documentation of the necessary steps to bootstrap argocd
aws --profile l34n-admin eks update-kubeconfig --region eu-central-1 --name staging-basebandit-lab-cluster

# Run this while the terraform apply command for creating the eks cluster has just completed and before the helm argocd terraform apply completes.
k apply -n argocd -f - <<EOF                   
apiVersion: v1
kind: Secret
metadata:
  labels:
    app.kubernetes.io/name: argocd-secret
    app.kubernetes.io/part-of: argocd
  name: argocd-secret
type: Opaque
EOF

# Then run this, Argocd will use this to create initial username and password
k apply -f git-repo-secret.yaml

# These are used by argocd once the above steps are done and terraform completed successfully.
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace

helm repo add argo https://argoproj.github.io/argo-helm
helm install staging-project-app-set argo/argocd-apps -n argocd -f ../../charts/argocd/argocd-apps/_project-app-sets/staging-project-app-set.yaml