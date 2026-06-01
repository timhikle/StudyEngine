import { create } from '../lib/zustand';
import { AppState, AppSettings, ScheduleBlock, StudyInterval, TierBType } from '../types';
import {
  generateScheduleBlocks,
  generateIntervals,
  slideSchedule,
  normalizeSchedule,
  getCurrentIntervalEndSeconds,
  STUDY_DURATION,
  SHORT_BREAK_DURATION,
  BIG_BREAK_DURATION,
  PHASE_DURATION,
  INTERVALS_PER_PHASE,
} from '../utils/schedule';
import { parseSchedule, processAdjustment } from '../services/gemini';
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
  isWaitingToStart: false,
  waitingUntil: null,
  tierBAlert: false,
  tierBType: null,
  consoleInput: '',
  suggestion: null,
  isConsoleLocked: false,
  isParsing: false,
  error: null,
  version: 0,
  totalStudiedSeconds: 0,
  sessionHistory: [],
  isSessionComplete: false,
  sessionCompleteStats: null,
  settings: {
    studyDuration: STUDY_DURATION,
    shortBreakDuration: SHORT_BREAK_DURATION,
    phaseDuration: PHASE_DURATION,
    bigBreakDuration: BIG_BREAK_DURATION,
    intervalsPerPhase: INTERVALS_PER_PHASE,
    soundEnabled: true,
    tierBEnabled: true,
  },

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
        const parsed = await parseSchedule(input, state.totalStudiedSeconds);
        const sett = get().settings;
        const normalized = normalizeSchedule(parsed.phases);
        const intervals = generateIntervals(sett);
        const firstPhase = normalized[0];
        const now = new Date();
        const firstStart = new Date(firstPhase.startTime);
        const secondsUntilStart = Math.round((firstStart.getTime() - now.getTime()) / 1000);

        if (secondsUntilStart > 10) {
          set({
            schedule: normalized,
            intervals,
            currentPhaseIndex: 0,
            currentIntervalIndex: 0,
            timeRemaining: secondsUntilStart,
            isRunning: true,
            activeTimerType: 'waiting',
            isWaitingToStart: true,
            waitingUntil: firstPhase.startTime,
            suggestion: parsed.suggestion || null,
            consoleInput: '',
            isParsing: false,
            error: null,
            version: new Date().getTime(),
          });
          BackgroundService.start(secondsUntilStart, 'waiting');
        } else {
          set({
            schedule: normalized,
            intervals,
            currentPhaseIndex: 0,
            currentIntervalIndex: 0,
            timeRemaining: sett.studyDuration * 60,
            isRunning: true,
            activeTimerType: 'phase_intervals',
            isWaitingToStart: false,
            waitingUntil: null,
            suggestion: parsed.suggestion || null,
            consoleInput: '',
            isParsing: false,
            error: null,
            version: new Date().getTime(),
          });
          BackgroundService.start(sett.studyDuration * 60, 'phase_intervals');
        }
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
    } else if (state.activeTimerType === 'waiting') {
      set({ timeRemaining: remainingSeconds, version: state.version + 1 });
    } else {
      set({ timeRemaining: remainingSeconds, version: state.version + 1 });
    }
  },

  onNativeComplete: () => {
    const state = get();
    if (state.activeTimerType === 'waiting') {
      BackgroundService.stop();
      const intervals = generateIntervals(state.settings);
      set({
        intervals,
        currentIntervalIndex: 0,
        timeRemaining: state.settings.studyDuration * 60,
        isRunning: true,
        activeTimerType: 'phase_intervals',
        isWaitingToStart: false,
        waitingUntil: null,
        version: state.version + 1,
      });
      BackgroundService.start(state.settings.studyDuration * 60, 'phase_intervals');
      return;
    }
    get().handleIntervalComplete();
  },

  skipWait: () => {
    const state = get();
    BackgroundService.stop();
    const intervals = generateIntervals(state.settings);
    set({
      intervals,
      currentIntervalIndex: 0,
      timeRemaining: state.settings.studyDuration * 60,
      isRunning: true,
      activeTimerType: 'phase_intervals',
      isWaitingToStart: false,
      waitingUntil: null,
      version: state.version + 1,
    });
    BackgroundService.start(state.settings.studyDuration * 60, 'phase_intervals');
  },

  startTimer: () => {
    const state = get();
    if (state.schedule.length === 0) return;
    const timerType = state.activeTimerType || 'phase_intervals';
    if (timerType === 'waiting') {
      get().skipWait();
      return;
    }
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

  clearSchedule: () => {
    set((s) => ({
      schedule: [],
      intervals: [],
      currentPhaseIndex: 0,
      currentIntervalIndex: 0,
      timeRemaining: s.settings.studyDuration * 60,
      isRunning: false,
      activeTimerType: null,
      isWaitingToStart: false,
      waitingUntil: null,
      suggestion: null,
      tierBAlert: false,
      tierBType: null,
      version: s.version + 1,
    }));
    BackgroundService.stop();
  },

  dismissAlert: () => {
    stopTierBAlert();
    const state = get();
    const sett = state.settings;

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
          bigBreakTimeRemaining: sett.bigBreakDuration * 60,
          version: state.version + 1,
        });
        BackgroundService.start(sett.bigBreakDuration * 60, 'big_break');
      } else {
        const nextPhaseIdx = state.currentPhaseIndex + 1;
        const nextPhase = state.schedule.find(
          (b) => b.type === 'phase' && b.phaseIndex === nextPhaseIdx
        );
        if (nextPhase) {
          const newIntervals = generateIntervals(sett);
          set({
            intervals: newIntervals,
            currentIntervalIndex: 0,
            currentPhaseIndex: nextPhaseIdx,
            timeRemaining: sett.studyDuration * 60,
            isRunning: true,
            activeTimerType: 'phase_intervals',
            tierBAlert: false,
            tierBType: null,
            version: state.version + 1,
          });
          BackgroundService.start(sett.studyDuration * 60, 'phase_intervals');
        } else {
          set({
            tierBAlert: false,
            tierBType: null,
            isRunning: false,
            activeTimerType: null,
            isSessionComplete: true,
            sessionCompleteStats: {
              totalMinutes: Math.round(state.totalStudiedSeconds / 60),
              phasesDone: state.currentPhaseIndex + 1,
            },
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
        const newIntervals = generateIntervals(sett);
        set({
          intervals: newIntervals,
          currentIntervalIndex: 0,
          currentPhaseIndex: nextPhaseIdx,
          timeRemaining: sett.studyDuration * 60,
          isRunning: true,
          activeTimerType: 'phase_intervals',
          tierBAlert: false,
          tierBType: null,
          version: state.version + 1,
        });
        BackgroundService.start(sett.studyDuration * 60, 'phase_intervals');
      } else {
        set({
          tierBAlert: false,
          tierBType: null,
          isRunning: false,
          activeTimerType: null,
          isSessionComplete: true,
          sessionCompleteStats: {
            totalMinutes: Math.round(state.totalStudiedSeconds / 60),
            phasesDone: state.currentPhaseIndex + 1,
          },
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

  addStudiedSeconds: (seconds: number) => {
    set((s) => ({ totalStudiedSeconds: s.totalStudiedSeconds + seconds, version: s.version + 1 }));
  },

  syncFromService: async () => {
    const state = get();
    const serviceState = await BackgroundService.getState();
    if (serviceState?.isRunning && !state.isRunning && !state.tierBAlert) {
      const isWait = serviceState.timerType === 'waiting';
      set({
        isRunning: true,
        activeTimerType: serviceState.timerType as any,
        isWaitingToStart: isWait,
        timeRemaining: serviceState.remainingSeconds,
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

  updateSettings: (partial: Partial<AppSettings>) => {
    set((s) => ({ settings: { ...s.settings, ...partial }, version: s.version + 1 }));
  },

  dismissSessionComplete: () => {
    set({ isSessionComplete: false, sessionCompleteStats: null });
  },
}));
