import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';
import { formatTime } from '../utils/time';
import { useT } from '../i18n';

interface TimerDisplayProps {
  timeRemaining: number;
  intervalLabel: string;
  isRunning: boolean;
  progress: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeRemaining,
  intervalLabel,
  isRunning,
  progress,
}) => {
  const t = useT();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{intervalLabel}</Text>
      <Text
        style={[
          styles.time,
          { color: timeRemaining <= 60 ? colors.alert : colors.activeText },
        ]}
      >
        {formatTime(timeRemaining)}
      </Text>
      <Text style={styles.status}>
        {isRunning ? t('focus') : t('paused')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  label: { ...typography.label, color: colors.secondary, marginBottom: 8 },
  time: { ...typography.timer, marginVertical: 8 },
  status: { ...typography.bodySmall, color: colors.accent, letterSpacing: 4 },
});
