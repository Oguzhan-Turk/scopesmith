# Bitbucket CI Uyumluluğu

ScopeSmith doğrulama akışı Bitbucket Pipelines ile çalışacak şekilde hazırlanmıştır.

## Pipeline Dosyası
- Repo root: `bitbucket-pipelines.yml`

## Koşulan Aşamalar
1. Backend test (`./mvnw test`)
2. Frontend lint (`npm run lint`)
3. Frontend build (`npm run build`)
4. E2E smoke (`npm run e2e:smoke`)

## Deploy (Custom Pipeline)
- Pipeline adı: `deploy-openshift`
- Gerekli env:
  - `OPENSHIFT_TOKEN`
  - `OPENSHIFT_API_URL`
  - `OPENSHIFT_NAMESPACE`
  - `SCOPESMITH_ENCRYPTION_KEY`
- Güvenlik kapısı:
  - Encryption key boş olamaz.
  - Default değer (`scopesmith-default-key-change-in-production`) ile deploy bloklanır.
- Opsiyonel image override:
  - `BACKEND_IMAGE`
  - `FRONTEND_IMAGE`

## Altyapı
- PostgreSQL service: `pgvector/pgvector:pg17`
- Java: 21 (pipeline içinde kurulur)
- Node + Playwright runtime: `mcr.microsoft.com/playwright:v1.59.1-noble`

## Çıktılar
- `backend.log`
- `frontend/playwright-report/**`
- `frontend/test-results/**`

Bu yapı sayesinde CI tarafı GitHub Actions'a bağımlı değildir; Bitbucket üzerinde de aynı quality gate korunur.
