type TimerMode = 'pomodoro' | 'timer' | 'stopwatch';

type WorkerCommand =
  | { type: 'start'; mode: TimerMode; payload?: any }
  | { type: 'stop'; mode: TimerMode }
  | { type: 'reset'; mode: TimerMode; payload?: any };

let timerId: number | undefined;
let timerRemaining = 0;

let pomodoroId: number | undefined;
let pomodoroRemaining = 0;
let pomodoroPhase: 'focus' | 'break' = 'focus';
let pomodoroFocusDuration = 25 * 60;
let pomodoroBreakDuration = 5 * 60;

let stopwatchId: number | undefined;
let stopwatchElapsed = 0;

const startTimer = (initialValue: number) => {
  timerRemaining = initialValue;
  timerId = self.setInterval(() => {
    timerRemaining -= 1;
    self.postMessage({ type: 'tick', mode: 'timer', value: timerRemaining });
    if (timerRemaining <= 0) {
      self.clearInterval(timerId as number);
      timerId = undefined;
      self.postMessage({ type: 'finish', mode: 'timer' });
    }
  }, 1000);
};

const startPomodoro = (focus: number, breakTime: number, phase: 'focus' | 'break') => {
    pomodoroFocusDuration = focus;
    pomodoroBreakDuration = breakTime;
    pomodoroPhase = phase;
    pomodoroRemaining = phase === 'focus' ? pomodoroFocusDuration : pomodoroBreakDuration;

    pomodoroId = self.setInterval(() => {
        pomodoroRemaining -= 1;
        self.postMessage({ type: 'tick', mode: 'pomodoro', value: pomodoroRemaining });
        if (pomodoroRemaining <= 0) {
            self.clearInterval(pomodoroId as number);
            pomodoroId = undefined;
            const nextPhase = pomodoroPhase === 'focus' ? 'break' : 'focus';
            self.postMessage({ type: 'finish', mode: 'pomodoro', nextPhase });
        }
    }, 1000);
};

const startStopwatch = () => {
  stopwatchId = self.setInterval(() => {
    stopwatchElapsed += 1;
    self.postMessage({ type: 'tick', mode: 'stopwatch', value: stopwatchElapsed });
  }, 1000);
};

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type, mode } = event.data;

  switch (mode) {
    case 'timer':
      switch (type) {
        case 'start':
          if (timerId) self.clearInterval(timerId);
          startTimer(event.data.payload.remaining);
          break;
        case 'stop':
          if (timerId) self.clearInterval(timerId);
          timerId = undefined;
          break;
        case 'reset':
          if (timerId) self.clearInterval(timerId);
          timerId = undefined;
          timerRemaining = event.data.payload.base;
          self.postMessage({ type: 'tick', mode: 'timer', value: timerRemaining });
          break;
      }
      break;
    case 'pomodoro':
      switch (type) {
        case 'start':
          if (pomodoroId) self.clearInterval(pomodoroId);
          startPomodoro(event.data.payload.focus, event.data.payload.break, event.data.payload.phase);
          break;
        case 'stop':
          if (pomodoroId) self.clearInterval(pomodoroId);
          pomodoroId = undefined;
          break;
        case 'reset':
          if (pomodoroId) self.clearInterval(pomodoroId);
          pomodoroId = undefined;
          pomodoroRemaining = event.data.payload.base;
          self.postMessage({ type: 'tick', mode: 'pomodoro', value: pomodoroRemaining });
          break;
      }
      break;
    case 'stopwatch':
      switch (type) {
        case 'start':
          if (stopwatchId) self.clearInterval(stopwatchId);
          startStopwatch();
          break;
        case 'stop':
          if (stopwatchId) self.clearInterval(stopwatchId);
          stopwatchId = undefined;
          break;
        case 'reset':
          if (stopwatchId) self.clearInterval(stopwatchId);
          stopwatchId = undefined;
          stopwatchElapsed = 0;
          self.postMessage({ type: 'tick', mode: 'stopwatch', value: 0 });
          break;
      }
      break;
  }
};
