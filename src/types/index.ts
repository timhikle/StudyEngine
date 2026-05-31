export type BlockType = 'phase' | 'big_break';
export type IntervalType = 'study' | 'short_break';
export type PhaseStatus = 'pending' | 'active' | 'completed';
export type TierBType = 'phase_end' | 'big_break_end' | null;
export type ActiveTimerType = 'phase_intervals' | 'big_break' | null;

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
}

export interface GeminiResponse {
  schedule: ParsedSchedule;
  raw: string;
}

export interface StudySession {
  phaseIndex: number;
  completedAt: string;
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
  tierBAlert: boolean;
  tierBType: TierBType;
  consoleInput: string;
  isConsoleLocked: boolean;
  isParsing: boolean;
  error: string | null;
  version: number;
  totalStudiedSeconds: number;
  sessionHistory: StudySession[];

  setConsoleInput: (input: string) => void;
  sendConsoleCommand: (input: string) => Promise<void>;
  tick: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  dismissAlert: () => void;
  updateSchedule: (phases: ScheduleBlock[]) => void;
  extendBreak: (phaseIndex: number, minutes: number) => void;
  delayPhase: (phaseIndex: number, minutes: number) => void;
  clearSchedule: () => void;
  addStudiedSeconds: (seconds: number) => void;
}
