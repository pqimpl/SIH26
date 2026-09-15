import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { GameType } from '@/lib/database.types';
import { useAppState } from '@/state/app-state';
import { Period, useProgressData } from '@/state/progress-data';

const PERIODS: Period[] = ['Week', 'Month', 'All Time'];

const GAME_ROWS: { type: GameType; label: string; color: string }[] = [
  { type: 'memory', label: 'Memory Games', color: Colors.green },
  { type: 'brain_exercise', label: 'Brain Exercises', color: Colors.blue },
  { type: 'puzzle', label: 'Mind & Memory', color: Colors.orange },
  { type: 'rhythm', label: 'Tune Match', color: Colors.purple },
];

function assessmentFor(overall: number | null) {
  if (overall === null) {
    return {
      label: 'Get Started',
      subtitle: 'Play an activity to see progress here.',
      color: Colors.textSecondary,
      bg: Colors.border,
      icon: 'sparkles-outline' as const,
    };
  }
  if (overall >= 75) {
    return {
      label: 'Good Progress',
      subtitle: 'Wonderful consistency! Keep it up.',
      color: Colors.green,
      bg: Colors.mintSoft,
      icon: 'happy-outline' as const,
    };
  }
  if (overall >= 45) {
    return {
      label: 'Okay Progress',
      subtitle: 'Steady going. A little more practice will help.',
      color: Colors.orange,
      bg: Colors.orangeSoft,
      icon: 'partly-sunny-outline' as const,
    };
  }
  return {
    label: 'Bad Progress',
    subtitle: 'No worries — try a short activity together today.',
    color: Colors.danger,
    bg: '#FBE7E0',
    icon: 'rainy-outline' as const,
  };
}

export default function Progress() {
  const { patient } = useAppState();
  const [period, setPeriod] = useState<Period>('Week');
  const { overall, byGame, streakDays, isLoading } = useProgressData(patient?.id ?? null, period);
  const assessment = assessmentFor(overall);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.header}>Progress</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          {PERIODS.map((option) => {
            const active = option === period;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setPeriod(option)}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}>
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.five }} />
        ) : (
          <>
            <Card style={styles.overallCard}>
              <View style={styles.overallText}>
                <Text style={styles.cardTitle}>Overall Progress</Text>
                <Text style={styles.cardSubtitle}>
                  {overall === null ? 'No activities played yet.' : 'Good job! Keep it up.'}
                </Text>
              </View>
              <ProgressRing progress={(overall ?? 0) / 100} color={Colors.green} />
            </Card>

            <Card style={{ gap: Spacing.three }}>
              <Text style={styles.cardTitle}>Activity Performance</Text>
              {GAME_ROWS.map((row) => (
                <PerformanceRow
                  key={row.type}
                  label={row.label}
                  value={byGame[row.type]}
                  color={row.color}
                />
              ))}
            </Card>

            <Card style={styles.streakCard}>
              <View style={styles.streakIcon}>
                <Ionicons name="flame" size={22} color={Colors.orange} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Best Streak</Text>
                <Text style={styles.streakValue}>{streakDays} Days</Text>
                <Text style={styles.cardSubtitle}>
                  {streakDays > 0 ? 'Keep going!' : 'Complete a routine today to start one.'}
                </Text>
              </View>
            </Card>

            <Card style={[styles.assessmentCard, { backgroundColor: assessment.bg }]}>
              <Ionicons name={assessment.icon} size={26} color={assessment.color} />
              <View style={styles.assessmentText}>
                <Text style={[styles.assessmentLabel, { color: assessment.color }]}>
                  {assessment.label}
                </Text>
                <Text style={styles.cardSubtitle}>{assessment.subtitle}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PerformanceRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <View style={{ gap: Spacing.one }}>
      <View style={styles.performanceLabelRow}>
        <Text style={styles.performanceLabel}>{label}</Text>
        <Text style={[styles.performanceValue, { color }]}>
          {value === null ? 'Not played yet' : `${Math.round(value)}%`}
        </Text>
      </View>
      <ProgressBar progress={(value ?? 0) / 100} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 20,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
    textAlign: 'center',
    paddingTop: Spacing.three,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.small,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: Colors.onPrimary,
  },
  overallCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  performanceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.text,
  },
  performanceValue: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    backgroundColor: Colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    fontSize: 20,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
  },
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  assessmentText: {
    flex: 1,
  },
  assessmentLabel: {
    fontSize: 15,
    fontFamily: HeadingFont.semiBold,
  },
});
