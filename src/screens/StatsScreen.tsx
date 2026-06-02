import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';

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

interface Props {
  embedded?: boolean;
}

export const StatsScreen: React.FC<Props> = ({ embedded }) => {
  const dailyHistory = useStore((s) => s.dailyHistory);
  const totalStudiedSeconds = useStore((s) => s.totalStudiedSeconds);
  const sessionHistory = useStore((s) => s.sessionHistory);

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

  const chartContent = (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
      </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{todayHours}</Text>
            <Text style={styles.summaryLabel}>Today</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{weekHours}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{totalHours}</Text>
            <Text style={styles.summaryLabel}>All Time</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Hours</Text>
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
                          backgroundColor: d.date === new Date().toISOString().slice(0, 10) ? colors.accent : colors.cardBorder,
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, d.date === new Date().toISOString().slice(0, 10) && { color: colors.accent }]}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.avgRow}>
            <Text style={styles.avgText}>Daily avg: {avgDaily}h</Text>
            <Text style={styles.avgText}>{phasesCompleted} phases completed</Text>
          </View>
        </View>

        {/* Recent activity */}
        {sessionHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.chartTitle}>Recent Sessions</Text>
            {[...sessionHistory].reverse().slice(0, 10).map((s, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>{new Date(s.completedAt).toLocaleDateString()}</Text>
                <Text style={styles.historyPhase}>Phase {s.phaseIndex + 1}</Text>
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

  // Summary
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  summaryNum: { ...typography.h2, color: colors.accent, fontSize: 28 },
  summaryLabel: { ...typography.label, color: colors.secondary, marginTop: 4 },

  // Chart
  chartCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.md,
  },
  chartTitle: { ...typography.label, color: colors.secondary, marginBottom: spacing.md },
  chart: { marginBottom: spacing.sm },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 30 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { ...typography.bodySmall, color: colors.secondary, marginBottom: 4, fontSize: 11 },
  bar: { width: 28, borderRadius: 6, minHeight: 0 },
  barLabel: { ...typography.label, color: colors.secondary, marginTop: 6, fontSize: 11 },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  avgText: { ...typography.bodySmall, color: colors.secondary, opacity: 0.7 },

  // History
  historyCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  historyDate: { ...typography.bodySmall, color: colors.secondary },
  historyPhase: { ...typography.bodySmall, color: colors.accent },
});
