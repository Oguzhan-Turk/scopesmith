# ScopeSmith — Demo Senaryosu

## Senaryo: Turkcell Kampanya Yönetim Sistemi

Bir e-ticaret/telekom uygulaması var. Müşteriden yeni bir talep geldi — belirsiz, eksik, tam olarak ne istendiği net değil. Gerçek hayattan bir senaryo.

---

## Adım 1: Proje Oluştur + Context Bağla

**Kullanıcı aksiyonu:** Yeni proje oluştur, projenin kaynak kodunu bağla.

```
Proje adı: "Kampanya Yönetim Sistemi"
Kaynak: Lokal klasör veya Git URL
```

**ScopeSmith:** Kodu tarar, proje özetini çıkarır:
> "Bu proje Spring Boot 3.x ile geliştirilmiş bir kampanya yönetim sistemi.
> Mevcut modüller: CampaignService, UserService, NotificationService, PaymentService.
> Veritabanı: PostgreSQL, 12 entity (Campaign, User, CampaignRule, Notification, ...).
> Dış entegrasyonlar: SMS Gateway, Email Service."

**Etki:** Kullanıcı hiçbir şey yazmadan ScopeSmith projeyi anladı.

---

## Adım 2: Ham Talep Yapıştır

**Kullanıcı aksiyonu:** Müşteriden gelen belirsiz talebi olduğu gibi yapıştırır.

```
"Merhaba, kampanya sistemine indirim kodu özelliği eklenmeli. Kullanıcılar
indirim kodu girebilsin. Kodlar yüzdelik veya sabit tutarlı olabilir. Bir de
kampanya bazlı olsun. Ayrıca raporlama da lazım sanırım. Ne zaman bitirebilirsiniz?"
```

**Önemli:** Bu talep eksik, belirsiz ve birden fazla iş barındırıyor — tam olarak gerçek hayattaki gibi.

---

## Adım 3: AI Analiz

**ScopeSmith analiz sonucu:**

### Yapılandırılmış Özet
> İndirim kodu (discount/coupon) mekanizması isteniyor. Kodlar kampanyalara
> bağlı olacak, yüzdelik veya sabit tutar indirim sağlayacak. Raporlama ihtiyacı
> da belirtilmiş ancak kapsamı belirsiz.

### Eksik/Belirsiz Noktalar
1. İndirim kodunun kullanım limiti var mı? (toplam kullanım, kullanıcı başına)
2. Kodun geçerlilik süresi olacak mı?
3. Minimum sepet tutarı şartı var mı?
4. Bir kullanıcı birden fazla kod kullanabilir mi?
5. "Raporlama" tam olarak ne? Hangi metrikler isteniyor?
6. Kodlar otomatik mi üretilecek, manuel mi tanımlanacak?

### Çelişkiler
- "Kampanya bazlı olsun" ama mevcut Campaign entity'sinde indirim kodu alanı yok — yeni bir entity mi, mevcut yapıya mı eklenecek?

### Varsayımlar
- İndirim kodu tekil (unique) olacak
- Bir kod yalnızca bir kampanyaya ait olacak
- Kodlar alfanümerik olacak

### Etkilenen Modüller
- CampaignService (kampanya-kod ilişkisi)
- PaymentService (ödeme sırasında indirim uygulama)
- Yeni: DiscountCodeService (CRUD + validasyon)
- Yeni: DiscountCode entity

### Risk
- **MEDIUM** — Talep olgunlaştırma eksik. Raporlama kapsamı belirsiz, bu scope creep riski taşıyor.

---

## Adım 4: Soruları Cevapla

**Kullanıcı aksiyonu:** PO'dan gelen cevapları girer.

| Soru | Cevap |
|------|-------|
| Kullanım limiti? | Evet, her kod max 100 kullanım, kullanıcı başına 1 |
| Geçerlilik süresi? | Evet, başlangıç ve bitiş tarihi olacak |
| Min sepet tutarı? | Şimdilik yok, ileride eklenebilir |
| Birden fazla kod? | Hayır, tek kod |
| Raporlama? | Kampanya bazlı kullanım sayısı ve toplam indirim tutarı yeterli |
| Otomatik/Manuel? | Manuel tanımlama, admin panelinden |

**ScopeSmith:** Cevaplara göre analizi günceller.

---

## Adım 5: Task Breakdown + SP Önerisi

**ScopeSmith üretir:**

| # | Task | SP Önerisi | Gerekçe |
|---|------|-----------|---------|
| 1 | DiscountCode entity + migration | 2 | Yeni entity, 8-10 field, Campaign ile OneToMany ilişki |
| 2 | DiscountCodeService CRUD | 3 | CRUD + validasyon (unique kod, tarih kontrolü, limit kontrolü) |
| 3 | Ödeme akışında indirim uygulama | 5 | PaymentService değişecek, hesaplama mantığı, edge case'ler fazla |
| 4 | Admin panel — kod tanımlama UI | 3 | Form + liste, mevcut admin yapısına uygun |
| 5 | Kullanıcı tarafı — kod girişi UI | 2 | Checkout flow'a input ekleme, validasyon |
| 6 | Raporlama — kampanya bazlı istatistik | 3 | Aggregate query, basit dashboard widget |
| 7 | Unit + Integration testler | 3 | DiscountCodeService + PaymentService testleri |

**Toplam önerilen: 21 SP**

> "Task 3 en riskli — PaymentService mevcut projede 450 satır, ödeme hesaplama
> mantığına dokunmak yan etki yaratabilir. Integration test önerilir."

---

## Adım 6: PO Özeti

**ScopeSmith üretir:**

> **İndirim Kodu Özelliği — Analiz Özeti**
>
> Talep: Kampanya bazlı indirim kodu mekanizması
> Kapsam: 7 task, tahmini 21 SP
> Risk: MEDIUM (ödeme akışı değişikliği)
>
> Karar noktaları:
> - [ ] Min sepet tutarı şimdilik kapsam dışı — onay?
> - [ ] Raporlama sadece kampanya bazlı — detaylı analitik ileride?
>
> Bu özeti onaylıyor musunuz?

---

## Demo Süresi: ~7-10 dakika

| Adım | Süre |
|------|------|
| Proje oluştur + context | 1 dk |
| Talep yapıştır | 30 sn |
| AI analiz (bekleme + sonuç gösterimi) | 2 dk |
| Soruları cevapla | 1 dk |
| Task + SP gösterimi | 1.5 dk |
| PO özeti | 1 dk |
| Teknik açıklama + sorular | 2-3 dk |
