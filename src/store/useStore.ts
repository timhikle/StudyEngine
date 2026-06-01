import { create } from '../lib/zustand';
import { AppState, ScheduleBlock, StudyInterval, TierBType } from '../types';
import {
  generateScheduleBlocks,
  generateIntervals,
  slideSchedule,
  normalizeSchedule,
  getCurrentIntervalEndSeconds,
  STUDY_DURATION,
  SHORT_BREAK_DURATION,
  BIG_BREAK_DURATION,
  INTERVALS_PER_PHASE,
} from '../utils/schedule';
import { parseSchedule, processAdjustment } from '../services/groq';
import { playTierAAlert, playTierBAlert, stopTierBAlert } from '../services/audio';
import { BackgroundService } from '../services/background';

const DEBOUNCE_MS = 2000;

function getNextPhaseSchedule(
  schedule: ScheduleBlock[],
  currentPhaseIndex: number,
  intervals: StudyInterval[]
): { intervals: StudyInterval[]; phaseIndex: number } | null {
  const nextPhase = schedule.find(
    (b) => b.type === 'phase' && b.phaseIndex === currentPhaseIndex + 1
  );
  if (!nextPhase) return null;
  return {
    intervals: generateIntervals(),
    phaseIndex: nextPhase.phaseIndex,
  };
}

