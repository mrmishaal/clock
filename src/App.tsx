import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import Worker from './worker?worker'

type Mode = 'clock' | 'pomodoro' | 'timer' | 'stopwatch'
type View = 'digital' | 'binary'
type Theme = 'mocha' | 'latte'
type MonoFont = 'adwaita' | 'ibm' | 'jetbrains' | 'source'
type PomodoroPhase = 'focus' | 'break'
type Ringtone =
  | 'chime'
  | 'bell'
  | 'alarm'
  | 'long-alarm'
  | 'soft'
  | 'retro'
  | 'sonar'
  | 'pulse'
  | 'digital'
type Background =
  | 'space'
  | '1363709'
  | '1371030'
  | '1411491'
  | 'wallhaven-6lpdjl'
  | 'wallhaven-6lpmmw'
  | 'wallhaven-lyj3vr'
  | 'wallhaven-mlgzzy'
  | 'wallhaven-og61yl'
  | 'wallhaven-ogyeol'
  | 'wallhaven-xedleo'
  | 'wallhaven-yqg6r7'

const ZONES = [
  { label: 'Addis Ababa', value: 'Africa/Addis_Ababa' },
  { label: 'Cairo', value: 'Africa/Cairo' },
  { label: 'Johannesburg', value: 'Africa/Johannesburg' },
  { label: 'Lagos', value: 'Africa/Lagos' },
  { label: 'Casablanca', value: 'Africa/Casablanca' },
  { label: 'UTC', value: 'UTC' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Berlin', value: 'Europe/Berlin' },
  { label: 'Moscow', value: 'Europe/Moscow' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'Mumbai', value: 'Asia/Kolkata' },
  { label: 'Dhaka', value: 'Asia/Dhaka' },
  { label: 'Bangkok', value: 'Asia/Bangkok' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Seoul', value: 'Asia/Seoul' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'Auckland', value: 'Pacific/Auckland' },
  { label: 'New York', value: 'America/New_York' },
  { label: 'Chicago', value: 'America/Chicago' },
  { label: 'Denver', value: 'America/Denver' },
  { label: 'Los Angeles', value: 'America/Los_Angeles' },
  { label: 'Mexico City', value: 'America/Mexico_City' },
  { label: 'Sao Paulo', value: 'America/Sao_Paulo' },
  { label: 'Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
] as const

const BACKGROUNDS: Array<{ label: string; value: Background; image: string }> = [
  { label: 'Space', value: 'space', image: '/bgs/space-astronaut.jpg' },
  { label: '1363709', value: '1363709', image: '/bgs/1363709.png' },
  { label: '1371030', value: '1371030', image: '/bgs/1371030.png' },
  { label: '1411491', value: '1411491', image: '/bgs/1411491.png' },
  { label: 'wallhaven-6lpdjl', value: 'wallhaven-6lpdjl', image: '/bgs/wallhaven-6lpdjl.jpg' },
  { label: 'wallhaven-6lpmmw', value: 'wallhaven-6lpmmw', image: '/bgs/wallhaven-6lpmmw.jpg' },
  { label: 'wallhaven-lyj3vr', value: 'wallhaven-lyj3vr', image: '/bgs/wallhaven-lyj3vr.png' },
  { label: 'wallhaven-mlgzzy', value: 'wallhaven-mlgzzy', image: '/bgs/wallhaven-mlgzzy.png' },
  { label: 'wallhaven-og61yl', value: 'wallhaven-og61yl', image: '/bgs/wallhaven-og61yl.png' },
  { label: 'wallhaven-ogyeol', value: 'wallhaven-ogyeol', image: '/bgs/wallhaven-ogyeol.jpg' },
  { label: 'wallhaven-xedleo', value: 'wallhaven-xedleo', image: '/bgs/wallhaven-xedleo.jpg' },
  { label: 'wallhaven-yqg6r7', value: 'wallhaven-yqg6r7', image: '/bgs/wallhaven-yqg6r7.jpg' },
]

const MONO_FONTS: Array<{ label: string; value: MonoFont; sample: string }> = [
  { label: 'Adwaita Mono', value: 'adwaita', sample: '00:00:00' },
  { label: 'IBM Plex Mono', value: 'ibm', sample: '00:00:00' },
  { label: 'JetBrains Mono', value: 'jetbrains', sample: '00:00:00' },
  { label: 'Source Code Pro', value: 'source', sample: '00:00:00' },
]

const RINGTONES: Array<{ label: string; value: Ringtone }> = [
  { label: 'Chime', value: 'chime' },
  { label: 'Bell', value: 'bell' },
  { label: 'Alarm', value: 'alarm' },
  { label: 'Long alarm', value: 'long-alarm' },
  { label: 'Soft', value: 'soft' },
  { label: 'Retro', value: 'retro' },
  { label: 'Sonar', value: 'sonar' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Digital', value: 'digital' },
]

const normalizeToken = (value: string) => value.trim().toLowerCase()

const findByLabelOrValue = <T extends { label: string; value: string }>(items: readonly T[], raw: string) => {
  const normalized = normalizeToken(raw)
  return items.find((item) => normalizeToken(item.value) === normalized || normalizeToken(item.label) === normalized)
}

const clockFormatter = (date: Date, timeZone: string, showSeconds: boolean, use24h: boolean) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: !use24h,
  }).format(date)

const dateFormatter = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatDuration = (seconds: number, showHours = false) => {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60

  if (showHours || hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`
  }

  return `${minutes}:${pad2(secs)}`
}

const toBinaryRows = (digits: number[]) =>
  [8, 4, 2, 1].map((bit) =>
    digits.map((digit) => (digit & bit ? '●' : '○')).join(' '),
  )

const toSeconds = (hours: string, minutes: string, seconds: string) => {
  const h = Number.parseInt(hours, 10)
  const m = Number.parseInt(minutes, 10)
  const s = Number.parseInt(seconds, 10)

  const safeHours = Number.isFinite(h) && h >= 0 ? h : 0
  const safeMinutes = Number.isFinite(m) && m >= 0 ? m : 0
  const safeSeconds = Number.isFinite(s) && s >= 0 ? s : 0

  return safeHours * 3600 + safeMinutes * 60 + safeSeconds
}

const getAudioContextClass = () =>
  window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

const playTone = (
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) => {
  const gain = context.createGain()
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(context.destination)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.03)
}

type ToneStep = {
  frequency: number
  at: number
  duration: number
  volume: number
  type?: OscillatorType
  spread?: number
}

const jitter = (value: number, spread = 0.02) => {
  const amount = 1 + (Math.random() * 2 - 1) * spread
  return value * amount
}

const playToneStep = (context: AudioContext, start: number, step: ToneStep) => {
  playTone(
    context,
    jitter(step.frequency, step.spread ?? 0.02),
    start + step.at,
    step.duration,
    jitter(step.volume, 0.08),
    step.type ?? 'sine',
  )
}

const RINGTONE_PATTERNS: Record<Ringtone, ToneStep[]> = {
  chime: [
    { at: 0, frequency: 784, duration: 0.28, volume: 0.18 },
    { at: 0.28, frequency: 1046.5, duration: 0.32, volume: 0.16 },
    { at: 0.64, frequency: 1567.98, duration: 0.3, volume: 0.14 },
    { at: 1.02, frequency: 1046.5, duration: 0.34, volume: 0.15 },
    { at: 1.46, frequency: 784, duration: 0.38, volume: 0.17 },
    { at: 1.98, frequency: 1046.5, duration: 0.38, volume: 0.14 },
    { at: 2.5, frequency: 1567.98, duration: 0.4, volume: 0.12 },
  ],
  bell: [
    { at: 0, frequency: 659.25, duration: 0.38, volume: 0.18 },
    { at: 0.34, frequency: 987.77, duration: 0.42, volume: 0.16 },
    { at: 0.78, frequency: 1318.51, duration: 0.46, volume: 0.15 },
    { at: 1.26, frequency: 987.77, duration: 0.48, volume: 0.16 },
    { at: 1.8, frequency: 659.25, duration: 0.52, volume: 0.18 },
    { at: 2.38, frequency: 987.77, duration: 0.48, volume: 0.15 },
    { at: 2.92, frequency: 659.25, duration: 0.52, volume: 0.14 },
  ],
  alarm: [
    { at: 0, frequency: 880, duration: 0.2, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 0.26, frequency: 880, duration: 0.2, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 0.52, frequency: 880, duration: 0.22, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 0.84, frequency: 880, duration: 0.22, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 1.16, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 1.5, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 1.84, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 2.22, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 2.62, frequency: 880, duration: 0.26, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 3.02, frequency: 880, duration: 0.26, volume: 0.22, type: 'square', spread: 0.01 },
  ],
  'long-alarm': [
    { at: 0, frequency: 880, duration: 0.2, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 0.26, frequency: 784, duration: 0.22, volume: 0.2, type: 'square', spread: 0.01 },
    { at: 0.54, frequency: 880, duration: 0.22, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 0.84, frequency: 784, duration: 0.24, volume: 0.2, type: 'square', spread: 0.01 },
    { at: 1.16, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 1.5, frequency: 659.25, duration: 0.28, volume: 0.18, type: 'square', spread: 0.01 },
    { at: 1.86, frequency: 880, duration: 0.24, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 2.2, frequency: 784, duration: 0.26, volume: 0.2, type: 'square', spread: 0.01 },
    { at: 2.56, frequency: 880, duration: 0.26, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 2.94, frequency: 659.25, duration: 0.3, volume: 0.18, type: 'square', spread: 0.01 },
    { at: 3.36, frequency: 880, duration: 0.26, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 3.74, frequency: 784, duration: 0.28, volume: 0.2, type: 'square', spread: 0.01 },
    { at: 4.14, frequency: 880, duration: 0.28, volume: 0.22, type: 'square', spread: 0.01 },
    { at: 4.58, frequency: 659.25, duration: 0.34, volume: 0.18, type: 'square', spread: 0.01 },
  ],
  soft: [
    { at: 0, frequency: 523.25, duration: 0.28, volume: 0.12 },
    { at: 0.32, frequency: 659.25, duration: 0.3, volume: 0.11 },
    { at: 0.7, frequency: 783.99, duration: 0.32, volume: 0.1 },
    { at: 1.14, frequency: 659.25, duration: 0.34, volume: 0.11 },
    { at: 1.64, frequency: 523.25, duration: 0.36, volume: 0.12 },
    { at: 2.14, frequency: 659.25, duration: 0.38, volume: 0.1 },
    { at: 2.68, frequency: 523.25, duration: 0.42, volume: 0.09 },
  ],
  retro: [
    { at: 0, frequency: 440, duration: 0.16, volume: 0.18, type: 'square', spread: 0.02 },
    { at: 0.2, frequency: 554.37, duration: 0.16, volume: 0.16, type: 'square', spread: 0.02 },
    { at: 0.42, frequency: 659.25, duration: 0.18, volume: 0.14, type: 'square', spread: 0.02 },
    { at: 0.68, frequency: 880, duration: 0.2, volume: 0.12, type: 'square', spread: 0.02 },
    { at: 0.96, frequency: 659.25, duration: 0.18, volume: 0.14, type: 'square', spread: 0.02 },
    { at: 1.22, frequency: 554.37, duration: 0.16, volume: 0.16, type: 'square', spread: 0.02 },
    { at: 1.46, frequency: 440, duration: 0.18, volume: 0.18, type: 'square', spread: 0.02 },
    { at: 1.76, frequency: 659.25, duration: 0.18, volume: 0.14, type: 'square', spread: 0.02 },
    { at: 2.06, frequency: 880, duration: 0.22, volume: 0.12, type: 'square', spread: 0.02 },
    { at: 2.38, frequency: 659.25, duration: 0.24, volume: 0.14, type: 'square', spread: 0.02 },
  ],
  sonar: [
    { at: 0, frequency: 220, duration: 0.18, volume: 0.16 },
    { at: 0.34, frequency: 330, duration: 0.22, volume: 0.14 },
    { at: 0.72, frequency: 440, duration: 0.28, volume: 0.14 },
    { at: 1.12, frequency: 330, duration: 0.24, volume: 0.12 },
    { at: 1.5, frequency: 220, duration: 0.3, volume: 0.16 },
    { at: 1.94, frequency: 440, duration: 0.36, volume: 0.14 },
    { at: 2.42, frequency: 330, duration: 0.34, volume: 0.12 },
  ],
  pulse: [
    { at: 0, frequency: 740, duration: 0.12, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 0.18, frequency: 740, duration: 0.12, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 0.36, frequency: 740, duration: 0.12, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 0.58, frequency: 740, duration: 0.14, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 0.8, frequency: 740, duration: 0.14, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 1.04, frequency: 740, duration: 0.14, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 1.28, frequency: 740, duration: 0.16, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 1.56, frequency: 740, duration: 0.16, volume: 0.22, type: 'triangle', spread: 0.015 },
    { at: 1.84, frequency: 740, duration: 0.18, volume: 0.22, type: 'triangle', spread: 0.015 },
  ],
  digital: [
    { at: 0, frequency: 988, duration: 0.12, volume: 0.16, type: 'square', spread: 0.015 },
    { at: 0.14, frequency: 1318.51, duration: 0.12, volume: 0.14, type: 'square', spread: 0.015 },
    { at: 0.28, frequency: 1567.98, duration: 0.12, volume: 0.12, type: 'square', spread: 0.015 },
    { at: 0.46, frequency: 1318.51, duration: 0.12, volume: 0.14, type: 'square', spread: 0.015 },
    { at: 0.64, frequency: 988, duration: 0.14, volume: 0.16, type: 'square', spread: 0.015 },
    { at: 0.84, frequency: 1318.51, duration: 0.12, volume: 0.14, type: 'square', spread: 0.015 },
    { at: 1.04, frequency: 1567.98, duration: 0.14, volume: 0.12, type: 'square', spread: 0.015 },
    { at: 1.28, frequency: 1318.51, duration: 0.14, volume: 0.14, type: 'square', spread: 0.015 },
    { at: 1.54, frequency: 988, duration: 0.16, volume: 0.16, type: 'square', spread: 0.015 },
  ],
}

const playRingtone = async (ringtone: Ringtone) => {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return

  const context = new AudioContextClass()
  if (context.state === 'suspended') {
    await context.resume().catch(() => {})
  }

  const start = context.currentTime + 0.02
  const pattern = RINGTONE_PATTERNS[ringtone]
  const closeDelay = Math.max(5000, Math.ceil((Math.max(...pattern.map((step) => step.at + step.duration)) + 1.1) * 1000))

  pattern.forEach((step) => playToneStep(context, start, step))

  window.setTimeout(() => {
    context.close().catch(() => {})
  }, closeDelay)
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState<Mode>(() => {
    const saved = window.localStorage.getItem('clock-mode')
    return saved === 'clock' || saved === 'pomodoro' || saved === 'timer' || saved === 'stopwatch' ? saved : 'clock'
  })
  const [view, setView] = useState<View>(() => {
    const saved = window.localStorage.getItem('clock-view')
    return saved === 'digital' || saved === 'binary' ? saved : 'digital'
  })
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('clock-theme')
    if (saved === 'latte' || saved === 'mocha') return saved
    if (saved === 'day') return 'latte'
    if (saved === 'night') return 'mocha'
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'latte'
      : 'mocha'
  })
  const [monoFont, setMonoFont] = useState<MonoFont>(() => {
    const saved = window.localStorage.getItem('clock-mono-font')
    return MONO_FONTS.some((item) => item.value === saved) ? (saved as MonoFont) : 'adwaita'
  })
  const [controlsOpen, setControlsOpen] = useState(false)
  const [background, setBackground] = useState<Background>(() => {
    const saved = window.localStorage.getItem('clock-background')
    return BACKGROUNDS.some((item) => item.value === saved) ? (saved as Background) : 'space'
  })
  const [timeZone, setTimeZone] = useState<(typeof ZONES)[number]['value']>(() => {
    const saved = window.localStorage.getItem('clock-timezone')
    return ZONES.some((zone) => zone.value === saved) ? (saved as (typeof ZONES)[number]['value']) : 'Africa/Addis_Ababa'
  })
  const [showSeconds, setShowSeconds] = useState(() => window.localStorage.getItem('clock-show-seconds') !== 'false')
  const [use24h, setUse24h] = useState(() => window.localStorage.getItem('clock-use-24h') !== 'false')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return window.localStorage.getItem('clock-notifications') === 'true'
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = window.localStorage.getItem('clock-sound')
    return saved === null ? true : saved === 'true'
  })
  const [ringtone, setRingtone] = useState<Ringtone>(() => {
    const saved = window.localStorage.getItem('clock-ringtone')
    return RINGTONES.some((item) => item.value === saved) ? (saved as Ringtone) : 'chime'
  })

  const [timerHoursInput, setTimerHoursInput] = useState(() => window.localStorage.getItem('clock-timer-hours') ?? '00')
  const [timerMinutesInput, setTimerMinutesInput] = useState(() => window.localStorage.getItem('clock-timer-minutes') ?? '15')
  const [timerSecondsInput, setTimerSecondsInput] = useState(() => window.localStorage.getItem('clock-timer-seconds') ?? '00')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerRemaining, setTimerRemaining] = useState(15 * 60)
  const [timerBase, setTimerBase] = useState(15 * 60)

  const [pomodoroFocusInput, setPomodoroFocusInput] = useState(() => window.localStorage.getItem('clock-pomodoro-focus') ?? '25')
  const [pomodoroBreakInput, setPomodoroBreakInput] = useState(() => window.localStorage.getItem('clock-pomodoro-break') ?? '5')
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus')
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [pomodoroRemaining, setPomodoroRemaining] = useState(25 * 60)
  const [pomodoroBase, setPomodoroBase] = useState(25 * 60)
  const [pomodoroRounds, setPomodoroRounds] = useState(0)

  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteValue, setPaletteValue] = useState('')
  const statusTimeoutRef = useRef<number | null>(null)
  const paletteInputRef = useRef<HTMLInputElement | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const isTypingField = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return (
      target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    )
  }

  const flashStatus = (message: string) => {
    setStatusMessage(message)
    if (statusTimeoutRef.current !== null) {
      window.clearTimeout(statusTimeoutRef.current)
    }
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage('')
      statusTimeoutRef.current = null
    }, 1800)
  }

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('clock-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('clock-mode', mode)
  }, [mode])

  useEffect(() => {
    window.localStorage.setItem('clock-view', view)
  }, [view])

  useEffect(() => {
    window.localStorage.setItem('clock-mono-font', monoFont)
    document.documentElement.dataset.monoFont = monoFont
  }, [monoFont])

  useEffect(() => {
    window.localStorage.setItem('clock-background', background)
  }, [background])

  useEffect(() => {
    window.localStorage.setItem('clock-timezone', timeZone)
  }, [timeZone])

  useEffect(() => {
    window.localStorage.setItem('clock-show-seconds', String(showSeconds))
  }, [showSeconds])

  useEffect(() => {
    window.localStorage.setItem('clock-use-24h', String(use24h))
  }, [use24h])

  useEffect(() => {
    window.localStorage.setItem('clock-notifications', String(notificationsEnabled))
  }, [notificationsEnabled])

  useEffect(() => {
    window.localStorage.setItem('clock-sound', String(soundEnabled))
  }, [soundEnabled])

  useEffect(() => {
    window.localStorage.setItem('clock-ringtone', ringtone)
  }, [ringtone])

  useEffect(() => {
    window.localStorage.setItem('clock-timer-hours', timerHoursInput)
  }, [timerHoursInput])

  useEffect(() => {
    window.localStorage.setItem('clock-timer-minutes', timerMinutesInput)
  }, [timerMinutesInput])

  useEffect(() => {
    window.localStorage.setItem('clock-timer-seconds', timerSecondsInput)
  }, [timerSecondsInput])

  useEffect(() => {
    window.localStorage.setItem('clock-pomodoro-focus', pomodoroFocusInput)
  }, [pomodoroFocusInput])

  useEffect(() => {
    window.localStorage.setItem('clock-pomodoro-break', pomodoroBreakInput)
  }, [pomodoroBreakInput])

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        window.clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!paletteOpen) return
    window.setTimeout(() => {
      paletteInputRef.current?.focus()
      paletteInputRef.current?.select()
    }, 0)
  }, [paletteOpen])

  const startTimer = useCallback(() => {
    const total = toSeconds(timerHoursInput, timerMinutesInput, timerSecondsInput)
    const safeTotal = total > 0 ? total : 60
    setTimerBase(safeTotal)
    setTimerRemaining(safeTotal)
    setTimerRunning(true)
    setMode('timer')
    workerRef.current?.postMessage({ type: 'start', mode: 'timer', payload: { remaining: safeTotal } })
  }, [timerHoursInput, timerMinutesInput, timerSecondsInput])

  const toggleTimer = useCallback(() => {
    setMode('timer')
    if (timerRunning) {
      setTimerRunning(false)
      flashStatus('paused')
      workerRef.current?.postMessage({ type: 'stop', mode: 'timer' })
      return
    }

    if (timerRemaining <= 0) {
      startTimer()
      flashStatus('resumed')
      return
    }

    setTimerRunning(true)
    flashStatus('resumed')
    workerRef.current?.postMessage({ type: 'start', mode: 'timer', payload: { remaining: timerRemaining } })
  }, [timerRunning, timerRemaining, startTimer])
  
  const startPomodoro = useCallback(() => {
    const minutes = Number.parseInt(pomodoroFocusInput, 10)
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 25
    const total = safeMinutes * 60
    setPomodoroPhase('focus')
    setPomodoroBase(total)
    setPomodoroRemaining(total)
    setPomodoroRunning(true)
    setMode('pomodoro')
    workerRef.current?.postMessage({
      type: 'start',
      mode: 'pomodoro',
      payload: {
        focus: total,
        break: Number.parseInt(pomodoroBreakInput, 10) * 60,
        phase: 'focus',
      },
    })
  }, [pomodoroFocusInput, pomodoroBreakInput])

  const togglePomodoro = useCallback(() => {
    setMode('pomodoro')
    if (pomodoroRunning) {
      setPomodoroRunning(false)
      flashStatus('paused')
      workerRef.current?.postMessage({ type: 'stop', mode: 'pomodoro' })
      return
    }

    if (pomodoroRemaining <= 0) {
      startPomodoro()
      flashStatus('resumed')
      return
    }

    setPomodoroRunning(true)
    flashStatus('resumed')
    workerRef.current?.postMessage({
        type: 'start',
        mode: 'pomodoro',
        payload: {
            focus: Number.parseInt(pomodoroFocusInput, 10) * 60,
            break: Number.parseInt(pomodoroBreakInput, 10) * 60,
            phase: pomodoroPhase,
        },
    })
  }, [pomodoroRunning, pomodoroRemaining, startPomodoro, pomodoroFocusInput, pomodoroBreakInput, pomodoroPhase])

  const toggleStopwatch = useCallback(() => {
    setMode('stopwatch')
    setStopwatchRunning((value) => {
      const next = !value
      if (next) {
        workerRef.current?.postMessage({ type: 'start', mode: 'stopwatch' })
      } else {
        workerRef.current?.postMessage({ type: 'stop', mode: 'stopwatch' })
      }
      flashStatus(next ? 'resumed' : 'paused')
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTypingField(event.target) && !paletteOpen && (event.key === ':' || (event.code === 'Semicolon' && event.shiftKey))) {
        event.preventDefault()
        setPaletteValue('')
        setPaletteOpen(true)
        return
      }

      if (!isTypingField(event.target) && !paletteOpen && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setControlsOpen((value) => !value)
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
        return
      }

      if (event.key === 'Escape' && paletteOpen) {
        event.preventDefault()
        setPaletteOpen(false)
        setPaletteValue('')
        return
      }

      if (event.code !== 'Space' || isTypingField(event.target)) {
        return
      }

      if (mode === 'timer') {
        event.preventDefault()
        toggleTimer()
        return
      }

      if (mode === 'pomodoro') {
        event.preventDefault()
        togglePomodoro()
        return
      }

      if (mode === 'stopwatch') {
        event.preventDefault()
        toggleStopwatch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, paletteOpen, toggleTimer, togglePomodoro, toggleStopwatch])

  const finishTimer = useCallback(() => {
    setTimerRunning(false)
    setTimerRemaining(0)

    if (soundEnabled) {
      void playRingtone(ringtone)
    }

    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer finished', {
        body: 'Your countdown reached zero.',
      })
    }
  }, [soundEnabled, ringtone, notificationsEnabled])

  const finishPomodoroPhase = useCallback(async (nextPhase: 'focus' | 'break') => {
    const nextMinutes =
      nextPhase === 'break'
        ? Number.parseInt(pomodoroBreakInput, 10)
        : Number.parseInt(pomodoroFocusInput, 10)
    const safeMinutes = Number.isFinite(nextMinutes) && nextMinutes > 0 ? nextMinutes : nextPhase === 'focus' ? 25 : 5
    const total = safeMinutes * 60

    setPomodoroPhase(nextPhase)
    setPomodoroBase(total)
    setPomodoroRemaining(total)
    if (nextPhase === 'focus') {
      setPomodoroRounds((value) => value + 1)
    }

    if (soundEnabled) {
      await playRingtone(ringtone)
    }

    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(nextPhase === 'break' ? 'Pomodoro break' : 'Pomodoro focus', {
        body: nextPhase === 'break' ? 'Time for a break.' : 'Back to focus.',
      })
    }
    
    if (pomodoroRunning) {
        workerRef.current?.postMessage({
            type: 'start',
            mode: 'pomodoro',
            payload: {
                focus: Number.parseInt(pomodoroFocusInput, 10) * 60,
                break: Number.parseInt(pomodoroBreakInput, 10) * 60,
                phase: nextPhase,
            },
        })
    }
  }, [pomodoroBreakInput, pomodoroFocusInput, soundEnabled, ringtone, notificationsEnabled, pomodoroRunning])

  useEffect(() => {
    workerRef.current = new Worker()

    workerRef.current.onmessage = (
      event: MessageEvent<{ type: string; mode: string; value: number; nextPhase?: 'focus' | 'break' }>,
    ) => {
      const { type, mode, value, nextPhase } = event.data
      if (type === 'tick') {
        if (mode === 'timer') {
          setTimerRemaining(value)
        } else if (mode === 'pomodoro') {
          setPomodoroRemaining(value)
        } else if (mode === 'stopwatch') {
          setStopwatchElapsed(value)
        }
      } else if (type === 'finish') {
        if (mode === 'timer') {
          finishTimer()
        } else if (mode === 'pomodoro' && nextPhase) {
          finishPomodoroPhase(nextPhase)
        }
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [finishPomodoroPhase, finishTimer])



  const displayValue = useMemo(() => {
    if (mode === 'clock') {
      return clockFormatter(now, timeZone, showSeconds, use24h)
    }

    if (mode === 'pomodoro') {
      return formatDuration(pomodoroRemaining, true)
    }

    if (mode === 'timer') {
      return formatDuration(timerRemaining, true)
    }

    return formatDuration(stopwatchElapsed, true)
  }, [mode, now, showSeconds, stopwatchElapsed, timerRemaining, timeZone, use24h])

  const detailValue = useMemo(() => {
    if (mode === 'clock') {
      return dateFormatter(now, timeZone)
    }

    if (mode === 'pomodoro') {
      return `${pomodoroPhase === 'focus' ? 'focus' : 'break'} • round ${pomodoroRounds + 1}`
    }

    if (mode === 'timer') {
      return timerRunning ? 'counting down' : 'ready'
    }

    return stopwatchRunning ? 'recording' : 'idle'
  }, [mode, now, timeZone, pomodoroPhase, pomodoroRounds, timerRunning, stopwatchRunning])

  const binaryDigits = useMemo(() => {
    const source =
      mode === 'clock'
        ? clockFormatter(now, timeZone, true, true).replace(/[^0-9]/g, '').slice(0, 6)
        : formatDuration(
            mode === 'pomodoro'
              ? pomodoroRemaining
              : mode === 'timer'
                ? timerRemaining
                : stopwatchElapsed,
            true,
          ).replace(/[^0-9]/g, '').padStart(6, '0').slice(-6)

    return source.split('').map((digit) => Number.parseInt(digit, 10))
  }, [mode, now, timeZone, pomodoroRemaining, timerRemaining, stopwatchElapsed])

  const binaryRows = useMemo(() => toBinaryRows(binaryDigits), [binaryDigits])

  const timerProgress = useMemo(() => {
    if (timerBase <= 0) return 0
    return ((timerBase - timerRemaining) / timerBase) * 100
  }, [timerBase, timerRemaining])

  const pomodoroProgress = useMemo(() => {
    if (pomodoroBase <= 0) return 0
    return ((pomodoroBase - pomodoroRemaining) / pomodoroBase) * 100
  }, [pomodoroBase, pomodoroRemaining])
  
  const resetTimer = () => {
    const total = toSeconds(timerHoursInput, timerMinutesInput, timerSecondsInput)
    const safeTotal = total > 0 ? total : 60
    setTimerBase(safeTotal)
    setTimerRemaining(safeTotal)
    setTimerRunning(false)
    workerRef.current?.postMessage({ type: 'reset', mode: 'timer', payload: { base: safeTotal } })
  }

  const resetPomodoro = () => {
    const minutes = Number.parseInt(pomodoroFocusInput, 10)
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 25
    const total = safeMinutes * 60
    setPomodoroPhase('focus')
    setPomodoroBase(total)
    setPomodoroRemaining(total)
    setPomodoroRunning(false)
    setPomodoroRounds(0)
    workerRef.current?.postMessage({ type: 'reset', mode: 'pomodoro', payload: { base: total } })
  }

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      return
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      return
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true)
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
      }
    }
  }
  
  const resetStopwatch = () => {
    setStopwatchRunning(false)
    setStopwatchElapsed(0)
    workerRef.current?.postMessage({ type: 'reset', mode: 'stopwatch' })
  }

  const previewRingtone = (value: Ringtone) => {
    void playRingtone(value)
  }

  const runPaletteCommand = (rawValue: string) => {
    const text = normalizeToken(rawValue)
    if (!text) return

    const [command, ...args] = text.split(/\s+/)
    const rest = args.join(' ')

    if (command === 'clock') {
      setMode('clock')
      return
    }

    if (command === 'timer') {
      const total = (() => {
        if (rest.includes(':')) {
          const parts = rest.split(':').map((piece) => Number.parseInt(piece, 10))
          if (parts.some((part) => !Number.isFinite(part))) return NaN
          if (parts.length === 3) return toSeconds(String(parts[0]), String(parts[1]), String(parts[2]))
          if (parts.length === 2) return toSeconds('0', String(parts[0]), String(parts[1]))
          return NaN
        }

        return Number.parseInt(rest, 10) * 60
      })()
      const safeTotal = Number.isFinite(total) && total > 0 ? total : 25 * 60
      setTimerHoursInput(String(Math.floor(safeTotal / 3600)).padStart(2, '0'))
      setTimerMinutesInput(String(Math.floor((safeTotal % 3600) / 60)).padStart(2, '0'))
      setTimerSecondsInput(String(safeTotal % 60).padStart(2, '0'))
      setTimerBase(safeTotal)
      setTimerRemaining(safeTotal)
      setTimerRunning(true)
      setMode('timer')
      workerRef.current?.postMessage({ type: 'start', mode: 'timer', payload: { remaining: safeTotal } })
      flashStatus('resumed')
      return
    }

    if (command === 'pomodoro') {
      const focus = Number.parseInt(args[0] ?? pomodoroFocusInput, 10)
      const breakMinutes = Number.parseInt(args[1] ?? pomodoroBreakInput, 10)
      const safeFocus = Number.isFinite(focus) && focus > 0 ? focus : 25
      const safeBreak = Number.isFinite(breakMinutes) && breakMinutes > 0 ? breakMinutes : 5
      const total = safeFocus * 60
      setPomodoroFocusInput(String(safeFocus))
      setPomodoroBreakInput(String(safeBreak))
      setPomodoroPhase('focus')
      setPomodoroBase(total)
      setPomodoroRemaining(total)
      setPomodoroRunning(true)
      setPomodoroRounds(0)
      setMode('pomodoro')
      workerRef.current?.postMessage({
        type: 'start',
        mode: 'pomodoro',
        payload: {
          focus: total,
          break: safeBreak * 60,
          phase: 'focus',
        },
      })
      flashStatus('resumed')
      return
    }

    if (command === 'stopwatch') {
      setMode('stopwatch')
      setStopwatchElapsed(0)
      setStopwatchRunning(true)
      workerRef.current?.postMessage({ type: 'reset', mode: 'stopwatch' })
      workerRef.current?.postMessage({ type: 'start', mode: 'stopwatch' })
      flashStatus('resumed')
      return
    }

    if (command === 'theme') {
      if (rest === 'latte' || rest === 'mocha') setTheme(rest)
      return
    }

    if (command === 'view') {
      if (rest === 'digital' || rest === 'binary') setView(rest)
      return
    }

    if (command === 'sound') {
      if (rest === 'on') setSoundEnabled(true)
      if (rest === 'off') setSoundEnabled(false)
      return
    }

    if (command === 'notif' || command === 'notifications') {
      if (rest === 'on') setNotificationsEnabled(true)
      if (rest === 'off') setNotificationsEnabled(false)
      return
    }

    if (command === 'bg' || command === 'background') {
      const picked = findByLabelOrValue(BACKGROUNDS, rest)
      if (picked) setBackground(picked.value)
      return
    }

    if (command === 'font') {
      const picked = findByLabelOrValue(MONO_FONTS, rest)
      if (picked) setMonoFont(picked.value)
      return
    }

    if (command === 'zone' || command === 'timezone') {
      const picked = findByLabelOrValue(ZONES, rest)
      if (picked) setTimeZone(picked.value)
      return
    }

    if (command === 'ringtone' || command === 'soundset') {
      const picked = findByLabelOrValue(RINGTONES, rest)
      if (picked) setRingtone(picked.value)
      return
    }
  }

  const submitPalette = () => {
    runPaletteCommand(paletteValue)
    setPaletteValue('')
    setPaletteOpen(false)
  }

  return (
    <main
      className={`terminal terminal--${theme} terminal--${background}`}
      style={{
        ['--bg-image' as string]: `url(${BACKGROUNDS.find((item) => item.value === background)?.image})`,
      }}
    >
      <div className="terminal__wallpaper" aria-hidden="true" />
      <section className={`display display--${view}`}>
        {view === 'digital' && (
          <div className="display__stack">
            <div className="display__value">{displayValue}</div>
            <div className="display__detail">{detailValue}</div>
            {statusMessage && <div className="display__status">{statusMessage}</div>}
            {(mode === 'timer' || mode === 'pomodoro' || mode === 'stopwatch') && (
              <div className="display__hint">
                press <kbd>space</kbd> to pause/resume
              </div>
            )}
          </div>
        )}

        {view === 'binary' && (
          <div className="binary">
            <div className="binary__labels">
              {['H', 'H', 'M', 'M', 'S', 'S'].map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <div className="binary__grid">
              {binaryRows.map((row, index) => (
                <div key={row} className="binary__row">
                  <span className="binary__bit">{['8', '4', '2', '1'][index]}</span>
                  <div className="binary__cells">
                    {row.split(' ').map((cell, cellIndex) => (
                      <span
                        key={`${cell}-${cellIndex}`}
                        className={`binary__cell ${cell === '●' ? 'binary__cell--on' : ''}`}
                      >
                        {cell}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <a
        className="developer-support"
        href="https://www.gurshaplus.com/mrmishaal"
        target="_blank"
        rel="noreferrer"
      >
        Support the Developer
      </a>

      {view === 'binary' && (
        <div className="display__note">
          {(mode === 'timer' || mode === 'pomodoro' || mode === 'stopwatch') && (
            <>
              {statusMessage && <div className="display__status">{statusMessage}</div>}
              <div className="display__hint">
                press <kbd>space</kbd> to pause/resume
              </div>
            </>
          )}
        </div>
      )}

      <button type="button" className="menu-fab" onClick={() => setControlsOpen((value) => !value)}>
        {controlsOpen ? 'hide' : 'menu'}
      </button>

      <section className={`commandbar ${controlsOpen ? 'commandbar--open' : ''}`}>
        <div className="commandbar__top">
          <span />
          <button type="button" className="menu-close" onClick={() => setControlsOpen(false)}>
            close
          </button>
        </div>

        <div className="toggles toggles--dense">
          <button type="button" onClick={() => setTheme(theme === 'mocha' ? 'latte' : 'mocha')}>
            theme {theme}
          </button>
          <button type="button" onClick={() => setShowSeconds((value) => !value)}>
            seconds {showSeconds ? 'on' : 'off'}
          </button>
          <button type="button" onClick={() => setUse24h((value) => !value)}>
            24h {use24h ? 'on' : 'off'}
          </button>
          <button type="button" onClick={toggleNotifications}>
            notif {notificationsEnabled ? 'on' : 'off'}
          </button>
          <button type="button" onClick={() => setSoundEnabled((value) => !value)}>
            sound {soundEnabled ? 'on' : 'off'}
          </button>
        </div>

        <div className="section-label">Font</div>
        <label className="field">
          <span>mono font</span>
          <select value={monoFont} onChange={(event) => setMonoFont(event.target.value as MonoFont)}>
            {MONO_FONTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <small className="field-note">
            Preview: {MONO_FONTS.find((item) => item.value === monoFont)?.sample}
          </small>
        </label>

        <div className="section-label">Modes</div>
        <div className="segment">
          {(['clock', 'pomodoro', 'timer', 'stopwatch'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={mode === item ? 'active' : ''}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {mode === 'pomodoro' && (
          <div className="mini-controls">
            <label className="field">
              <span>focus min</span>
              <input
                type="number"
                min="1"
                max="240"
                value={pomodoroFocusInput}
                onChange={(event) => setPomodoroFocusInput(event.target.value)}
              />
            </label>
            <label className="field">
              <span>break min</span>
              <input
                type="number"
                min="1"
                max="120"
                value={pomodoroBreakInput}
                onChange={(event) => setPomodoroBreakInput(event.target.value)}
              />
            </label>
            <div className="timer-actions">
              <button type="button" onClick={togglePomodoro}>
                {pomodoroRunning ? 'pause' : 'start'}
              </button>
              <button type="button" onClick={resetPomodoro}>
                reset
              </button>
              <span className="progress">{Math.round(pomodoroProgress)}%</span>
            </div>
          </div>
        )}

        {mode === 'timer' && (
          <div className="mini-controls">
            <div className="duration-grid">
              <label className="field">
                <span>hours</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={timerHoursInput}
                  onChange={(event) => setTimerHoursInput(event.target.value)}
                />
              </label>
              <label className="field">
                <span>minutes</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerMinutesInput}
                  onChange={(event) => setTimerMinutesInput(event.target.value)}
                />
              </label>
              <label className="field">
                <span>seconds</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerSecondsInput}
                  onChange={(event) => setTimerSecondsInput(event.target.value)}
                />
              </label>
            </div>
            <div className="timer-actions">
              <button type="button" onClick={toggleTimer}>
                {timerRunning ? 'pause' : 'start'}
              </button>
              <button type="button" onClick={resetTimer}>
                reset
              </button>
              <span className="progress">{Math.round(timerProgress)}%</span>
            </div>
          </div>
        )}

        {mode === 'stopwatch' && (
          <div className="mini-controls">
            <div className="timer-actions">
              <button type="button" onClick={toggleStopwatch}>
                {stopwatchRunning ? 'pause' : 'start'}
              </button>
              <button type="button" onClick={resetStopwatch}>
                reset
              </button>
            </div>
          </div>
        )}

        <div className="section-label">Views</div>
        <div className="segment">
          {(['digital', 'binary'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? 'active' : ''}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="field">
          <span>timezone</span>
          <select value={timeZone} onChange={(event) => setTimeZone(event.target.value as typeof timeZone)}>
            {ZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>

        <div className="section-label">Sound</div>
        <label className="field">
          <span>ringtone</span>
          <select value={ringtone} onChange={(event) => setRingtone(event.target.value as Ringtone)}>
            {RINGTONES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="field-actions">
            <button type="button" className="ringtone-preview" onClick={() => previewRingtone(ringtone)}>
              Preview sound
            </button>
          </div>
        </label>

        <div className="background-picker" aria-label="background presets">
          {BACKGROUNDS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`background-tile ${background === item.value ? 'active' : ''}`}
              onClick={() => setBackground(item.value)}
              aria-label={`Set background to ${item.label}`}
            >
              <img src={item.image} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {paletteOpen && (
        <div className="commandline" aria-label="Command mode">
          <label className="commandline__line">
            <span className="commandline__prompt">:</span>
            <input
              ref={paletteInputRef}
              className="commandline__input"
              value={paletteValue}
              onChange={(event) => setPaletteValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitPalette()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setPaletteOpen(false)
                  setPaletteValue('')
                }
              }}
              placeholder="timer 25, bg space, theme mocha, font ibm"
            />
          </label>
          <div className="commandline__help">
            enter to run · esc to close · press <kbd>:</kbd> to open
          </div>
        </div>
      )}
    </main>
  )
}

export default App
