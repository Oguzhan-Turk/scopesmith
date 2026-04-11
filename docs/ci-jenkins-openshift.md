# Jenkins + OpenShift CI/CD

ScopeSmith, Bitbucket kaynağından tetiklenen Jenkins pipeline ile doğrulanıp OpenShift'e deploy edilebilir.

## Pipeline Dosyası
- Repo root: `Jenkinsfile`

## Verify Aşamaları
1. Backend test (`backend ./mvnw test`)
2. Frontend lint/build (`frontend npm run lint && npm run build`)
3. E2E smoke (`frontend npm run e2e:smoke`)

## Parametreler
- `RUN_SMOKE` (default: `true`)
- `DEPLOY_TO_OPENSHIFT` (default: `false`)
- `OPENSHIFT_NAMESPACE` (default: `scopesmith-dev`)
- `BACKEND_IMAGE` (opsiyonel image override)
- `FRONTEND_IMAGE` (opsiyonel image override)

## Jenkins Credentials / Env
- `openshift-token` (Secret text credential)
- `scopesmith-encryption-key` (Secret text credential)
- `OPENSHIFT_API_URL` (Jenkins global env ya da folder env)

## Deploy Davranışı
- Sadece `main` branch + `DEPLOY_TO_OPENSHIFT=true` olduğunda çalışır.
- Deploy öncesi güvenlik kapısı:
  - `SCOPESMITH_ENCRYPTION_KEY` boş olamaz.
  - Default anahtar (`scopesmith-default-key-change-in-production`) kabul edilmez.
- `deploy/openshift/` varsa `oc apply` yapar.
- Backend deployment env'ine `SCOPESMITH_ENCRYPTION_KEY` enjekte edilir.
- `BACKEND_IMAGE` / `FRONTEND_IMAGE` verilirse deployment image günceller.
- Rollout status kontrolü yapar.

## Artifact'ler
- `backend.log`
- `frontend/playwright-report/**`
- `frontend/test-results/**`

Bu yapı ile quality gate ve deploy akışı GitHub Actions'a bağlı olmadan Jenkins/OpenShift standardına uyarlanır.
