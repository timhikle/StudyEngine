import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Console } from '../components/Console';
import { useStore } from '../store/useStore';
import { PhaseTimeline } from '../components/PhaseTimeline';

export const ConsoleScreen: React.FC = () => {
  const schedule = useStore((s) => s.schedule);
  const currentPhaseIndex = useStore((s) => s.currentPhaseIndex);
  const version = useStore((s) => s.version);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Console</Text>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>AI Online</Text>
        </View>

        <Console />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Schedule Timeline</Text>
          <PhaseTimeline
            schedule={schedule}
            currentPhaseIndex={currentPhaseIndex}
          />
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.activeText,
    marginRight: spacing.sm,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.xs,
  },
  onlineText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
