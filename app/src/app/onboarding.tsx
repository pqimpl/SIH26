import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Dots } from '@/components/ui/dots';
import { Colors, Fonts, HeadingFont, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    blobColor: Colors.mintSoft,
    iconColor: Colors.primary,
    title: 'Compassionate Care.\nEvery Step of the Way.',
    subtitle: 'Personalized support for cognitive, well-being and a better quality of life.',
  },
  {
    blobColor: Colors.primary,
    iconColor: Colors.onPrimary,
    title: 'Engage. Stimulate.\nStay Connected.',
    subtitle: 'Activities, reminders are insights to keep the mind active and engaged.',
  },
  {
    blobColor: Colors.mintSoft,
    iconColor: Colors.primary,
    title: 'Your Data.\nAlways Secure.',
    subtitle: 'We prioritize your privacy with secure and trustworthy care.',
  },
];

function SlideIcon({ index, color }: { index: number; color: string }) {
  if (index === 0) {
    return <Ionicons name="heart-outline" size={84} color={color} />;
  }
  if (index === 1) {
    return (
      <View style={{ transform: [{ translateY: 10 }] }}>
        <MaterialCommunityIcons name="brain" size={84} color={color} />
      </View>
    );
  }
  return <Ionicons name="shield-checkmark-outline" size={84} color={color} />;
}

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const goToIndex = (nextIndex: number) => {
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(nextIndex);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Ionicons name="leaf" size={18} color={Colors.primary} />
          <Text style={styles.brandName}>Sudhi</Text>
        </View>
        {!isLast && (
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}>
        {SLIDES.map((slide, slideIndex) => (
          <View key={slideIndex} style={[styles.slide, { width }]}>
            <View style={[styles.blob, { backgroundColor: slide.blobColor }]}>
              <SlideIcon index={slideIndex} color={slide.iconColor} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Dots count={SLIDES.length} activeIndex={index} />
        <Button
          label={isLast ? 'Get Started' : 'Next'}
          onPress={isLast ? finish : () => goToIndex(index + 1)}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 18,
    fontFamily: HeadingFont.bold,
    color: Colors.primary,
  },
  skip: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: Fonts?.sans,
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
  },
  blob: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: 26,
    fontFamily: HeadingFont.semiBold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  button: {
    width: '100%',
  },
});
