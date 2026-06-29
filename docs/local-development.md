# Local development

## Pre-commit checks

CI runs the same `pre-commit` hooks defined in `.pre-commit-config.yaml`. Install them
locally so they run on `git commit` (over changed files) before you push:

```bash
pre-commit install
```

This catches formatting, EOF/whitespace, YAML/TOML, terraform fmt/tflint, and the
payments lint hooks early. To run the whole suite on demand:

```bash
pre-commit run --all-files
```

> Terraform hooks need `terraform` and `tflint` on your PATH. They are skipped in the
> PR `pre-commit` workflow and enforced by `terraform.yml` instead.
