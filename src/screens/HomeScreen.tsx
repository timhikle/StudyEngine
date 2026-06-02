import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Modal } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';
import { formatTime, formatTimeLabel } from '../utils/time';
import { TimerDisplay } from '../components/TimerDisplay';
import { ProgressRing } from '../components/ProgressRing';
import { useT } from '../i18n';

export const HomeScreen: React.FC = () => {
  const schedule = useStore((s) => s.schedule);
  const intervals = useStore((s) => s.intervals);
  const currentIntervalIndex = useStore((s) => s.currentIntervalIndex);
  const timeRemaining = useStore((s) => s.timeRemaining);
  const bigBreakTimeRemaining = useStore((s) => s.bigBreakTimeRemaining);
  const isRunning = useStore((s) => s.isRunning);
  const activeTimerType = useStore((s) => s.activeTimerType);
  const isWaitingToStart = useStore((s) => s.isWaitingToStart);
  const waitingUntil = useStore((s) => s.waitingUntil);
  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const clearSchedule = useStore((s) => s.clearSchedule);
  const isSessionComplete = useStore((s) => s.isSessionComplete);
  const sessionCompleteStats = useStore((s) => s.sessionCompleteStats);
  const dismissSessionComplete = useStore((s) => s.dismissSessionComplete);
  const settings = useStore((s) => s.settings);
  const t = useT();

  const suggestion = useStore((s) => s.suggestion);
  const isWaiting = isWaitingToStart && activeTimerType === 'waiting';
  const isBigBreak = activeTimerType === 'big_break';
  const isPhaseIntervals = activeTimerType === 'phase_intervals';
  const currentInterval = intervals[currentIntervalIndex];
  const totalSeconds = isBigBreak
    ? settings.bigBreakDuration * 60
    : currentInterval
      ? currentInterval.duration * 60
      : 1;
  const remaining = isBigBreak ? bigBreakTimeRemaining : timeRemaining;
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

  const intervalLabel = isWaiting
    ? t('startsIn')
    : isBigBreak
      ? t('bigBreak')
      : currentInterval
        ? currentInterval.type === 'study' ? t('study') : t('shortBreak')
        : t('ready');

  const hasSchedule = schedule.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>{t('phaseStudy')}</Text>
          <Text style={styles.version}>{t('version')}</Text>
        </View>

        <View style={styles.timerSection}>
          <ProgressRing
            size={260}
            strokeWidth={8}
            progress={isWaiting ? 0 : progress}
            color={
              isWaiting
                ? colors.secondary
                : isBigBreak
                  ? colors.warning
                  : remaining <= 60
                    ? colors.alert
                    : colors.accent
            }
          >
            {isWaiting ? (
              <View style={styles.waitingContent}>
                <Text style={styles.waitingLabel}>{t('startsIn')}</Text>
                <Text style={styles.waitingTime}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.waitingStartAt}>
                  {t('scheduleSet')} {waitingUntil ? formatTimeLabel(waitingUntil) : ''}
                </Text>
              </View>
            ) : (
              <TimerDisplay
                timeRemaining={remaining}
                intervalLabel={intervalLabel}
                isRunning={isRunning}
                progress={progress}
              />
            )}
          </ProgressRing>
        </View>

        {suggestion && !isWaiting && (
          <View style={styles.suggestionBanner}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        )}

        <View style={styles.controls}>
          {isWaiting && (
            <View style={styles.waitingButtons}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={startTimer}
                activeOpacity={0.8}
              >
                <Text style={[styles.controlText, { color: colors.canvas }]}>{t('skipWait')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={clearSchedule}
                activeOpacity={0.8}
              >
                <Text style={[styles.controlText, { color: colors.alert }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isWaiting && hasSchedule && isRunning && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.controlText}>{t('pause')}</Text>
            </TouchableOpacity>
          )}
          {!isWaiting && hasSchedule && !isRunning && activeTimerType && (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={startTimer}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlText, { color: colors.canvas }]}>
                {t('resume')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.intervalInfo}>
          {isWaiting && (
            <Text style={styles.phaseInfo}>
              {t('scheduleSet')} {waitingUntil ? formatTimeLabel(waitingUntil) : ''}
            </Text>
          )}
          {isPhaseIntervals && (
            <Text style={styles.intervalCount}>
              {t('interval')} {currentIntervalIndex + 1} / {intervals.length}
            </Text>
          )}
          {isBigBreak && (
            <Text style={[styles.intervalCount, { color: colors.warning }]}>
              {t('bigBreak')} — {t('phase')} {schedule.find(b => b.status === 'active')?.phaseIndex ?? ''} {t('sessionComplete').toLowerCase()}
            </Text>
          )}
          {!activeTimerType && (
            <Text style={styles.phaseInfo}>{t('startNow')}</Text>
          )}
        </View>

        {isSessionComplete && sessionCompleteStats && (
          <View style={styles.completeOverlay}>
            <View style={styles.completeCard}>
              <Text style={styles.completeIcon}>🎉</Text>
              <Text style={styles.completeTitle}>{t('sessionComplete')}</Text>
              <View style={styles.completeStats}>
                <View style={styles.completeStat}>
                  <Text style={styles.completeStatNum}>{sessionCompleteStats.phasesDone}</Text>
                  <Text style={styles.completeStatLabel}>{t('phasesDone')}</Text>
                </View>
                <View style={styles.completeDivider} />
                <View style={styles.completeStat}>
                  <Text style={styles.completeStatNum}>{Math.floor(sessionCompleteStats.totalMinutes / 60)}h {sessionCompleteStats.totalMinutes % 60}m</Text>
                  <Text style={styles.completeStatLabel}>{t('studiedUpper')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.completeBtn} onPress={dismissSessionComplete} activeOpacity={0.8}>
                <Text style={styles.completeBtnText}>{t('dismiss')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', paddingTop: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  appName: { ...typography.h3, color: colors.activeText },
  version: { ...typography.bodySmall, color: colors.secondary },
  timerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  controls: { flexDirection: 'row', marginVertical: spacing.xl },
  controlButton: { backgroundColor: colors.card, borderRadius: borderRadius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderWidth: 1, borderColor: colors.cardBorder },
  waitingContent: { alignItems: 'center' },
  waitingLabel: { ...typography.label, color: colors.secondary, marginBottom: 8 },
  waitingTime: { ...typography.timer, color: colors.activeText, marginVertical: 8 },
  waitingStartAt: { ...typography.bodySmall, color: colors.accent },
  waitingButtons: { flexDirection: 'row', gap: 12 },
  startButton: { backgroundColor: colors.accent, borderRadius: borderRadius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderWidth: 1, borderColor: colors.accent },
  cancelButton: { backgroundColor: 'transparent', borderRadius: borderRadius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderWidth: 1, borderColor: colors.alert },
  controlText: { ...typography.body, color: colors.activeText, fontWeight: '700', letterSpacing: 2 },
  intervalInfo: { alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  suggestionBanner: { backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: '#2dd4bf', marginBottom: spacing.md },
  suggestionText: { ...typography.body, color: '#94a3b8', textAlign: 'center' },
  intervalCount: { ...typography.bodySmall, color: colors.secondary, marginBottom: spacing.xs },
  phaseInfo: { ...typography.bodySmall, color: colors.secondary, opacity: 0.7 },
  completeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  completeCard: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  completeIcon: { fontSize: 48, marginBottom: spacing.md },
  completeTitle: { ...typography.h2, color: colors.accent, marginBottom: spacing.lg },
  completeStats: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  completeStat: { alignItems: 'center', minWidth: 100 },
  completeStatNum: { ...typography.h2, color: colors.activeText, fontSize: 24 },
  completeStatLabel: { ...typography.label, color: colors.secondary },
  completeDivider: { width: 1, height: 40, backgroundColor: colors.cardBorder, marginHorizontal: spacing.lg },
  completeBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.xxl },
  completeBtnText: { ...typography.body, color: colors.canvas, fontWeight: '700', letterSpacing: 2 },
});
