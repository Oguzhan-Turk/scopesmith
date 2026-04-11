# Branch Protection Runbook

## Durum
- Bu repoda branch protection API çağrısı denendi ancak GitHub `403` döndü:
  - `Upgrade to GitHub Pro or make this repository public to enable this feature.`
- Sebep: Private repo + mevcut plan kısıtı.

## Plan Uygunsa Yapılacaklar

1. `master` branch için protection aç:
```bash
gh api \
  --method PUT \
  repos/Oguzhan-Turk/scopesmith/branches/master/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -F required_status_checks.contexts[]='verify' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='null' \
  -f restrictions='null'
```

2. Doğrula:
```bash
gh api repos/Oguzhan-Turk/scopesmith/branches/master/protection
```

## Not
- `verify` check adı, workflow job isminden gelir (`.github/workflows/ci.yml`).
- Eğer job adı değişirse required context de güncellenmelidir.
