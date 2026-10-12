import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { format, startOfDay, subDays } from 'date-fns'
import { api } from '../lib/api'
import { BADGE_DEFS, evaluateBadges } from '../lib/badges'
import { uid } from '../lib/id'
import { listDueIds } from '../lib/srs'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const AppContext = createContext(null)
const OFFLINE_KEY = 'rota-offline-data'

const BANDS = [
  { id: '1-1000', from: 1, to: 1000 },
  { id: '1001-2000', from: 1001, to: 2000 },
  { id: '2001-3000', from: 2001, to: 3000 },
  { id: '3001-5000', from: 3001, to: 5000 },
  { id: '5001-7500', from: 5001, to: 7500 },
  { id: '7501-10000', from: 7501, to: 10000 },
]

const empty = () => ({
  studySessions: [],
  vocabulary: [],
  goals: [],
  notes: [],
  files: [],
  wordbankProgress: {},
  srs: {},
  badges: [],
  friends: [],
  questLog: [],
  settings: {
    dailyTarget: 30,
    dailyWordsTarget: 15,
    monthlyReport: true,
    emailReminder: false,
    studyReminder: '',
    onboardingDismissed: false,
    wordbankBand: '1-1000',
    placementDone: false,
  },
})

function normalizeSettings(raw = {}) {
  return {
    dailyTarget: Number(raw.dailyTarget) || 30,
    dailyWordsTarget: Number(raw.dailyWordsTarget) || 15,
    monthlyReport: raw.monthlyReport === undefined ? true : Boolean(raw.monthlyReport),
    emailReminder: Boolean(raw.emailReminder),
    studyReminder: typeof raw.studyReminder === 'string' ? raw.studyReminder : '',
    onboardingDismissed: Boolean(raw.onboardingDismissed),
    wordbankBand:
      typeof raw.wordbankBand === 'string' ? raw.wordbankBand : '1-1000',
    placementDone: Boolean(raw.placementDone),
  }
}

function shapeData(next = {}) {
  return {
    studySessions: next.studySessions || [],
    vocabulary: next.vocabulary || [],
    goals: next.goals || [],
    notes: next.notes || [],
    files: next.files || [],
    wordbankProgress: next.wordbankProgress || {},
    srs: next.srs || {},
    badges: Array.isArray(next.badges) ? next.badges : [],
    friends: Array.isArray(next.friends) ? next.friends : [],
    questLog: Array.isArray(next.questLog) ? next.questLog : [],
    settings: normalizeSettings(next.settings),
  }
}

function bandKnownCounts(progress = {}) {
  const out = {}
  for (const band of BANDS) {
    let known = 0
    for (let r = band.from; r <= band.to; r += 1) {
      const id = `w${String(r).padStart(5, '0')}`
      if (progress[id] === 'known') known += 1
    }
    out[band.id] = known
  }
  return out
}

function todayQuestWords(questLog = [], todayKey) {
  const entry = questLog.find((q) => q.date === todayKey)
  return Number(entry?.words) || 0
}

