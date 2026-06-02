import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ScheduleBlock } from '../types';
import { formatTimeLabel } from '../utils/time';
import { useT } from '../i18n';

interface BigBreakCardProps {
  block: ScheduleBlock;
  isActive: boolean;
}

export const BigBreakCard: React.FC<BigBreakCardProps> = ({ block, isActive }) => {
  const t = useT();

  return (
    <View
      style={[
        styles.card,
        isActive && styles.activeCard,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconSymbol}>☕</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, isActive && styles.activeLabel]}>
          {block.label}
        </Text>
        <Text style={styles.timeText}>
          {formatTimeLabel(block.startTime)} - {formatTimeLabel(block.endTime)}
        </Text>
        <Text style={styles.durationText}>{block.duration} {t('minRest')}</Text>
      </View>
      <View style={styles.statusDot}>
        <View
          style={[
            styles.dot,
            isActive && styles.activeDot,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.cardBorder,
    marginBottom: spacing.sm,
    opacity: 0.85,
  },
  activeCard: {
    borderLeftColor: colors.warning,
    opacity: 1,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  iconSymbol: { fontSize: 18 },
  content: { flex: 1 },
  label: { ...typography.body, color: colors.secondary, fontWeight: '600', marginBottom: 2 },
  activeLabel: { color: colors.warning },
  timeText: { ...typography.bodySmall, color: colors.secondary, marginBottom: 1 },
  durationText: { ...typography.label, color: colors.secondary },
  statusDot: { marginLeft: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.cardBorder },
  activeDot: { backgroundColor: colors.warning },
});
