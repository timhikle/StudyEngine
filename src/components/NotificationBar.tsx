import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

export const NotificationBar: React.FC = () => {
  const tierBAlert = useStore((s) => s.tierBAlert);
  const tierBType = useStore((s) => s.tierBType);
  const dismissAlert = useStore((s) => s.dismissAlert);
  const t = useT();

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
          {isPhaseEnd ? t('phaseComplete') : t('breakEnded')}
        </Text>

        <Text style={styles.message}>
          {isPhaseEnd
            ? t('phaseFinished')
            : t('breakFinished')}
        </Text>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={dismissAlert}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissText}>{t('dismiss')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishEarlyButton}
          onPress={dismissAlert}
          activeOpacity={0.8}
        >
          <Text style={styles.finishEarlyText}>{t('finishEarly')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  iconRow: { marginBottom: spacing.md },
  alertPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  dismissButton: {
    backgroundColor: colors.alert,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    width: '80%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dismissText: {
    ...typography.body,
    color: 'white',
    fontWeight: '700',
    letterSpacing: 2,
  },
  finishEarlyButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'transparent',
  },
  finishEarlyText: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
