# Manual + AI Assist Runbook

Bu runbook, ScopeSmith'i tamamen otomatik kullanmak yerine kontrollü şekilde
"manuel karar + AI destek" modeliyle işletmek için hazırlanmıştır.

## Amaç
- AI'dan hız kazanırken insan kontrolünü kaybetmemek
- Kritik kararlarda manuel doğrulama zorunluluğu koymak
- Takımın farklı olgunluk seviyelerinde uyumlu çalışmak

## Çalışma Modu
- **Default:** Manual-first
- **AI rolü:** Öneri, hızlandırma, taslak üretme
- **İnsan rolü:** Onay, öncelik, risk, yayınlama kararı

## End-to-End Akış

1. **Requirement Intake (Manuel)**
- Talep manuel girilir.
- Gerekirse doküman yüklenir.

2. **Analysis (AI Assist)**
- AI analiz üretir (summary/risk/questions).
- İnsan, risk seviyesini ve kritik varsayımları kontrol eder.

3. **Clarification (Manuel + AI Assist)**
- Sorular AI tarafından önerilir.
- Nihai soru/cevaplar insan tarafından seçilir ve girilir.

4. **Task Breakdown (AI Assist)**
- AI task + SP önerisi üretir.
- İnsan over-splitting, bağımlılık ve öncelik gözden geçirmesi yapar.

5. **Task Editing (Manuel)**
- Task başlığı/kapsamı manuel güncellenebilir.
- Manuel açılan task'larda AI ile SP önerisi alınabilir.

6. **Sync / Delivery Prep (Manuel Gate)**
- Sync policy check geçmeden Jira/GitHub gönderimi yapılmaz.
- Service routing ve target doğrulanır.

7. **Execution (Opsiyonel)**
- Managed Agent sadece uygun task'larda opsiyonel kullanılır.
- Varsayılan kapalı (`MANAGED_AGENT_ENABLED=false`).
- İnsan review olmadan merge/deploy yapılmaz.

## Karar Matrisi (Kısa)

- **Kritik güvenlik/finans etkili iş:** Manuel öncelikli, AI sadece yardımcı.
- **Belirsiz kapsam:** Önce clarification, sonra task.
- **Tekrarlı düşük riskli iş:** AI tasking/SP + opsiyonel execution assist.
- **Çok servisli karmaşık iş:** Manual decomposition + AI refinement destekli.

## Min. Kontrol Checklist

Her talep için:
1. Risk seviyesi insan tarafından onaylandı mı?
2. Task'lar outcome-odaklı mı (mikro parçalanma yok)?
3. SP final kararı ekip tarafından verildi mi?
4. Sync öncesi policy check temiz mi?
5. Gerekli yerde fallback planı var mı?

## Başarı Ölçümü

- Lead time düşüşü
- Rework oranı
- SP divergence trendi
- Sync hata oranı
- Manuel override oranı (sağlıklı seviyede mi?)

Bu runbook ile ScopeSmith, "AI'nin yaptığı" değil, "takımın AI ile kontrollü şekilde ürettiği" bir SDLC asistanı olarak konumlanır.
