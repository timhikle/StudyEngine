export type BlockType = 'phase' | 'big_break';
export type IntervalType = 'study' | 'short_break';
export type PhaseStatus = 'pending' | 'active' | 'completed';
export type TierBType = 'phase_end' | 'big_break_end' | null;
export type ActiveTimerType = 'phase_intervals' | 'big_break' | 'waiting' | null;

export interface ScheduleBlock {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: BlockType;
  status: PhaseStatus;
  phaseIndex: number;
}

export interface StudyInterval {
  type: IntervalType;
  duration: number;
  elapsed: number;
  status: PhaseStatus;
}

export interface ParsedSchedule {
  phases: ScheduleBlock[];
  originalInput: string;
  suggestion?: string;
}

export interface GeminiResponse {
  schedule: ParsedSchedule;
  raw: string;
}

export interface StudySession {
  phaseIndex: number;
  completedAt: string;
}

export interface Reminder {
  id: string;
  message: string;
  time: string; // ISO string of when it's scheduled
  createdAt: string;
}

export interface AppSettings {
  lang: 'en' | 'ar';           // UI language
  studyDuration: number;       // minutes per study interval
  shortBreakDuration: number;  // minutes per short break
  phaseDuration: number;       // minutes per phase
  bigBreakDuration: number;    // minutes per big break
  intervalsPerPhase: number;   // study intervals before big break
  soundEnabled: boolean;       // Tier A (interval transition) sound
  tierBEnabled: boolean;      // Tier B (phase/break end) sound
}

export interface AppState {
  schedule: ScheduleBlock[];
  currentPhaseIndex: number;
  currentIntervalIndex: number;
  intervals: StudyInterval[];
  timeRemaining: number;
  bigBreakTimeRemaining: number;
  isRunning: boolean;
  activeTimerType: ActiveTimerType;
  isWaitingToStart: boolean;
  waitingUntil: string | null;
  tierBAlert: boolean;
  tierBType: TierBType;
  consoleInput: string;
  suggestion: string | null;
  isConsoleLocked: boolean;
  isParsing: boolean;
  error: string | null;
  version: number;
  totalStudiedSeconds: number;
  dailyHistory: Record<string, number>;  // "YYYY-MM-DD" → seconds studied
  sessionHistory: StudySession[];
  pendingReminders: Reminder[];
  settings: AppSettings;
  isSessionComplete: boolean;
  sessionCompleteStats: { totalMinutes: number; phasesDone: number } | null;

  setConsoleInput: (input: string) => void;
  sendConsoleCommand: (input: string) => Promise<void>;
  handleIntervalComplete: () => void;
  onNativeTick: (remainingSeconds: number) => void;
  onNativeComplete: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  dismissAlert: () => void;
  updateSchedule: (phases: ScheduleBlock[]) => void;
  extendBreak: (phaseIndex: number, minutes: number) => void;
  delayPhase: (phaseIndex: number, minutes: number) => void;
  clearSchedule: () => void;
  skipWait: () => void;
  addStudiedSeconds: (seconds: number) => void;
  syncFromService: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  dismissSessionComplete: () => void;
  addReminder: (message: string, time: string) => Promise<void>;
  removeReminder: (id: string) => void;
}
