import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

const PARTICLE_COLORS = [Colors.orange, Colors.green, Colors.blue, Colors.purple, Colors.mint, '#E4789B'];

const PARTICLES = PARTICLE_COLORS.map((color, index) => {
  const angle = (index / PARTICLE_COLORS.length) * Math.PI * 2;
  return { color, dx: Math.cos(angle) * 26, dy: Math.sin(angle) * 26 };
});

export function CelebrationBurst({ triggerKey }: { triggerKey: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (triggerKey === 0) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [triggerKey, progress]);

  if (triggerKey === 0) return null;

  return (
    <Animated.View pointerEvents="none" style={styles.container}>
      {PARTICLES.map((particle, index) => {
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dy] });
        const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 0.4] });
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                backgroundColor: particle.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
