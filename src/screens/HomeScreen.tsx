import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';
import { TimerDisplay } from '../components/TimerDisplay';
import { ProgressRing } from '../components/ProgressRing';

export const HomeScreen: React.FC = () => {
  const schedule = useStore((s) => s.schedule);
  const intervals = useStore((s) => s.intervals);
  const currentIntervalIndex = useStore((s) => s.currentIntervalIndex);
  const timeRemaining = useStore((s) => s.timeRemaining);
  const bigBreakTimeRemaining = useStore((s) => s.bigBreakTimeRemaining);
  const isRunning = useStore((s) => s.isRunning);
  const activeTimerType = useStore((s) => s.activeTimerType);
  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const tick = useStore((s) => s.tick);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useStore.getState();
      if (state.isRunning && !state.tierBAlert) {
        state.tick();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isBigBreak = activeTimerType === 'big_break';
  const isPhaseIntervals = activeTimerType === 'phase_intervals';
  const currentInterval = intervals[currentIntervalIndex];
  const totalSeconds = isBigBreak
    ? BIG_BREAK_DURATION * 60
    : currentInterval
      ? currentInterval.duration * 60
      : 1;
  const remaining = isBigBreak ? bigBreakTimeRemaining : timeRemaining;
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

  const intervalLabel = isBigBreak
    ? 'BIG BREAK'
    : currentInterval
      ? currentInterval.type === 'study' ? 'STUDY' : 'SHORT BREAK'
      : 'READY';

  const hasSchedule = schedule.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>Phase Study</Text>
          <Text style={styles.version}>v1.0</Text>
        </View>

        <View style={styles.timerSection}>
          <ProgressRing
            size={260}
            strokeWidth={8}
            progress={progress}
            color={
              isBigBreak
                ? colors.warning
                : remaining <= 60
                  ? colors.alert
                  : colors.accent
            }
          >
            <TimerDisplay
              timeRemaining={remaining}
              intervalLabel={intervalLabel}
              isRunning={isRunning}
              progress={progress}
            />
          </ProgressRing>
        </View>

        <View style={styles.controls}>
          {hasSchedule && isRunning && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.controlText}>PAUSE</Text>
            </TouchableOpacity>
          )}
          {hasSchedule && !isRunning && activeTimerType && (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={startTimer}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlText, { color: colors.canvas }]}>
                RESUME
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.intervalInfo}>
          {isPhaseIntervals && (
            <Text style={styles.intervalCount}>
              Interval {currentIntervalIndex + 1} / {intervals.length}
            </Text>
          )}
          {isBigBreak && (
            <Text style={[styles.intervalCount, { color: colors.warning }]}>
              Big Break — Phase {schedule.find(b => b.status === 'active')?.phaseIndex ?? ''} Complete
            </Text>
          )}
          {!activeTimerType && (
            <Text style={styles.phaseInfo}>Use Console to set a schedule</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const BIG_BREAK_DURATION = 30;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  appName: {
    ...typography.h3,
    color: colors.activeText,
  },
  version: {
    ...typography.bodySmall,
    color: colors.secondary,
  },
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginVertical: spacing.xl,
  },
  controlButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  startButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  controlText: {
    ...typography.body,
    color: colors.activeText,
    fontWeight: '700',
    letterSpacing: 2,
  },
  intervalInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  intervalCount: {
    ...typography.bodySmall,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  phaseInfo: {
    ...typography.bodySmall,
    color: colors.secondary,
    opacity: 0.7,
  },
});