export function AppProvider({ children }) {
  const { isAuthed } = useAuth()
  const { push } = useToast()
  const [data, setData] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const skipSave = useRef(true)
  const saveTimer = useRef(null)
  const badgeToast = useRef(new Set())

  const load = useCallback(async () => {
    if (!isAuthed) {
      setData(empty())
      setOffline(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const next = await api.getData()
      skipSave.current = true
      const shaped = shapeData(next)
      setData(shaped)
      setOffline(false)
      try {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(shaped))
      } catch {
        /* ignore quota */
      }
    } catch (err) {
      try {
        const cached = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null')
        if (cached) {
          skipSave.current = true
          setData(shapeData(cached))
          setOffline(true)
          setError('Çevrimdışı önbellek kullanılıyor')
          return
        }
      } catch {
        /* ignore */
      }
      setError(err.message || 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [isAuthed])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!isAuthed) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await api.saveData(data)
        try {
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(data))
        } catch {
          /* ignore */
        }
        setError('')
        setOffline(false)
      } catch (err) {
        setError(err.message || 'Kayıt başarısız')
        push('Kayıt başarısız', 'error')
      } finally {
        setSaving(false)
      }
    }, 450)

    return () => clearTimeout(saveTimer.current)
  }, [data, isAuthed, push])

  const update = (updater) => {
    setData((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }

  const bumpQuestWords = useCallback((n = 1) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    update((prev) => {
      const log = [...(prev.questLog || [])]
      const idx = log.findIndex((q) => q.date === todayKey)
      const wordsTarget = prev.settings?.dailyWordsTarget || 15
      const minutesTarget = prev.settings?.dailyTarget || 30
      const todayMinutes = prev.studySessions
        .filter((s) => s.date === todayKey)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)
      if (idx >= 0) {
        const words = (Number(log[idx].words) || 0) + n
        const done = words >= wordsTarget && todayMinutes >= minutesTarget
        log[idx] = { ...log[idx], words, done: done || Boolean(log[idx].done) }
      } else {
        log.unshift({
          date: todayKey,
          words: n,
          done: n >= wordsTarget && todayMinutes >= minutesTarget,
        })
      }
      return { ...prev, questLog: log.slice(0, 90) }
    })
  }, [])

  const addSession = ({ minutes, type, note, date }) => {
    const day = date || format(new Date(), 'yyyy-MM-dd')
    update((prev) => {
      const sessions = [
        {
          id: uid(),
          minutes: Number(minutes) || 0,
          type: type || 'vocab',
          note: note?.trim() || '',
          date: day,
        },
        ...prev.studySessions,
      ]
      const todayKey = format(new Date(), 'yyyy-MM-dd')
      const log = [...(prev.questLog || [])]
      if (day === todayKey) {
        const wordsTarget = prev.settings?.dailyWordsTarget || 15
        const minutesTarget = prev.settings?.dailyTarget || 30
        const todayMinutes = sessions
          .filter((s) => s.date === todayKey)
          .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)
        const idx = log.findIndex((q) => q.date === todayKey)
        const words = idx >= 0 ? Number(log[idx].words) || 0 : 0
        const done = words >= wordsTarget && todayMinutes >= minutesTarget
        if (idx >= 0) log[idx] = { ...log[idx], done: done || Boolean(log[idx].done) }
        else log.unshift({ date: todayKey, words: 0, done })
      }
      return { ...prev, studySessions: sessions, questLog: log.slice(0, 90) }
    })
    push('Çalışma kaydedildi')
  }

  const removeSession = (id) => {
    update((prev) => ({
      ...prev,
      studySessions: prev.studySessions.filter((s) => s.id !== id),
    }))
    push('Seans silindi')
  }

  const addWord = ({ word, meaning, example, mastered = false }, { silent } = {}) => {
    const trimmed = word.trim().toLowerCase()
    let added = false
    update((prev) => {
      const exists = prev.vocabulary.some(
        (w) => w.word.trim().toLowerCase() === trimmed,
      )
      if (exists) return prev
      added = true
      return {
        ...prev,
        vocabulary: [
          {
            id: uid(),
            word: word.trim(),
            meaning: meaning.trim(),
            example: example?.trim() || '',
            mastered: Boolean(mastered),
            createdAt: new Date().toISOString(),
          },
          ...prev.vocabulary,
        ],
      }
    })
    if (!silent) {
      push(added ? 'Kelime eklendi' : 'Bu kelime zaten defterde')
    }
    return added
  }

  const toggleWord = (id) => {
    update((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.map((w) =>
        w.id === id ? { ...w, mastered: !w.mastered } : w,
      ),
    }))
  }

  const removeWord = (id) => {
    update((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.filter((w) => w.id !== id),
    }))
    push('Kelime silindi')
  }

  const addGoal = ({ title, description, category, targetDate }) => {
    update((prev) => ({
      ...prev,
      goals: [
        {
          id: uid(),
          title: title.trim(),
          description: description?.trim() || '',
          category: category || 'genel',
          targetDate: targetDate || '',
          progress: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        ...prev.goals,
      ],
    }))
    push('Hedef eklendi')
  }

  const setGoalProgress = (id, progress) => {
    const value = Math.max(0, Math.min(100, Number(progress) || 0))
    update((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              progress: value,
              status: value >= 100 ? 'done' : 'active',
            }
          : g,
      ),
    }))
  }

  const toggleGoalDone = (id) => {
    update((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== id) return g
        const done = g.status !== 'done'
        return {
          ...g,
          status: done ? 'done' : 'active',
          progress: done ? 100 : Math.min(g.progress, 90),
        }
      }),
    }))
  }

  const removeGoal = (id) => {
    update((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }))
    push('Hedef silindi')
  }

  const addNote = ({ title, body }) => {
    update((prev) => ({
      ...prev,
      notes: [
        {
          id: uid(),
          title: title.trim() || 'Not',
          body: body.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev.notes,
      ],
    }))
    push('Not kaydedildi')
  }

  const removeNote = (id) => {
    update((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }))
    push('Not silindi')
  }

  const updateSettings = (partial, { silent } = {}) => {
    update((prev) => ({
      ...prev,
      settings: normalizeSettings({
        ...prev.settings,
        ...partial,
      }),
    }))
    if (!silent) push('Ayarlar güncellendi')
  }

  const setFiles = (files) => {
    skipSave.current = true
    update((prev) => ({ ...prev, files: Array.isArray(files) ? files : [] }))
  }

  const setWordbankStatus = async (id, status) => {
    const res = await api.setWordbankProgress(id, status)
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    update((prev) => {
      let questLog = prev.questLog || []
      if (status !== 'new') {
        const log = [...questLog]
        const wordsTarget = prev.settings?.dailyWordsTarget || 15
        const minutesTarget = prev.settings?.dailyTarget || 30
        const todayMinutes = prev.studySessions
          .filter((s) => s.date === todayKey)
          .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)
        const idx = log.findIndex((q) => q.date === todayKey)
        const words = (idx >= 0 ? Number(log[idx].words) || 0 : 0) + 1
        const done = words >= wordsTarget && todayMinutes >= minutesTarget
        if (idx >= 0) {
          log[idx] = { ...log[idx], words, done: done || Boolean(log[idx].done) }
        } else {
          log.unshift({ date: todayKey, words, done })
        }
        questLog = log.slice(0, 90)
      }
      return {
        ...prev,
        wordbankProgress: res.wordbankProgress || prev.wordbankProgress,
        srs: res.srs || prev.srs,
        questLog,
      }
    })
    return res
  }

  const setFriends = (friends) => {
    update((prev) => ({
      ...prev,
      friends: Array.isArray(friends) ? friends : [],
    }))
  }

  const addFriend = (friend) => {
    update((prev) => {
      if (prev.friends.some((f) => f.code === friend.code)) return prev
      return {
        ...prev,
        friends: [
          {
            code: friend.code,
            name: friend.name || 'Arkadaş',
            addedAt: new Date().toISOString(),
          },
          ...prev.friends,
        ],
      }
    })
    push('Arkadaş eklendi')
  }

  const removeFriend = (code) => {
    update((prev) => ({
      ...prev,
      friends: prev.friends.filter((f) => f.code !== code),
    }))
    push('Arkadaş kaldırıldı')
  }

  const importData = (incoming) => {
    update(shapeData(incoming))
    push('Veriler içeri aktarıldı')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rota-yedek-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    push('Yedek indirildi')
  }

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const todayKey = format(today, 'yyyy-MM-dd')
    const dailyTarget = data.settings?.dailyTarget || 30
    const dailyWordsTarget = data.settings?.dailyWordsTarget || 15

    const todayMinutes = data.studySessions
      .filter((s) => s.date === todayKey)
      .reduce((sum, s) => sum + s.minutes, 0)

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i)
      const key = format(day, 'yyyy-MM-dd')
      const minutes = data.studySessions
        .filter((s) => s.date === key)
        .reduce((sum, s) => sum + s.minutes, 0)
      return { date: key, label: format(day, 'EEE'), minutes }
    })

    let streak = 0
    for (let i = 0; i < 365; i += 1) {
      const key = format(subDays(today, i), 'yyyy-MM-dd')
      const hasStudy = data.studySessions.some((s) => s.date === key && s.minutes > 0)
      if (hasStudy) streak += 1
      else if (i === 0) continue
      else break
    }

    const weekTotal = weekDays.reduce((s, d) => s + d.minutes, 0)
    const activeDays = weekDays.filter((d) => d.minutes > 0).length
    const weekAvg = activeDays ? Math.round(weekTotal / 7) : 0
    const weekWords = data.vocabulary.filter((w) => {
      if (!w.createdAt) return false
      const created = startOfDay(new Date(w.createdAt))
      return created >= subDays(today, 6)
    }).length

    const questWords = todayQuestWords(data.questLog, todayKey)
    const questDone = Boolean(
      data.questLog.find((q) => q.date === todayKey)?.done ||
        (questWords >= dailyWordsTarget && todayMinutes >= dailyTarget),
    )
    const questsCompleted = (data.questLog || []).filter((q) => q.done).length
    const dueCount = listDueIds(data.srs, data.wordbankProgress, 200).length
    const bandKnown = bandKnownCounts(data.wordbankProgress)

    return {
      todayMinutes,
      dailyTarget,
      dailyWordsTarget,
      dailyProgress: Math.min(100, Math.round((todayMinutes / dailyTarget) * 100)),
      weekDays,
      weekTotal,
      weekAvg,
      activeDays,
      weekWords,
      weekTarget: dailyTarget * 7,
      weekProgress: Math.min(100, Math.round((weekTotal / (dailyTarget * 7)) * 100)),
      streak,
      activeGoals: data.goals.filter((g) => g.status === 'active').length,
      doneGoals: data.goals.filter((g) => g.status === 'done').length,
      wordCount: data.vocabulary.length,
      masteredWords: data.vocabulary.filter((w) => w.mastered).length,
      noteCount: data.notes.length,
      fileCount: (data.files || []).length,
      wordbankKnown: Object.values(data.wordbankProgress || {}).filter(
        (s) => s === 'known',
      ).length,
      wordbankHard: Object.values(data.wordbankProgress || {}).filter(
        (s) => s === 'hard',
      ).length,
      wordbankLearning: Object.values(data.wordbankProgress || {}).filter(
        (s) => s === 'learning',
      ).length,
      questWords,
      questDone,
      questsCompleted,
      dueCount,
      bandKnown,
      badges: data.badges || [],
    }
  }, [data])

  useEffect(() => {
    if (!isAuthed || loading) return
    const newly = evaluateBadges(
      {
        streak: stats.streak,
        wordbankKnown: stats.wordbankKnown,
        bandKnown: stats.bandKnown,
        questsCompleted: stats.questsCompleted,
        fileCount: stats.fileCount,
      },
      data.badges || [],
    )
    if (!newly.length) return
    const fresh = newly.filter((id) => !badgeToast.current.has(id))
    update((prev) => ({
      ...prev,
      badges: [...new Set([...(prev.badges || []), ...newly])],
    }))
    for (const id of fresh) {
      badgeToast.current.add(id)
      const def = BADGE_DEFS.find((b) => b.id === id)
      if (def) push(`Rozet: ${def.title}`)
    }
  }, [
    isAuthed,
    loading,
    stats.streak,
    stats.wordbankKnown,
    stats.bandKnown,
    stats.questsCompleted,
    stats.fileCount,
    data.badges,
    push,
  ])

  const value = {
    data,
    stats,
    loading,
    saving,
    error,
    offline,
    addSession,
    removeSession,
    addWord,
    toggleWord,
    removeWord,
    addGoal,
    setGoalProgress,
    toggleGoalDone,
    removeGoal,
    addNote,
    removeNote,
    updateSettings,
    setFiles,
    setWordbankStatus,
    bumpQuestWords,
    setFriends,
    addFriend,
    removeFriend,
    importData,
    exportData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
