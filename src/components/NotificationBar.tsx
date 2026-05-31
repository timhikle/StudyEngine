import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';

export const NotificationBar: React.FC = () => {
  const tierBAlert = useStore((s) => s.tierBAlert);
  const tierBType = useStore((s) => s.tierBType);
  const dismissAlert = useStore((s) => s.dismissAlert);

  if (!tierBAlert) return null;

  const isPhaseEnd = tierBType === 'phase_end';

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <View style={styles.alertPulse}>
            <View style={styles.alertDot} />
          </View>
        </View>

        <Text style={styles.title}>
          {isPhaseEnd ? 'PHASE COMPLETE' : 'BREAK ENDED'}
        </Text>

        <Text style={styles.message}>
          {isPhaseEnd
            ? 'Your study phase has finished. Time for a Big Break!'
            : 'Your Big Break is over. Ready for the next phase?'}
        </Text>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={dismissAlert}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishEarlyButton}
          onPress={dismissAlert}
          activeOpacity={0.8}
        >
          <Text style={styles.finishEarlyText}>FINISH EARLY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.alert + '40',
    width: '85%',
  },
  iconRow: {
    marginBottom: spacing.lg,
  },
  alertPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.alert + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.alert,
  },
  title: {
    ...typography.h2,
    color: colors.alert,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },
  message: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  dismissButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dismissText: {
    color: colors.canvas,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
  finishEarlyButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.alert,
  },
  finishEarlyText: {
    color: colors.alert,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
});
