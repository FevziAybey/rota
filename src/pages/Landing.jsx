import { Link } from 'react-router-dom'

const features = [
  {
    title: '10.000 kelimelik havuz',
    text: 'En sık kullanılan İngilizce kelimeler, Türkçe anlam, örnek cümle, quiz ve telaffuz.',
  },
  {
    title: 'SRS & günlük görev',
    text: 'Zor kelimeleri günlere yay, bugün X kelime + dakika hedefini tek ekranda bitir.',
  },
  {
    title: 'Seviye & okuma',
    text: 'Kısa yerleştirme testi bandını seçer; öğrendiğin kelimelerle bağlamlı paragraf üretir.',
  },
  {
    title: 'Rapor & hatırlatma',
    text: 'Aylık e-posta özeti, tarayıcı bildirimi ve isteğe bağlı çalışma hatırlatması.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Hesap oluştur',
    text: 'E-posta ile kaydol. Verilerin tarayıcıda değil, kendi hesabında saklanır.',
  },
  {
    n: '02',
    title: 'Havuzdan çalış',
    text: 'Kelime seç, anlamı gör, quiz çöz veya defterine ekle. İlerlemen kaybolmaz.',
  },
  {
    n: '03',
    title: 'Ritim oluştur',
    text: 'Seri, haftalık grafik ve isteğe bağlı aylık raporla rotanı sürdürülebilir tut.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="logo-mark">R</span>
          <strong>Rota</strong>
        </div>
        <div className="landing-nav-actions">
          <Link className="btn ghost btn-sm" to="/giris">
            Giriş yap
          </Link>
          <Link className="btn btn-sm" to="/giris?mod=kayit">
            Hesap oluştur
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">kişisel İngilizce alanı</p>
          <h1 className="landing-brand-hero">Rota</h1>
          <p className="landing-tagline">
            İngilizce ilerlemeni, kelime havuzunu ve hedeflerini tek hesapta
            takip et. Sade, özel, kendi temposunda.
          </p>
          <div className="landing-cta">
            <Link className="btn" to="/giris?mod=kayit">
              Ücretsiz başla
            </Link>
            <Link className="btn ghost" to="/giris">
              Giriş yap
            </Link>
          </div>
          <ul className="landing-hero-points">
            <li>10.000 kelimelik hazır havuz</li>
            <li>SRS tekrar ve günlük görev</li>
            <li>Hesabına kalıcı kayıt</li>
          </ul>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-orbit">
            <div className="landing-orbit-ring" />
            <div className="landing-orbit-ring landing-orbit-ring-2" />
            <div className="landing-orbit-core">
              <span>bugünkü hedef</span>
              <strong>30 dk</strong>
              <em>senin ritmin</em>
            </div>
            <div className="landing-float landing-float-a">seri · 7 gün</div>
            <div className="landing-float landing-float-b">havuz · 10k</div>
            <div className="landing-float landing-float-c">quiz · hazır</div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="nasil">
        <p className="landing-section-kicker">Nasıl çalışır</p>
        <h2>Üç adımda kendi alanın</h2>
        <p className="landing-section-lead">
          Rota bir gürültülü dil uygulaması değil; ilerlemeni görünür kılan kişisel
          bir takip alanı.
        </p>
        <div className="landing-steps">
          {steps.map((step) => (
            <article className="landing-step" key={step.n}>
              <span className="landing-step-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="ozellikler">
        <p className="landing-section-kicker">Ne sunar</p>
        <h2>İlerlemen için gerekenler</h2>
        <p className="landing-section-lead">
          Havuz, defter, hedef, not, dosya ve aylık özet — hepsi özel hesabında.
        </p>
        <div className="landing-features">
          {features.map((f) => (
            <article className="landing-feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-audience" id="kimler">
        <p className="landing-section-kicker">Kimler için</p>
        <h2>Kendi temposunda ilerleyenler</h2>
        <p className="landing-section-lead">
          Kurs takibi, sınav hazırlığı veya günlük dil alışkanlığı — Rota senin
          ritmini bozmadan kaydeder.
        </p>
        <ul className="landing-audience-list">
          <li>Kendi kendine İngilizce çalışanlar</li>
          <li>Kelime havuzunu sistemli bitirmek isteyenler</li>
          <li>Aylık ilerlemeyi e-posta ile görmek isteyenler</li>
        </ul>
      </section>

      <section className="landing-closing">
        <h2>Rotanı bugün başlat</h2>
        <p>Hesap oluştur; ilk kelimeni veya seansını birkaç saniyede ekle.</p>
        <div className="landing-cta">
          <Link className="btn" to="/giris?mod=kayit">
            Hesap oluştur
          </Link>
          <Link className="btn ghost" to="/giris">
            Zaten hesabım var
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="logo-mark sm">R</span>
        <span>Rota — kişisel İngilizce & hedef takibi</span>
      </footer>
    </div>
  )
}
