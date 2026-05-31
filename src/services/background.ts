import { NativeModules, Platform } from 'react-native';

const { TimerModule } = NativeModules;

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

  updateRemaining: async (seconds: number): Promise<boolean> => {
    if (Platform.OS !== 'android' || !TimerModule?.updateRemaining) return false;
    try { await TimerModule.updateRemaining(seconds); return true; }
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

  setCallbacks: () => {},
};
