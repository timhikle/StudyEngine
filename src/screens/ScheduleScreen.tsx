import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { useStore } from '../store/useStore';
import { PhaseTimeline } from '../components/PhaseTimeline';

export const ScheduleScreen: React.FC = () => {
  const schedule = useStore((s) => s.schedule);
  const currentPhaseIndex = useStore((s) => s.currentPhaseIndex);
  const totalStudiedSeconds = useStore((s) => s.totalStudiedSeconds);
  const sessionCount = useStore((s) => s.sessionHistory.length);
  const clearSchedule = useStore((s) => s.clearSchedule);
  const version = useStore((s) => s.version);

  const phaseBlocks = schedule.filter((b) => b.type === 'phase');
  const totalStudyMinutes = phaseBlocks.reduce((acc, b) => acc + b.duration, 0);
  const totalBreaks = schedule.filter((b) => b.type === 'big_break').length;
  const hasData = totalStudiedSeconds > 0 || schedule.length > 0;

  const studiedHours = Math.floor(totalStudiedSeconds / 3600);
  const studiedMins = Math.floor((totalStudiedSeconds % 3600) / 60);
  const timeDisplay = studiedHours > 0
    ? `${studiedHours}:${String(studiedMins).padStart(2, '0')}`
    : `${studiedMins}m`;

  const handleClear = () => {
    Alert.alert(
      'Clear Schedule',
      '🗑 مسح الجدول بالكامل؟ Clear entire schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearSchedule },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
          {schedule.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>🗑 مسح</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasData && (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportLabelArabic}>📊 التقرير الأسبوعي</Text>
              <Text style={styles.reportLabel}>Weekly Report</Text>
            </View>
            <View style={styles.reportRow}>
              <View style={styles.reportItem}>
                <Text style={styles.reportValue}>{timeDisplay}</Text>
                <Text style={styles.reportSub}>ساعات الدراسة</Text>
                <Text style={styles.reportSubEn}>Hours Studied</Text>
              </View>
              <View style={styles.reportItem}>
                <Text style={styles.reportValue}>{sessionCount}</Text>
                <Text style={styles.reportSub}>الجلسات المكتملة</Text>
                <Text style={styles.reportSubEn}>Sessions Done</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtnWide}>
              <Text style={styles.clearBtnWideText}>حذف الجدول</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{phaseBlocks.length}</Text>
            <Text style={styles.statLabel}>Phases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalStudyMinutes}</Text>
            <Text style={styles.statLabel}>Study Min</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalBreaks}</Text>
            <Text style={styles.statLabel}>Big Breaks</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>

        <PhaseTimeline
          schedule={schedule}
          currentPhaseIndex={currentPhaseIndex}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.activeText,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    color: colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.label,
    color: colors.secondary,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.secondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.alert,
  },
  clearBtnText: {
    color: colors.alert,
    fontSize: 12,
    fontWeight: '600',
  },
  reportCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: colors.card,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportLabelArabic: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reportLabel: {
    color: colors.secondary,
    fontSize: 11,
  },
  reportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderRadius: 12,
    padding: spacing.md,
  },
  reportValue: {
    ...typography.h2,
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
  },
  reportSub: {
    color: colors.secondary,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  reportSubEn: {
    color: '#64748b',
    fontSize: 10,
  },
  clearBtnWide: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnWideText: {
    color: colors.alert,
    fontSize: 12,
    fontWeight: '600',
  },
});
