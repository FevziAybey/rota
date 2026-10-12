/**
 * Builds server/data/wordbank.json from google-10000.txt + seed translations.
 * Run: node scripts/build-wordbank.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const listPath = path.join(__dirname, 'google-10000.txt')
const outDir = path.join(root, 'server', 'data')
const outFile = path.join(outDir, 'wordbank.json')
const metaFile = path.join(outDir, 'wordbank-meta.json')

/** Compact seed: word|turkish|example (one per line) — high-frequency coverage */
const SEED_RAW = `
the|belirli artikel / o|The book is on the table.
of|-ın/-in / ...nın|She is a friend of mine.
and|ve|I like tea and coffee.
to|-e/-a / için|I want to learn English.
a|bir (belirsiz artikel)|She bought a new bag.
in|içinde / -de|The keys are in the drawer.
for|için|This gift is for you.
is|-dir / olmak (o)|This is my notebook.
on|üzerinde / -de|The cup is on the desk.
that|şu / o / ki|I know that you are right.
by|tarafından / yanında|The song was written by her.
this|bu|This lesson is important.
with|ile|I study with my friend.
i|ben|I practice every day.
you|sen / siz|You can do this.
it|o (cansız)|It looks easy.
not|değil / -ma/-me|I am not tired.
or|veya|Tea or coffee?
be|olmak|Be patient with yourself.
are|-siniz / -dirler|You are improving.
from|-den/-dan|I am from Turkey.
at|-de/-da|Meet me at school.
as|olarak / gibi|She works as a teacher.
your|senin / sizin|Is this your pen?
all|hepsi / tüm|All students are welcome.
have|sahip olmak / -miş|I have a question.
new|yeni|I learned a new word.
more|daha fazla|I need more practice.
an|bir (sesli harf öncesi)|She ate an apple.
was|-di / idi|It was a good day.
we|biz|We study together.
will|-ecek / -acak|I will finish this tonight.
home|ev|I am going home.
can|ebilmek|You can speak slowly.
us|bizi / bize|Join us for class.
about|hakkında|Tell me about your goal.
if|eğer|If you practice, you improve.
page|sayfa|Open page ten.
my|benim|This is my dictionary.
has|sahip / -miş (o)|She has two books.
search|arama / aramak|Search for the word.
free|ücretsiz / özgür|The app is free to use.
but|ama|I tried, but it was hard.
our|bizim|Our team is ready.
one|bir / biri|One day you will succeed.
other|diğer|Try the other exercise.
do|yapmak|Do your homework.
no|hayır / hiç|No problem.
information|bilgi|I need more information.
time|zaman / süre|I need more time to study.
they|onlar|They are learning English.
site|site / alan|Visit the learning site.
he|o (erkek)|He speaks clearly.
up|yukarı / -e kadar|Wake up early.
may|-ebilir|You may start now.
what|ne|What does this mean?
which|hangi|Which word is new?
their|onların|Their progress is clear.
news|haber|I read the news daily.
out|dışarı|Let's go out.
use|kullanmak / kullanım|Use this example.
any|herhangi|Do you have any questions?
there|orada|There is a book here.
see|görmek|I see your point.
only|sadece|Only practice helps.
so|yani / bu yüzden|I was tired, so I rested.
his|onun (erkek)|His accent is clear.
when|ne zaman / -dığında|When do you study?
contact|iletişim / iletişime geçmek|Contact your tutor.
here|burada|Come here please.
business|iş / ticaret|She runs a small business.
who|kim|Who wrote this?
web|ağ / web|I browse the web carefully.
also|ayrıca|I also take notes.
now|şimdi|Start now.
help|yardım / yardım etmek|Can you help me?
get|almak / edinmek|Get a notebook.
pm|öğleden sonra / akşam|Class starts at 7 pm.
view|görünüm / bakış|In my view, this works.
online|çevrimiçi|I study online every night.
first|ilk|This is my first lesson.
been|-miş/-mış (perfect)|I have been practicing.
would|-erdi / -ardı|I would like some tea.
how|nasıl|How do you say this?
were|-di / idiler|They were late.
me|beni / bana|Call me later.
services|hizmetler|Online services help learners.
some|bazı|Some words are easier.
these|bunlar|These examples are useful.
click|tıklamak / tık|Click the next button.
its|onun (cansız)|The city has its charm.
like|gibi / sevmek|I like reading.
than|-den daha|Better than yesterday.
find|bulmak|Find the meaning.
price|fiyat|The price is fair.
date|tarih / randevu|What's the date today?
back|geri|Go back to the list.
top|üst / en iyi|She is at the top.
people|insanlar|People learn at different speeds.
had|-mişti|I had breakfast.
list|liste|Add it to your list.
name|ad / isim|Write your name.
just|sadece / az önce|I just finished.
over|-den fazla / üstünde|The lesson is over.
year|yıl|This year I will improve.
day|gün|Every day counts.
into|-e doğru / içine|Walk into the room.
state|eyalet / durum|Check your progress state.
email|e-posta|Send me an email.
two|iki|I learned two words.
health|sağlık|Sleep helps your health.
world|dünya|English connects the world.
next|sonraki|Open the next card.
used|kullanılan / alışkın|I used a dictionary.
work|iş / çalışmak|I work on vocabulary.
last|son / geçen|Last week was productive.
most|en çok / çoğu|Most people need practice.
products|ürünler|Language products vary.
music|müzik|Music helps memory.
buy|satın almak|Buy a good notebook.
data|veri|Save your learning data.
make|yapmak / etmek|Make a study plan.
them|onları / onlara|I helped them.
should|-meli/-malı|You should review daily.
product|ürün|This product is useful.
system|sistem|The system saves progress.
post|gönderi / göndermek|Post your notes.
her|onu / onun (kadın)|I called her.
city|şehir|I live in a big city.
add|eklemek|Add this word.
policy|politika|Read the privacy policy.
number|numara / sayı|Write the number clearly.
such|böyle|Such practice works well.
please|lütfen|Please speak slowly.
available|mevcut / kullanılabilir|Help is available.
copyright|telif hakkı|Check the copyright notice.
support|destek|Ask for support.
message|mesaj|Send a short message.
after|-den sonra|Rest after studying.
best|en iyi|Do your best.
software|yazılım|The software is simple.
then|sonra|Study, then rest.
jan|ocak (kısaltma)|The course starts in Jan.
good|iyi|Good job today.
video|video|Watch a short video.
well|iyi / kuyu|You did well.
where|nerede|Where is my book?
info|bilgi|More info is below.
rights|haklar|Protect your rights.
public|kamuya açık|This is a public library.
books|kitaplar|I love reading books.
high|yüksek|Aim high.
school|okul|I go to school.
through|-den geçerek|Read through the text.
day|gün|One day at a time.
each|her biri|Practice each word.
link|bağlantı|Open the link.
review|inceleme / tekrar|Review yesterday's words.
years|yıllar|It takes years of practice.
order|sipariş / sıra|Put them in order.
very|çok|I am very focused.
privacy|gizlilik|Privacy matters.
book|kitap|Open your book.
items|öğeler|Check the items.
company|şirket|She works at a company.
read|okumak|Read out loud.
group|grup|Join a study group.
need|ihtiyaç / ihtiyaç duymak|I need more examples.
many|birçok|Many words repeat.
user|kullanıcı|Each user has a profile.
said|dedi|She said it clearly.
does|-yor / -r (o)|Does this make sense?
set|ayarlamak / set|Set a daily goal.
under|altında|Look under the table.
general|genel|A general rule helps.
research|araştırma|Do your own research.
university|üniversite|She studies at university.
january|ocak|Classes begin in January.
mail|posta / e-posta|Check your mail.
full|dolu / tam|The page is full.
map|harita|Use a mind map.
reviews|yorumlar / incelemeler|Read the reviews.
program|program|Follow the program.
life|hayat|English is part of life.
know|bilmek|I know this word.
management|yönetim|Time management helps.
part|kısım / parça|This is part of learning.
could|-ebilirdi|I could try again.
great|harika|Great progress today.
hotel|otel|We stayed at a hotel.
real|gerçek|Use real sentences.
item|öğe|Check each item.
international|uluslararası|International exams exist.
center|merkez|Meet at the center.
ebay|eBay|Search listings carefully.
must|-meli|You must practice.
store|mağaza / depolamak|Store your notes safely.
travel|seyahat|I travel to learn.
comments|yorumlar|Read the comments.
make|yapmak|Make it a habit.
development|gelişim|Language development takes time.
report|rapor|Monthly report arrives by email.
off|-den uzak / kapalı|Turn the TV off.
member|üye|Become a member.
details|ayrıntılar|See the details below.
terms|şartlar|Accept the terms.
before|-den önce|Review before the test.
hotels|oteller|Compare hotels online.
did|-di (geçmiş)|Did you study today?
send|göndermek|Send the file.
right|doğru / sağ|That's right.
type|tür / yazmak|Type the answer.
because|çünkü|I rest because I am tired.
local|yerel|Join a local club.
those|şunlar|Those cards are new.
using|kullanarak|Learn using examples.
results|sonuçlar|Check your results.
office|ofis|She works in an office.
education|eğitim|Education never stops.
national|ulusal|National exams are hard.
car|araba|I take the car to class.
design|tasarım|Good design feels calm.
take|almak / götürmek|Take notes carefully.
posted|gönderildi|I posted my summary.
internet|internet|The internet helps learners.
address|adres|Write your address.
community|topluluk|Join a learning community.
within|-içinde|Finish within a week.
states|eyaletler / durumlar|United States English varies.
area|alan|Focus on one area.
area|alan|Focus on this area.
want|istemek|I want to improve.
phone|telefon|Put your phone away.
dvd|DVD|Watch a DVD with subtitles.
shipping|kargo|Free shipping is rare.
reserved|ayrılmış|All rights reserved.
subject|konu|Change the subject.
between|-arasında|Choose between two options.
forum|forum|Ask in the forum.
family|aile|My family supports me.
long|uzun|It has been a long day.
based|dayalı|Based on your level.
code|kod|Enter the code.
show|göstermek / şov|Show me an example.
even|bile / hatta|Even short practice helps.
black|siyah|Write with a black pen.
check|kontrol etmek|Check your spelling.
special|özel|Special offer for students.
prices|fiyatlar|Compare prices carefully.
website|web sitesi|Visit the website daily.
index|dizin / endeks|See the index page.
being|olma / varlık|Being consistent matters.
women|kadınlar|Women lead many teams.
much|çok|Thank you very much.
sign|işaret / imzalamak|Sign in to continue.
file|dosya|Upload the file.
link|bağlantı|Share the link.
open|açık / açmak|Open the next lesson.
today|bugün|Study today, rest later.
technology|teknoloji|Technology supports learning.
south|güney|They live in the south.
case|durum / kutu|In this case, wait.
project|proje|Finish the project slowly.
same|aynı|Same time tomorrow.
pages|sayfalar|Read five pages.
version|sürüm|Update to the new version.
section|bölüm|This section is short.
own|kendi|Use your own words.
found|bulundu / kurdu|I found a better method.
sports|spor|Sports teach discipline.
house|ev|Stay in the house.
related|ilgili|Related words help memory.
security|güvenlik|Account security matters.
county|ilçe|She moved to another county.
american|Amerikalı|American English spelling differs.
photo|fotoğraf|Save the photo.
game|oyun|Learning can feel like a game.
members|üyeler|Members share tips.
power|güç|Knowledge is power.
while|-iken / iken|Study while listening.
care|önemsemek / bakım|Take care of yourself.
network|ağ|Build a study network.
media|medya|Social media distracts sometimes.
control|kontrol|Control your schedule.
water|su|Drink water while studying.
history|tarih|History of the word matters.
picture|resim|Draw a picture of meaning.
size|boyut|Choose a clear font size.
art|sanat|Language is an art.
personal|kişisel|This is your personal space.
since|-den beri|I have studied since Monday.
including|dahil|Packages including notes.
guide|rehber|Follow this guide.
shop|dükkan / alışveriş|Shop for a notebook.
directory|dizin|Open the directory.
board|tahta / kurul|Write it on the board.
location|konum|Share your location carefully.
change|değişim / değiştirmek|Change one habit at a time.
white|beyaz|Use white space in notes.
text|metin|Read the text slowly.
small|küçük|Start with small goals.
rating|derecelendirme|Check the rating first.
rate|oran / değerlendirmek|Rate your confidence.
government|hükümet|Government sites use formal English.
children|çocuklar|Children learn fast.
during|-sırasında|Silent during the exam.
usa|ABD|USA spelling differs sometimes.
return|dönmek / iade|Return to the word list.
student|öğrenci|Every student needs patience.
shopping|alışveriş|Shopping lists teach nouns.
account|hesap|Protect your account.
times|kez / zamanlar|Practice three times.
sites|siteler|Useful sites help a lot.
level|seviye|Choose your level carefully.
digital|dijital|Keep a digital notebook.
profile|profil|Update your profile.
previous|önceki|Open the previous lesson.
form|form / biçim|Fill the form carefully.
events|etkinlikler|Language events are fun.
love|sevgi / sevmek|I love learning words.
old|eski|Review old vocabulary.
john|John (isim)|John teaches English.
main|ana|Focus on the main idea.
call|aramak / çağrı|Call it a day.
hours|saatler|Two hours of focus help.
image|görüntü|An image aids memory.
title|başlık|Write a clear title.
another|başka bir|Try another example.
shall|-meli / -acak (resmi)|Shall we begin?
property|mülk / özellik|A key property of verbs.
class|sınıf / ders|Join the morning class.
still|hâlâ|I still remember that word.
money|para|Save money for books.
quality|kaliteli / kalite|Quality practice beats quantity.
every|her|Practice every morning.
content|içerik|Read quality content.
country|ülke|Visit another country someday.
private|özel|Keep notes private.
download|indirmek|Download the worksheet.
save|kaydetmek|Save your progress.
tools|araçlar|Use simple tools.
create|oluşturmak|Create a weekly plan.
category|kategori|Pick a category to study.
advanced|ileri seviye|Advanced words take time.
english|İngilizce|I study English daily.
language|dil|Language grows with use.
practice|pratik / pratik yapmak|Practice out loud.
learn|öğrenmek|Learn one word deeply.
word|kelime|This word is common.
sentence|cümle|Write a full sentence.
meaning|anlam|Check the meaning twice.
example|örnek|Give a clear example.
vocabulary|kelime dağarcığı|Build vocabulary slowly.
grammar|dilbilgisi|Grammar supports clarity.
listen|dinlemek|Listen every evening.
speak|konuşmak|Speak without fear.
write|yazmak|Write short paragraphs.
study|çalışmak / ders|Study with a timer.
focus|odak|Focus for twenty minutes.
progress|ilerleme|Track your progress weekly.
habit|alışkanlık|A small habit compounds.
goal|hedef|Set a realistic goal.
memory|hafıza|Sleep improves memory.
mistake|hata|A mistake teaches you.
fluent|akıcı|Stay patient to become fluent.
accent|aksan|Your accent is unique.
translate|çevirmek|Don't translate every word.
dictionary|sözlük|Use a bilingual dictionary.
notebook|defter|Keep a paper notebook.
teacher|öğretmen|Ask your teacher questions.
lesson|ders|Finish today's lesson.
exam|sınav|Prepare for the exam early.
score|puan|Improve your score gradually.
skill|beceri|Speaking is a skill.
confidence|özgüven|Confidence grows with reps.
daily|günlük|Make a daily routine.
weekly|haftalık|Do a weekly review.
monthly|aylık|Send a monthly report.
`

