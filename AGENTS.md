# Rota — sürekli geliştirme

Bu repo canlı bir ürün iskeleti. Her geliştirme turunda şunları uygula:

## Ürün omurgası
- Hesaplı kişisel İngilizce + hedef takip (Express API + React/Vite)
- Kelime havuzu (10k), defter, kartlar, dosya yükleme, aylık e-posta raporu
- Landing (çıkış) / uygulama (giriş)
- Render: `render.yaml` + Postgres + disk (`DATA_DIR=/var/data`)

## Her turda kontrol
1. `npm run build` geçsin
2. API health: storage + wordbank.total
3. Auth, data save, wordbank progress, files (varsa) kırılmasın
4. UI Türkçe, kullanıcı dostu, mevcut tasarım dilini bozma
5. Render uyumluluğu: tek process `npm start`, `dist` serve, env ile config

## İyileştirme önceliği
1. Bug / kırık akış
2. Veri güvenliği ve kalıcı kayıt (atomik yazım, progress merge)
3. Kelime havuzu kalitesi (anlam/örnek zenginleştirme)
4. UX (boş durumlar, mobil nav, net kopya)
5. Küçük yeni özellik (ölçülebilir, tamamlanmış)

## Yapma
- Commit / push istemeden yapma
- Büyük yeniden yazım; mevcut deseni bozma
- Render’sız “sadece local” çözümler ekleme
