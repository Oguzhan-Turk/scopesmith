# Managed Agent Guidance (Ne Zaman / Ne Zaman Değil)

## Amaç
Managed Agent, ScopeSmith'in planlama çekirdeği değildir; kontrollü bir **delivery accelerator** olarak kullanılır.

## Ürün Sınırı (Çok Önemli)
- ScopeSmith task yönetim sisteminin yerine geçmez.
- Jira/GitHub resmi iş takip kaydıdır (System of Record).
- ScopeSmith:
  - task üretir ve doğru hedefe dispatch eder,
  - execution readiness/agent önerisi verir,
  - execution outcome'u audit amaçlı yansıtır.

## Ne Zaman Kullanılır (Recommended)
- Task SP onaylı ve genelde **3-8 SP** aralığında
- Acceptance criteria net ve test edilebilir
- Task tek service sınırında veya service ownership net
- Sync/ref hazırlığı tamamlanmış (Jira/GitHub hedefi net)
- İnsan review/merge adımı zaten planlı

## Ne Zaman Kullanılmaz (Manual Better)
- 1-2 SP hızlı düzeltmeler
- Kapsamı belirsiz, fazla discovery gerektiren işler
- Birden çok service'e yayılan, ownership'i net olmayan değişiklikler
- Kritik geri döndürülmesi zor operasyonlar (manuel onay şart)

## İşletim Prensipleri
1. Önce planla: ScopeSmith ile analiz + task netleştirme
2. Sonra dispatch: Jira/GitHub'a gönder
3. Sonra uygula: uygun task'ta Managed Agent / Claude Code
4. İnsan review zorunlu: agent çıktısı doğrudan production'a gitmez
5. Ölç: ilk PR süresi, agent başarısızlık oranı, geri dönüş oranı

## UI Sinyalleri
- Tasks ekranında:
  - **Agent önerilir** etiketi: task teknik olarak uygun + operasyonel hazır
  - **Manual hızlı** etiketi: düşük kapsam, manuel daha verimli
  - **Managed Agent Karar Rehberi** kartı: takım için hızlı karar çerçevesi

## Not
Feature flag (`MANAGED_AGENT_ENABLED`) açık değilse bu model yine geçerlidir; ekip Claude Code prompt akışıyla aynı karar çerçevesini kullanır.
