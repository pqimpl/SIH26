import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { InstructionBanner } from '@/components/ui/instruction-banner';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { recordGameScore } from '@/state/game-scores';

type ShapeKind = 'circle' | 'square' | 'triangle' | 'star';

const SHAPE_COLORS: Record<ShapeKind, string> = {
  circle: Colors.primary,
  square: Colors.orange,
  triangle: Colors.green,
  star: Colors.purple,
};

const PATTERN_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle'];
const ALL_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'star'];
const SEQUENCE_LENGTH = 5;
const TOTAL_ROUNDS = 8;

function buildRound() {
  const unitLength = Math.random() < 0.5 ? 2 : 3;
  const unit = [...PATTERN_SHAPES].sort(() => Math.random() - 0.5).slice(0, unitLength);
  const sequence = Array.from({ length: SEQUENCE_LENGTH }, (_, index) => unit[index % unitLength]);
  const answer = unit[SEQUENCE_LENGTH % unitLength];

  const distractors = ALL_SHAPES.filter((shape) => shape !== answer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const choices = [answer, ...distractors].sort(() => Math.random() - 0.5);

  return { sequence, answer, choices };
}

function Shape({ kind, size = 32 }: { kind: ShapeKind; size?: number }) {
  const color = SHAPE_COLORS[kind];
  if (kind === 'circle') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
  }
  if (kind === 'square') {
    return <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: color }} />;
  }
  if (kind === 'triangle') {
    return (
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderBottomWidth: size,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    );
  }
  return <Text style={{ fontSize: size, color, lineHeight: size }}>★</Text>;
}

export default function BrainExercise() {
  const { patient } = useAppState();
  const [round, setRound] = useState(buildRound);
  const [selected, setSelected] = useState<ShapeKind | null>(null);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const isCorrect = selected === round.answer;

  const onSelect = (choice: ShapeKind) => {
    if (selected) return;
    setSelected(choice);
  };

  const onNextLevel = () => {
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const nextCompletedRounds = Math.min(completedRounds + 1, TOTAL_ROUNDS);

    if (nextCompletedRounds >= TOTAL_ROUNDS && patient) {
      recordGameScore(patient.id, 'brain_exercise', (nextCorrectCount / TOTAL_ROUNDS) * 100, {
        correct: nextCorrectCount,
        total: TOTAL_ROUNDS,
      });
      setCompletedRounds(0);
      setCorrectCount(0);
    } else {
      setCompletedRounds(nextCompletedRounds);
      setCorrectCount(nextCorrectCount);
    }
    setSelected(null);
    setRound(buildRound());
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Brain Exercise" />
      <InstructionBanner text="Look at the pattern, then choose the shape that comes next in the sequence." />
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Complete the sequence</Text>
        <Text style={styles.sectionSubtitle}>What will come next?</Text>

        <View style={styles.sequenceRow}>
          {round.sequence.map((shape, index) => (
            <View key={index} style={styles.sequenceSlot}>
              <Shape kind={shape} />
            </View>
          ))}
          <View style={[styles.sequenceSlot, styles.questionSlot]}>
            <Text style={styles.questionMark}>?</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, styles.chooseTitle]}>Choose your answer</Text>
        <View style={styles.choiceRow}>
          {round.choices.map((choice) => {
            const showAsCorrect = selected !== null && choice === round.answer;
            const showAsWrong = selected === choice && choice !== round.answer;
            return (
              <Pressable
                key={choice}
                accessibilityRole="button"
                onPress={() => onSelect(choice)}
                style={[
                  styles.choiceSlot,
                  showAsCorrect && styles.choiceCorrect,
                  showAsWrong && styles.choiceWrong,
                ]}>
                <Shape kind={choice} />
              </Pressable>
            );
          })}
        </View>

        {selected && (
          <Text style={[styles.feedback, { color: isCorrect ? Colors.green : Colors.textSecondary }]}>
            {isCorrect ? 'Great job! That’s right.' : `The answer was the ${round.answer}. Nice try!`}
          </Text>
        )}

        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressLabel}>{completedRounds}/{TOTAL_ROUNDS}</Text>
          </View>
          <ProgressBar progress={completedRounds / TOTAL_ROUNDS} />
        </View>

        <Button label="Next Level" onPress={onNextLevel} disabled={!selected} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: Colors.text,
  },
  chooseTitle: {
    marginTop: Spacing.two,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: -Spacing.two,
  },
  sequenceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
  },
  sequenceSlot: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionSlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 10,
  },
  questionMark: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  choiceSlot: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceCorrect: {
    borderColor: Colors.green,
    backgroundColor: Colors.mintSoft,
  },
  choiceWrong: {
    borderColor: Colors.danger,
  },
  feedback: {
    textAlign: 'center',
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  progressBlock: {
    gap: Spacing.one,
    marginTop: 'auto',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
  },
});
