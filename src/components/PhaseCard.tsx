import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ScheduleBlock } from '../types';
import { formatTimeLabel } from '../utils/time';

interface PhaseCardProps {
  block: ScheduleBlock;
  isActive: boolean;
  isCompleted: boolean;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({ block, isActive, isCompleted }) => {
  return (
    <View
      style={[
        styles.card,
        isActive && styles.activeCard,
        isCompleted && styles.completedCard,
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.label,
            isActive && styles.activeLabel,
            isCompleted && styles.completedLabel,
          ]}
        >
          {block.label}
        </Text>
        <View
          style={[
            styles.badge,
            isActive && styles.activeBadge,
            isCompleted && styles.completedBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            {isActive ? 'ACTIVE' : isCompleted ? 'DONE' : 'PENDING'}
          </Text>
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>
          {formatTimeLabel(block.startTime)} - {formatTimeLabel(block.endTime)}
        </Text>
        <Text style={styles.durationText}>{block.duration} min</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  activeCard: {
    borderLeftColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completedCard: {
    borderLeftColor: colors.success,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.body,
    color: colors.activeText,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.accent,
  },
  completedLabel: {
    color: colors.success,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardBorder,
  },
  activeBadge: {
    backgroundColor: colors.accent,
  },
  completedBadge: {
    backgroundColor: colors.success,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.canvas,
    letterSpacing: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    ...typography.bodySmall,
    color: colors.secondary,
  },
  durationText: {
    ...typography.bodySmall,
    color: colors.secondary,
  },
});
