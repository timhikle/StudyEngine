import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size,
  strokeWidth,
  progress,
  color = colors.accent,
  trackColor = colors.cardBorder,
  children,
}) => {
  const halfSize = size / 2;
  const radius = halfSize - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const dashOffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const rotateInterp = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const containerStyle = useMemo(
    () => ({ width: size, height: size }),
    [size]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: color,
            borderRightColor: color,
            transform: [{ rotate: rotateInterp }],
          },
        ]}
      />
      {children && (
        <View style={styles.content}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
  content: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
