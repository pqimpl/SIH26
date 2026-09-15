import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { InstructionBanner } from '@/components/ui/instruction-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { recordGameScore } from '@/state/game-scores';

const SYMBOLS: { name: ComponentProps<typeof Ionicons>['name']; color: string }[] = [
  { name: 'flower', color: '#E4789B' },
  { name: 'flame', color: Colors.orange },
  { name: 'leaf', color: Colors.green },
  { name: 'star', color: Colors.purple },
  { name: 'moon', color: Colors.blue },
  { name: 'sunny', color: '#E0A526' },
  { name: 'heart', color: '#D9576B' },
  { name: 'paw', color: '#8B6F4E' },
];

const COLUMNS = 4;
const GRID_GAP = Spacing.two;
const MAX_BOARD_WIDTH = 360;
const MIN_MOVES = SYMBOLS.length;

function shuffledDeck() {
  const deck = [...SYMBOLS, ...SYMBOLS]
    .map((symbol, index) => ({ id: `${symbol.name}-${index}`, symbol }))
    .sort(() => Math.random() - 0.5);
  return deck;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function scoreForMoves(moves: number) {
  return Math.max(20, Math.min(100, 100 - (moves - MIN_MOVES) * 5));
}

export default function MemoryGame() {
  const { patient } = useAppState();
  const { width: windowWidth } = useWindowDimensions();
  const [deck, setDeck] = useState(shuffledDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const hasRecordedScore = useRef(false);

  const isSolved = matched.size === deck.length;

  const boardWidth = Math.min(windowWidth - Spacing.four * 2, MAX_BOARD_WIDTH);
  const tileSize = (boardWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    if (isSolved) return;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [isSolved]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [firstIndex, secondIndex] = flipped;
    setMoves((value) => value + 1);
    const isMatch = deck[firstIndex].symbol.name === deck[secondIndex].symbol.name;
    const timeout = setTimeout(() => {
      if (isMatch) {
        setMatched((prev) => new Set(prev).add(firstIndex).add(secondIndex));
      }
      setFlipped([]);
    }, 700);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  useEffect(() => {
    if (!isSolved || hasRecordedScore.current || !patient) return;
    hasRecordedScore.current = true;
    recordGameScore(patient.id, 'memory', scoreForMoves(moves), { moves, seconds });
  }, [isSolved, moves, seconds, patient]);

  const startNewGame = () => {
    setDeck(shuffledDeck());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    hasRecordedScore.current = false;
  };

  const onFlip = (index: number) => {
    if (flipped.length === 2) return;
    if (flipped.includes(index) || matched.has(index)) return;
    setFlipped((prev) => [...prev, index]);
  };

  const pairsFound = matched.size / 2;
  const totalPairs = SYMBOLS.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Memory Game" />
      <InstructionBanner text="Flip two cards at a time to find matching pairs. Clear the board in as few moves as you can." />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.grid, { width: boardWidth }]}>
          {deck.map((card, index) => {
            const isFaceUp = flipped.includes(index) || matched.has(index);
            return (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                onPress={() => onFlip(index)}
                style={[
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  isFaceUp ? styles.tileFaceUp : styles.tileFaceDown,
                  flipped.includes(index) && styles.tileActive,
                ]}>
                {isFaceUp ? (
                  <Ionicons name={card.symbol.name} size={tileSize * 0.4} color={card.symbol.color} />
                ) : (
                  <Ionicons name="leaf" size={tileSize * 0.36} color={Colors.mint} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.statsRow, { width: boardWidth }]}>
          <Stat label="Moves" value={String(moves)} />
          <Stat label="Matches" value={`${pairsFound}/${totalPairs}`} />
          <Stat label="Time" value={formatTime(seconds)} />
        </View>

        {isSolved && <Text style={styles.solvedText}>Wonderful! You matched them all. 🎉</Text>}

        <Button label="New Game" onPress={startNewGame} style={{ width: boardWidth }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.two,
  },
  tile: {
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFaceDown: {
    backgroundColor: Colors.primary,
    opacity: 0.85,
  },
  tileFaceUp: {
    backgroundColor: Colors.orangeSoft,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  tileActive: {
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.three,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  solvedText: {
    textAlign: 'center',
    fontFamily: Fonts?.sans,
    color: Colors.green,
    fontWeight: '600',
  },
});
