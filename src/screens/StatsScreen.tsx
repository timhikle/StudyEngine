import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BAR_MAX_HEIGHT = 140;

function getWeekDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

interface Props { embedded?: boolean }

export const StatsScreen: React.FC<Props> = ({ embedded }) => {
  const dailyHistory = useStore((s) => s.dailyHistory);
  const totalStudiedSeconds = useStore((s) => s.totalStudiedSeconds);
  const sessionHistory = useStore((s) => s.sessionHistory);
  const t = useT();

  const weekDays = useMemo(() => getWeekDays(), []);

  const weekData = useMemo(() => {
    return weekDays.map((date) => {
      const secs = dailyHistory[date] || 0;
      const hours = secs / 3600;
      const day = new Date(date).getDay();
      return { date, label: WEEKDAYS[day], seconds: secs, hours: Math.round(hours * 10) / 10 };
    });
  }, [weekDays, dailyHistory]);

  const maxHours = useMemo(() => Math.max(...weekData.map((d) => d.hours), 0.5), [weekData]);

  const todayTotal = dailyHistory[new Date().toISOString().slice(0, 10)] || 0;
  const todayHours = Math.round((todayTotal / 3600) * 10) / 10;
  const totalHours = Math.round((totalStudiedSeconds / 3600) * 10) / 10;
  const phasesCompleted = sessionHistory.length;

  const weekTotal = weekData.reduce((sum, d) => sum + d.seconds, 0);
  const weekHours = Math.round((weekTotal / 3600) * 10) / 10;
  const avgDaily = weekDays.length > 0 ? Math.round((weekHours / weekDays.length) * 10) / 10 : 0;

  const todayStr = new Date().toISOString().slice(0, 10);

  const chartContent = (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('stats')}</Text>
      </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{todayHours}</Text>
            <Text style={styles.summaryLabel}>{t('today')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{weekHours}</Text>
            <Text style={styles.summaryLabel}>{t('thisWeek')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{totalHours}</Text>
            <Text style={styles.summaryLabel}>{t('allTime')}</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('weeklyHours')}</Text>
          <View style={styles.chart}>
            <View style={styles.barsRow}>
              {weekData.map((d) => {
                const barHeight = maxHours > 0 ? (d.hours / maxHours) * BAR_MAX_HEIGHT : 0;
                return (
                  <View key={d.date} style={styles.barCol}>
                    <Text style={styles.barValue}>{d.hours > 0 ? d.hours : ''}</Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, d.hours > 0 ? 4 : 0),
                          backgroundColor: d.date === todayStr ? colors.accent : colors.cardBorder,
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, d.date === todayStr && { color: colors.accent }]}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.avgRow}>
            <Text style={styles.avgText}>{t('dailyAvg')}: {avgDaily}h</Text>
            <Text style={styles.avgText}>{phasesCompleted} {t('phasesCompleted')}</Text>
          </View>
        </View>

        {sessionHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.chartTitle}>{t('recentSessions')}</Text>
            {[...sessionHistory].reverse().slice(0, 10).map((s, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>{new Date(s.completedAt).toLocaleDateString()}</Text>
                <Text style={styles.historyPhase}>{t('phase')} {s.phaseIndex + 1}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
  );

  if (embedded) return chartContent;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      {chartContent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  header: { marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.activeText },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  summaryNum: { ...typography.h2, color: colors.accent, fontSize: 28 },
  summaryLabel: { ...typography.label, color: colors.secondary, marginTop: 4 },
  chartCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.md },
  chartTitle: { ...typography.label, color: colors.secondary, marginBottom: spacing.md },
  chart: { marginBottom: spacing.sm },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 30 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { ...typography.bodySmall, color: colors.secondary, marginBottom: 4, fontSize: 11 },
  bar: { width: 28, borderRadius: 6, minHeight: 0 },
  barLabel: { ...typography.label, color: colors.secondary, marginTop: 6, fontSize: 11 },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  avgText: { ...typography.bodySmall, color: colors.secondary, opacity: 0.7 },
  historyCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  historyDate: { ...typography.bodySmall, color: colors.secondary },
  historyPhase: { ...typography.bodySmall, color: colors.accent },
});
