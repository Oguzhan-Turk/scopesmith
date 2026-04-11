# Agentic Task Slicing Standard (Staff-Level)

Bu standart, task'ların agentic execution için ne kadar doğru boyutta olduğunu belirler.

## Amaç
- Fazla parçalanmış, takip maliyeti yüksek task'ları azaltmak
- Her task'ı tek başına üretilebilir, test edilebilir ve review edilebilir yapmak

## Boyut Kuralı
- İdeal: 2-6 saatlik tek deliverable
- Çok küçük sinyal: 1 saatin altında, sadece teknik alt adım içeren task
- Çok büyük sinyal: 8 SP üzeri, birden fazla bağımsız çıktı içeren task

## Task Kalite Kontrolü (zorunlu)
Bir task ancak aşağıdakilerin hepsi sağlanıyorsa "hazır" kabul edilir:
1. Tek cümlede net çıktı: "X davranışı çalışıyor."
2. Bağımsız doğrulama: acceptance criteria ile tek başına test edilebiliyor
3. Tek owner mantığı: bir agent/senior geliştirici tek akışta tamamlayabiliyor
4. Gizli bağımlılık yok: başka 3+ task bitmeden başlayabiliyor

## Anti-Pattern'ler (yapma)
- "Endpoint aç", "DTO ekle", "service method yaz" gibi mikro-task kırılımı
- Aynı bileşende phase-based ayrım:
  - araştırma ayrı
  - implement ayrı
  - test ayrı
- 3 SP işi 3 tane 1 SP task'a bölmek

## Ne zaman ayrı task açılır?
- Ayrı deployable boundary varsa (ör. backend service + frontend app + mobile app)
- Ayrı risk sınıfı varsa (ör. performans testi, contract test matrisi, migration riski)
- Ayrı onay/bağımlılık kapısı varsa (security approval, external API access)

## Hızlı Skor (0-2)
- Outcome clarity
- Testability
- Independence
- Dependency simplicity
- Agent-executability

Toplam:
- 8-10: iyi task
- 5-7: revize et
- 0-4: yeniden dilimle