export const useStore = create<AppState>((set, get) => ({
  schedule: [],
  currentPhaseIndex: 0,
  currentIntervalIndex: 0,
  intervals: [],
  timeRemaining: STUDY_DURATION * 60,
  bigBreakTimeRemaining: BIG_BREAK_DURATION * 60,
  isRunning: false,
  activeTimerType: null,
  tierBAlert: false,
  tierBType: null,
  consoleInput: '',
  isConsoleLocked: false,
  isParsing: false,
  error: null,
  version: 0,
  totalStudiedSeconds: 0,
  sessionHistory: [],

  setConsoleInput: (input: string) => set({ consoleInput: input }),

  sendConsoleCommand: async (input: string) => {
    const state = get();
    if (state.isConsoleLocked || state.isParsing) return;

    set({ isConsoleLocked: true, isParsing: true, error: null });

    try {
      const trimmed = input.trim().toLowerCase();
      const arabicExtend = /مد|زد|طول|وسع|زيادة/.test(trimmed);
      const arabicDelay = /أخر|اجل|تأخير/.test(trimmed);
      if (trimmed.includes('extend') || trimmed.includes('delay') || arabicExtend || arabicDelay) {
        const result = await processAdjustment(input, state.schedule);
        set((s) => ({
          schedule: normalizeSchedule(result.phases),
          version: s.version + 1,
          consoleInput: '',
          isParsing: false,
          error: null,
        }));
      } else {
        const parsed = await parseSchedule(input);
        const normalized = normalizeSchedule(parsed.phases);
        const intervals = generateIntervals();
        set({
          schedule: normalized,
          intervals,
          currentPhaseIndex: 0,
          currentIntervalIndex: 0,
          intervals,
          timeRemaining: STUDY_DURATION * 60,
          isRunning: true,
          activeTimerType: 'phase_intervals',
          consoleInput: '',
          isParsing: false,
          error: null,
          version: new Date().getTime(),
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to process command', isParsing: false });
    } finally {
      setTimeout(() => set({ isConsoleLocked: false }), DEBOUNCE_MS);
    }
  },

  handleIntervalComplete: () => {
    const state = get();
    if (state.tierBAlert) return;

    if (state.activeTimerType === 'big_break') {
      playTierBAlert();
      set({
        bigBreakTimeRemaining: 0,
        isRunning: false,
        tierBAlert: true,
        tierBType: 'big_break_end',
        version: state.version + 1,
      });
      return;
    }

    const intervals = [...state.intervals];
    const currentInterval = intervals[state.currentIntervalIndex];
    if (!currentInterval) return;

    const isStudy = currentInterval.type === 'study';
    const isLastInterval = state.currentIntervalIndex >= intervals.length - 1;

    intervals[state.currentIntervalIndex] = {
      ...currentInterval,
      status: 'completed',
    };

    if (isLastInterval) {
      const added = isStudy ? currentInterval.duration * 60 : 0;
      playTierBAlert();
      set({
        intervals,
        timeRemaining: 0,
        isRunning: false,
        tierBAlert: true,
        tierBType: 'phase_end',
        totalStudiedSeconds: state.totalStudiedSeconds + added,
        sessionHistory: [...state.sessionHistory, { phaseIndex: state.currentPhaseIndex, completedAt: new Date().toISOString() }],
        version: state.version + 1,
      });
      return;
    }

    playTierAAlert();
    const added = isStudy ? currentInterval.duration * 60 : 0;
    const nextIndex = state.currentIntervalIndex + 1;
    const nextInterval = intervals[nextIndex];
    nextInterval.status = 'active';
    const nextDuration = nextInterval.duration * 60;
    set({
      intervals,
      currentIntervalIndex: nextIndex,
      timeRemaining: nextDuration,
      totalStudiedSeconds: state.totalStudiedSeconds + added,
      version: state.version + 1,
    });
    BackgroundService.start(nextDuration, state.activeTimerType!);
  },

  onNativeTick: (remainingSeconds: number) => {
    const state = get();
    if (state.activeTimerType === 'big_break') {
      set({ bigBreakTimeRemaining: remainingSeconds, version: state.version + 1 });
    } else {
      set({ timeRemaining: remainingSeconds, version: state.version + 1 });
    }
  },

  onNativeComplete: () => {
    get().handleIntervalComplete();
  },

  startTimer: () => {
    const state = get();
    if (state.schedule.length === 0) return;
    const timerType = state.activeTimerType || 'phase_intervals';
    const totalSec = timerType === 'big_break' ? state.bigBreakTimeRemaining : state.timeRemaining;
    set({ isRunning: true, activeTimerType: timerType });
    BackgroundService.start(totalSec, timerType);
  },

  pauseTimer: () => {
    set({ isRunning: false });
    BackgroundService.pause();
  },

  resumeTimer: () => {
    set({ isRunning: true });
    BackgroundService.resume();
  },

  dismissAlert: () => {
    stopTierBAlert();
    const state = get();

    if (state.tierBType === 'phase_end') {
      // Check if there's a Big Break after this phase
      const hasBigBreak = state.schedule.some(
        (b) => b.type === 'big_break' && b.phaseIndex === state.currentPhaseIndex
      );
      if (hasBigBreak) {
        set({
          tierBAlert: false,
          tierBType: null,
          isRunning: true,
          activeTimerType: 'big_break',
          bigBreakTimeRemaining: BIG_BREAK_DURATION * 60,
          version: state.version + 1,
        });
        BackgroundService.start(BIG_BREAK_DURATION * 60, 'big_break');
      } else {
        const nextPhaseIdx = state.currentPhaseIndex + 1;
        const nextPhase = state.schedule.find(
          (b) => b.type === 'phase' && b.phaseIndex === nextPhaseIdx
        );
        if (nextPhase) {
          const newIntervals = generateIntervals();
          set({
            intervals: newIntervals,
            currentIntervalIndex: 0,
            currentPhaseIndex: nextPhaseIdx,
            timeRemaining: STUDY_DURATION * 60,
            isRunning: true,
            activeTimerType: 'phase_intervals',
            tierBAlert: false,
            tierBType: null,
            version: state.version + 1,
          });
          BackgroundService.start(STUDY_DURATION * 60, 'phase_intervals');
        } else {
          set({
            tierBAlert: false,
            tierBType: null,
            isRunning: false,
            activeTimerType: null,
            version: state.version + 1,
          });
          BackgroundService.stop();
        }
      }
      return;
    }

    if (state.tierBType === 'big_break_end') {
      const nextPhaseIdx = state.currentPhaseIndex + 1;
      const nextPhase = state.schedule.find(
        (b) => b.type === 'phase' && b.phaseIndex === nextPhaseIdx
      );
      if (nextPhase) {
        const newIntervals = generateIntervals();
        set({
          intervals: newIntervals,
          currentIntervalIndex: 0,
          currentPhaseIndex: nextPhaseIdx,
          timeRemaining: STUDY_DURATION * 60,
          isRunning: true,
          activeTimerType: 'phase_intervals',
          tierBAlert: false,
          tierBType: null,
          version: state.version + 1,
        });
        BackgroundService.start(STUDY_DURATION * 60, 'phase_intervals');
      } else {
        set({
          tierBAlert: false,
          tierBType: null,
          isRunning: false,
          activeTimerType: null,
          version: state.version + 1,
        });
        BackgroundService.stop();
      }
      return;
    }

    set({ tierBAlert: false, tierBType: null });
  },

  updateSchedule: (phases: ScheduleBlock[]) => {
    set((s) => ({ schedule: phases, version: s.version + 1 }));
  },

  clearSchedule: () => {
    set((s) => ({
      schedule: [],
      intervals: [],
      currentPhaseIndex: 0,
      currentIntervalIndex: 0,
      timeRemaining: STUDY_DURATION * 60,
      isRunning: false,
      activeTimerType: null,
      tierBAlert: false,
      tierBType: null,
      version: s.version + 1,
    }));
  },

  addStudiedSeconds: (seconds: number) => {
    set((s) => ({ totalStudiedSeconds: s.totalStudiedSeconds + seconds, version: s.version + 1 }));
  },

  syncFromService: async () => {
    const state = get();
    const serviceState = await BackgroundService.getState();
    if (serviceState?.isRunning && !state.isRunning && !state.tierBAlert) {
      set({
        isRunning: true,
        activeTimerType: serviceState.timerType as any,
        timeRemaining: serviceState.timerType === 'phase_intervals' ? serviceState.remainingSeconds : state.timeRemaining,
        bigBreakTimeRemaining: serviceState.timerType === 'big_break' ? serviceState.remainingSeconds : state.bigBreakTimeRemaining,
        version: state.version + 1,
      });
    }
    BackgroundService.setCallbacks(
      (remainingSeconds) => get().onNativeTick(remainingSeconds),
      () => get().onNativeComplete()
    );
  },

  extendBreak: (phaseIndex: number, minutes: number) => {
    const state = get();
    const blockIndex = state.schedule.findIndex(
      (b) => b.phaseIndex === phaseIndex && b.type === 'big_break'
    );
    if (blockIndex === -1) return;
    const updated = slideSchedule(state.schedule, blockIndex, minutes);
    const block = updated[blockIndex];
    const blockEnd = new Date(block.endTime);
    blockEnd.setMinutes(blockEnd.getMinutes() + minutes);
    updated[blockIndex] = {
      ...block,
      endTime: blockEnd.toISOString(),
      duration: block.duration + minutes,
    };
    set((s) => ({ schedule: updated, version: s.version + 1 }));
  },

  delayPhase: (phaseIndex: number, minutes: number) => {
    const state = get();
    const blockIndex = state.schedule.findIndex(
      (b) => b.phaseIndex === phaseIndex && b.type === 'phase'
    );
    if (blockIndex === -1) return;
    const updated = slideSchedule(state.schedule, blockIndex, minutes);
    set((s) => ({ schedule: updated, version: s.version + 1 }));
  },
}));
