import React, { useMemo } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ScheduleBlock } from '../types';
import { PhaseCard } from './PhaseCard';
import { BigBreakCard } from './BigBreakCard';

interface PhaseTimelineProps {
  schedule: ScheduleBlock[];
  currentPhaseIndex: number;
}

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({ schedule, currentPhaseIndex }) => {
  const blocks = useMemo(() => schedule, [schedule]);

  if (blocks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No schedule yet</Text>
        <Text style={styles.emptySubtext}>
          Use the AI Console to set your study schedule
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={blocks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const isActive = item.phaseIndex === currentPhaseIndex && item.status !== 'completed';
        const isCompleted = item.status === 'completed';
        if (item.type === 'phase') {
          return (
            <PhaseCard
              block={item}
              isActive={isActive}
              isCompleted={isCompleted}
            />
          );
        }
        return (
          <BigBreakCard
            block={item}
            isActive={isActive}
          />
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
