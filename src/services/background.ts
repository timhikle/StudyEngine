import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { TimerModule } = NativeModules;
let emitter: NativeEventEmitter | null = null;
let tickCallback: ((seconds: number) => void) | null = null;
let completeCallback: (() => void) | null = null;
let listenerAttached = false;

function ensureEmitter() {
  if (!emitter && TimerModule && Platform.OS === 'android') {
    emitter = new NativeEventEmitter(TimerModule);
  }
}

function attachListeners() {
  if (listenerAttached || !emitter) return;
  listenerAttached = true;

  emitter.addListener('onTimerTick', (remainingSeconds: number) => {
    tickCallback?.(remainingSeconds);
  });

  emitter.addListener('onTimerComplete', () => {
    completeCallback?.();
  });
}

export const BackgroundService = {
  start: async (totalSeconds: number, timerType: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.startTimer) return false;
    try { await TimerModule.startTimer(totalSeconds, timerType); return true; }
    catch { return false; }
  },

  stop: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.stopTimer) return false;
    try { await TimerModule.stopTimer(); return true; }
    catch { return false; }
  },

  pause: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.pauseTimer) return false;
    try { await TimerModule.pauseTimer(); return true; }
    catch { return false; }
  },

  resume: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.resumeTimer) return false;
    try { await TimerModule.resumeTimer(); return true; }
    catch { return false; }
  },

  setRemaining: async (seconds: number, timerType?: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.setRemaining) return false;
    try { await TimerModule.setRemaining(seconds, timerType || ''); return true; }
    catch { return false; }
  },

  isRunning: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.isServiceRunning) return false;
    try { return await TimerModule.isServiceRunning(); }
    catch { return false; }
  },

  getState: async () => {
    if (Platform.OS !== 'android' || !TimerModule?.getServiceState) return null;
    try { return await TimerModule.getServiceState(); }
    catch { return null; }
  },

  stopRingtone: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.stopRingtone) return false;
    try { await TimerModule.stopRingtone(); return true; }
    catch { return false; }
  },

  setCallbacks: (tick: ((s: number) => void) | null, complete: (() => void) | null) => {
    tickCallback = tick;
    completeCallback = complete;
    ensureEmitter();
    attachListeners();
  },

  scheduleReminder: async (message: string, timestampMs: number): Promise<number | null> => {
    if (Platform.OS !== 'android' || !TimerModule?.scheduleReminder) return null;
    try { return await TimerModule.scheduleReminder(message, timestampMs); }
    catch { return null; }
  },
};
