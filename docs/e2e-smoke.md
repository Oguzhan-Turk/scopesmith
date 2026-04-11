# E2E Smoke Test

## Kapsam
- Login
- Dashboard'da proje oluşturma
- Proje detayına geçiş
- Yeni talep ekleme
- Partial refresh timeline görünürlüğü (audit job doğrulaması)

## Ön Koşul
- Backend çalışıyor olmalı (`http://localhost:8080`)
- Test kullanıcısı hazır olmalı (varsayılan: `admin/admin123`)

## Çalıştırma
```bash
cd frontend
npm run e2e:install
npm run e2e:smoke
```

## Opsiyonel Env
- `SMOKE_USER` (default: `admin`)
- `SMOKE_PASS` (default: `admin123`)
- `SMOKE_BASE_URL` (default: `http://localhost:5173`)
- `SMOKE_CLEANUP` (default: `false`) — `true` ise test sonunda oluşturulan proje silinir
