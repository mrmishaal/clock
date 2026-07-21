import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Mode = 'clock' | 'timer' | 'stopwatch'
type View = 'digital' | 'binary'
type Theme = 'mocha' | 'latte'
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
  { label: 'UTC', value: 'UTC' },
  { label: 'New York', value: 'America/New_York' },
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
    return `${hours}:${pad2(minutes)}:${pad2(secs)}`
  }

  return `${minutes}:${pad2(secs)}`
}

const toBinaryRows = (digits: number[]) =>
  [8, 4, 2, 1].map((bit) =>
    digits.map((digit) => (digit & bit ? '●' : '○')).join(' '),
  )

function App() {
  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState<Mode>('clock')
  const [view, setView] = useState<View>('digital')
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('clock-theme')
    if (saved === 'latte' || saved === 'mocha') return saved
    if (saved === 'day') return 'latte'
    if (saved === 'night') return 'mocha'
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'latte'
      : 'mocha'
  })
  const [controlsOpen, setControlsOpen] = useState(false)
  const [background, setBackground] = useState<Background>(() => {
    const saved = window.localStorage.getItem('clock-background')
    return BACKGROUNDS.some((item) => item.value === saved) ? (saved as Background) : 'space'
  })
  const [timeZone, setTimeZone] = useState<(typeof ZONES)[number]['value']>('Africa/Addis_Ababa')
  const [showSeconds, setShowSeconds] = useState(true)
  const [use24h, setUse24h] = useState(true)

  const [timerInput, setTimerInput] = useState('15')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerRemaining, setTimerRemaining] = useState(15 * 60)
  const [timerBase, setTimerBase] = useState(15 * 60)

  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('clock-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('clock-background', background)
  }, [background])

  useEffect(() => {
    if (mode !== 'timer' || !timerRunning) return

    const interval = window.setInterval(() => {
      setTimerRemaining((value) => {
        if (value <= 1) {
          setTimerRunning(false)
          return 0
        }

        return value - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [mode, timerRunning])

  useEffect(() => {
    if (mode !== 'stopwatch' || !stopwatchRunning) return

    const interval = window.setInterval(() => {
      setStopwatchElapsed((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [mode, stopwatchRunning])

  const displayValue = useMemo(() => {
    if (mode === 'clock') {
      return clockFormatter(now, timeZone, showSeconds, use24h)
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

    if (mode === 'timer') {
      return timerRunning ? 'counting down' : 'ready'
    }

    return stopwatchRunning ? 'recording' : 'idle'
  }, [mode, now, stopwatchRunning, timerRunning, timeZone])

  const binaryDigits = useMemo(() => {
    const source =
      mode === 'clock'
        ? clockFormatter(now, timeZone, true, true).replace(/[^0-9]/g, '').slice(0, 6)
        : formatDuration(mode === 'timer' ? timerRemaining : stopwatchElapsed, true).replace(/[^0-9]/g, '').padStart(6, '0').slice(-6)

    return source.split('').map((digit) => Number.parseInt(digit, 10))
  }, [mode, now, stopwatchElapsed, timerRemaining, timeZone])

  const binaryRows = useMemo(() => toBinaryRows(binaryDigits), [binaryDigits])

  const timerProgress = useMemo(() => {
    if (timerBase <= 0) return 0
    return ((timerBase - timerRemaining) / timerBase) * 100
  }, [timerBase, timerRemaining])

  const startTimer = () => {
    const minutes = Number.parseInt(timerInput, 10)
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 1
    const total = safeMinutes * 60
    setTimerBase(total)
    setTimerRemaining(total)
    setTimerRunning(true)
    setMode('timer')
  }

  const resetTimer = () => {
    const minutes = Number.parseInt(timerInput, 10)
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 1
    const total = safeMinutes * 60
    setTimerBase(total)
    setTimerRemaining(total)
    setTimerRunning(false)
  }

  const startStopwatch = () => {
    setStopwatchRunning(true)
    setMode('stopwatch')
  }

  const resetStopwatch = () => {
    setStopwatchRunning(false)
    setStopwatchElapsed(0)
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
        </div>

        <div className="section-label">Modes</div>
        <div className="segment">
          {(['clock', 'timer', 'stopwatch'] as const).map((item) => (
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

        {mode === 'timer' && (
          <div className="mini-controls">
            <label className="field">
              <span>minutes</span>
              <input
                type="number"
                min="1"
                max="600"
                value={timerInput}
                onChange={(event) => setTimerInput(event.target.value)}
              />
            </label>
            <div className="timer-actions">
              <button type="button" onClick={timerRunning ? () => setTimerRunning(false) : startTimer}>
                {timerRunning ? 'pause' : 'start'}
              </button>
              <button type="button" onClick={resetTimer}>
                reset
              </button>
              <span className="progress">{Math.round(timerProgress)}%</span>
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

        {mode === 'stopwatch' && (
          <div className="mini-controls">
            <div className="timer-actions">
              <button type="button" onClick={stopwatchRunning ? () => setStopwatchRunning(false) : startStopwatch}>
                {stopwatchRunning ? 'pause' : 'start'}
              </button>
              <button type="button" onClick={resetStopwatch}>
                reset
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