function parseSeed(raw) {
  const map = new Map()
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const [word, meaningTr, example] = t.split('|')
    if (!word || !meaningTr) continue
    map.set(word.toLowerCase(), {
      meaningTr: meaningTr.trim(),
      example: (example || `I am learning the word "${word}".`).trim(),
    })
  }
  return map
}

function isWeakMeaning(meaning) {
  const m = String(meaning || '').trim()
  if (!m) return true
  if (m.startsWith('Sık kullanılan')) return true
  if (m.startsWith('(')) return true
  if (m.includes('bağlamda öğren')) return true
  if (m.includes('yaygın İngilizce sözcük')) return true
  if (/İngilizce kelime\s*\(sıra/.test(m)) return true
  return false
}

function fallbackMeaning(word, rank) {
  const w = String(word || '').toLowerCase()
  if (w.endsWith('ing') && w.length > 4)
    return `${w.slice(0, -3)} eyleminin -ing hali / sürmekte olan`
  if (w.endsWith('ed') && w.length > 3)
    return `${w.slice(0, -2)} eyleminin geçmiş hali`
  if (w.endsWith('ly') && w.length > 3) return `${w.slice(0, -2)} şekilde / zarf`
  if (w.endsWith('tion') || w.endsWith('sion')) return `${w} (isim): eylem veya durum`
  if (w.endsWith('ness')) return `${w.slice(0, -4)} olma durumu`
  if (w.endsWith('ment')) return `${w.slice(0, -4)} sonucu / eylemi`
  if (w.endsWith('able') || w.endsWith('ible')) return `${w}: yapılabilir / mümkün`
  if (w.endsWith('ful')) return `${w.slice(0, -3)} dolu / -li`
  if (w.endsWith('less')) return `${w.slice(0, -4)}sız / -siz`
  if (w.length <= 3) return `${w.toUpperCase()} kısaltması / kısa biçim`
  return `${w} (özel ad, marka veya terim)`
}

function fallbackExample(word) {
  const w = word.toLowerCase()
  if (w.length <= 3) {
    return `You will see "${word}" very often in English texts.`
  }
  if (w.endsWith('ing')) {
    return `She is ${word} carefully today.`
  }
  if (w.endsWith('ed')) {
    return `They ${word} the task yesterday.`
  }
  if (w.endsWith('ly')) {
    return `He spoke ${word} during the meeting.`
  }
  if (w.endsWith('s') && w.length > 4) {
    return `These ${word} appear in many everyday conversations.`
  }
  return `I need to remember the word "${word}" and use it in a sentence.`
}

function main() {
  if (!fs.existsSync(listPath)) {
    console.error('Missing scripts/google-10000.txt')
    process.exit(1)
  }

  const seed = parseSeed(SEED_RAW)
  const cacheFile = path.join(__dirname, 'meanings-cache.json')
  const cache = fs.existsSync(cacheFile)
    ? JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    : {}
  const previous = fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
    : []
  const prevByWord = new Map(
    previous.map((w) => [String(w.word || '').toLowerCase(), w]),
  )

  const words = fs
    .readFileSync(listPath, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)

  const bank = words.map((word, i) => {
    const rank = i + 1
    const hit = seed.get(word)
    const cached = cache[word]
    const old = prevByWord.get(word)
    const oldGood =
      old?.seeded && old?.meaningTr && !isWeakMeaning(old.meaningTr)
    const cachedGood = cached && !isWeakMeaning(cached)

    let meaningTr = hit?.meaningTr
    let example = hit?.example
    let seeded = Boolean(hit)

    if ((!meaningTr || isWeakMeaning(meaningTr)) && cachedGood) {
      meaningTr = cached
      seeded = true
    }
    if ((!meaningTr || isWeakMeaning(meaningTr)) && oldGood) {
      meaningTr = old.meaningTr
      example = old.example || example
      seeded = true
    }
    if (!meaningTr || isWeakMeaning(meaningTr)) {
      meaningTr = fallbackMeaning(word, rank)
      seeded = true
    }
    if (!example) example = old?.example || fallbackExample(word)

    return {
      id: `w${String(rank).padStart(5, '0')}`,
      rank,
      word,
      meaningTr,
      example,
      seeded,
    }
  })


  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(bank))
  const quality = bank.filter((w) => w.seeded && !isWeakMeaning(w.meaningTr)).length
  const meta = {
    total: bank.length,
    seeded: bank.filter((w) => w.seeded).length,
    quality,
    generatedAt: new Date().toISOString(),
    bands: [
      { id: '1-1000', from: 1, to: 1000 },
      { id: '1001-2000', from: 1001, to: 2000 },
      { id: '2001-3000', from: 2001, to: 3000 },
      { id: '3001-5000', from: 3001, to: 5000 },
      { id: '5001-7500', from: 5001, to: 7500 },
      { id: '7501-10000', from: 7501, to: 10000 },
    ],
  }
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  console.log(
    `Wrote ${bank.length} words (${meta.seeded} seeded, ${quality} quality) -> ${outFile}`,
  )
}

main()
