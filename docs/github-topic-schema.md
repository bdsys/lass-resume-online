# GitHub Repository Topic Schema

This document defines the topic labels used to categorize repositories in the Portfolio section.
Apply these via `gh repo edit --add-topic` or the GitHub UI.

---

## Topic definitions

| Topic        | Portfolio section | Description                                          |
|--------------|-------------------|------------------------------------------------------|
| `security`   | Security           | WAF, IAM, threat modeling, security tooling          |
| `web`        | Web Apps           | Full-stack web applications                          |
| `cloud`      | Cloud & IaC        | AWS workshops, CloudFormation, Terraform, CDK        |
| `automation` | Automation         | CI/CD, scripts, pipelines, self-healing infra        |
| `tooling`    | Tooling            | Developer tools, admin UIs, utilities                |
| `learning`   | Sandbox            | Experiments, workshops, learning projects            |

A repo can have **multiple topics** and will appear in all relevant sections.

---

## Suggested topic assignments (current 12 repos)

| Repo                        | Suggested topics        | Notes                                 |
|-----------------------------|-------------------------|---------------------------------------|
| `perfect-day`               | `web`                   | Web + mobile app                      |
| `tisports`                  | `web`                   | PoC web platform                      |
| `blacknight`                | `web`, `automation`     | Sleep tracker Python app              |
| `py311-gh-actions-demo`     | `automation`            | GitHub Actions CI/CD demo             |
| `ecs-workshop`              | `cloud`                 | ECS/EKS AWS workshop                  |
| `blacktrack`                | `web`                   | Django home inventory app             |
| `learning-stuff-2024`       | `learning`              | Learning experiments                  |
| `askamelia`                 | `tooling`               | Alexa/voice app                       |
| `cloudformation-api-gateway`| `cloud`                 | CloudFormation API Gateway sample     |
| `topListWebApp`             | `web`                   | Top-list web app (1 star)             |
| `stopcispa`                 | `web`                   | Legacy advocacy site                  |
| `admin.bdsys.net`           | `tooling`               | Admin/portfolio-adjacent              |
| `lass-resume-online`        | `web`, `tooling`        | This site                             |

---

## How to apply topics

```bash
# Apply topics with GitHub CLI
gh repo edit bdsys/perfect-day          --add-topic web
gh repo edit bdsys/tisports             --add-topic web
gh repo edit bdsys/blacknight           --add-topic web --add-topic automation
gh repo edit bdsys/py311-gh-actions-demo --add-topic automation
gh repo edit bdsys/ecs-workshop         --add-topic cloud
gh repo edit bdsys/blacktrack           --add-topic web
gh repo edit bdsys/learning-stuff-2024  --add-topic learning
gh repo edit bdsys/askamelia           --add-topic tooling
gh repo edit bdsys/cloudformation-api-gateway --add-topic cloud
gh repo edit bdsys/topListWebApp        --add-topic web
gh repo edit bdsys/stopcispa            --add-topic web
gh repo edit bdsys/admin.bdsys.net      --add-topic tooling
gh repo edit bdsys/lass-resume-online   --add-topic web --add-topic tooling
```

---

## Pinned repos (featured projects)

The Portfolio page uses GitHub's GraphQL `pinnedItems` API to surface up to 6 pinned repos as
"Featured Projects." Pin repos via GitHub profile settings. Recommended pins:

- `lass-resume-online` — this site (shows off the full-stack/security work)
- `blacktrack` — Django full-stack app
- `py311-gh-actions-demo` — CI/CD automation
- `ecs-workshop` — AWS cloud infrastructure

A GitHub token (`GITHUB_TOKEN` Worker secret) is required to query pinned repos via GraphQL.
Without it, the portfolio falls back to showing recently updated repos in sections.
