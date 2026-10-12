export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text, { lang = 'en-US', rate = 0.92 } = {}) {
  if (!canSpeak() || !text?.trim()) return false
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text.trim())
  utter.lang = lang
  utter.rate = rate
  const voices = window.speechSynthesis.getVoices()
  const en = voices.find((v) => v.lang?.toLowerCase().startsWith('en'))
  if (en) utter.voice = en
  window.speechSynthesis.speak(utter)
  return true
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
