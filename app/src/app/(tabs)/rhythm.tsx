import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import { RhythmSoundModal } from '@/components/rhythm-sound-modal';
import { Button } from '@/components/ui/button';
import { InstructionBanner } from '@/components/ui/instruction-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { recordGameScore } from '@/state/game-scores';
import { RhythmSound, useRhythmSounds } from '@/state/rhythm-sounds';

const COLUMNS = 2;
const MAX_PAIRS = 6;
const TILE_SIZE = 76;
const TILE_GAP = Spacing.three;
const CLIP_SECONDS = 3;

type Card = { id: string; sound: RhythmSound };

function buildDeck(sounds: RhythmSound[]) {
  const pairCount = Math.min(sounds.length, MAX_PAIRS);
  const chosen = [...sounds].sort(() => Math.random() - 0.5).slice(0, pairCount);
  const deck: Card[] = [...chosen, ...chosen]
    .map((sound, index) => ({ id: `${sound.id}-${index}-${Math.random()}`, sound }))
    .sort(() => Math.random() - 0.5);
  return deck;
}

function tileCenter(index: number) {
  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  const x = col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
  const y = row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
  return { x, y };
}

function scoreForMoves(moves: number, pairCount: number) {
  return Math.max(20, Math.min(100, 100 - (moves - pairCount) * 6));
}

function RhythmTile({
  card,
  index,
  isFaceUp,
  isMatched,
  isWrong,
  onPress,
}: {
  card: Card;
  index: number;
  isFaceUp: boolean;
  isMatched: boolean;
  isWrong: boolean;
  onPress: () => void;
}) {
  const player = useAudioPlayer(card.sound.audioUrl);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sound tile ${index + 1}`}
      onPress={() => {
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        player.seekTo(card.sound.trimStart);
        player.play();
        stopTimeoutRef.current = setTimeout(() => player.pause(), CLIP_SECONDS * 1000);
        onPress();
      }}
      style={[
        styles.tile,
        isFaceUp || isMatched ? styles.tileFaceUp : styles.tileFaceDown,
        isWrong && styles.tileWrong,
        isMatched && styles.tileMatched,
      ]}>
      <Ionicons
        name={isFaceUp || isMatched ? 'musical-note' : 'leaf'}
        size={26}
        color={isFaceUp || isMatched ? Colors.purple : Colors.mint}
      />
    </Pressable>
  );
}

export default function RhythmGame() {
  const { patient } = useAppState();
  const { sounds, isLoading, addSound, removeSound } = useRhythmSounds(patient?.id ?? null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [showManager, setShowManager] = useState(false);
  const hasRecordedScore = useRef(false);

  useEffect(() => {
    if (sounds.length >= 2) {
      setDeck(buildDeck(sounds));
      setFlipped([]);
      setMatched(new Set());
      setMoves(0);
      hasRecordedScore.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds.length]);

  const pairCount = deck.length / 2;
  const isSolved = deck.length > 0 && matched.size === deck.length;

  useEffect(() => {
    if (!isSolved || hasRecordedScore.current || !patient) return;
    hasRecordedScore.current = true;
    recordGameScore(patient.id, 'rhythm', scoreForMoves(moves, pairCount), { moves, pairCount });
  }, [isSolved, moves, pairCount, patient]);

  const onFlip = (index: number) => {
    if (flipped.length === 2) return;
    if (flipped.includes(index) || matched.has(index)) return;
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const [firstIndex, secondIndex] = nextFlipped;
      setMoves((value) => value + 1);
      const isMatch = deck[firstIndex].sound.id === deck[secondIndex].sound.id;
      setTimeout(() => {
        if (isMatch) {
          setMatched((prev) => new Set(prev).add(firstIndex).add(secondIndex));
        } else {
          setWrongPair(nextFlipped);
          setTimeout(() => setWrongPair([]), 400);
        }
        setFlipped([]);
      }, 700);
    }
  };

  const newRound = () => {
    setDeck(buildDeck(sounds));
    setFlipped([]);
    setMatched(new Set());
    setWrongPair([]);
    setMoves(0);
    hasRecordedScore.current = false;
  };

  const gridWidth = COLUMNS * TILE_SIZE + (COLUMNS - 1) * TILE_GAP;
  const rowCount = Math.ceil(deck.length / COLUMNS);
  const gridHeight = deck.length > 0 ? rowCount * TILE_SIZE + (rowCount - 1) * TILE_GAP : 0;

  const matchedPairKeys = new Set<string>();
  deck.forEach((card, index) => {
    if (matched.has(index)) matchedPairKeys.add(card.sound.id);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Tune Match" />
      {sounds.length >= 2 && (
        <InstructionBanner text="Tap two tiles to hear their sounds. Find the two that sound the same to match them." />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : sounds.length < 2 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={40} color={Colors.primary} />
            <Text style={styles.emptyTitle}>Add some sounds to play</Text>
            <Text style={styles.emptySubtitle}>
              Upload at least two favorite tunes or sounds. Tune Match will turn them into a
              listening game.
            </Text>
            <Button
              label="Manage Sounds"
              onPress={() => setShowManager(true)}
              style={styles.emptyStateButton}
            />
          </View>
        ) : (
          <>

            <View style={[styles.gridWrapper, { width: gridWidth, height: gridHeight }]}>
              <Svg
                style={StyleSheet.absoluteFill}
                width={gridWidth}
                height={gridHeight}
                pointerEvents="none">
                {[...matchedPairKeys].map((soundId) => {
                  const indices = deck
                    .map((card, index) => ({ card, index }))
                    .filter(({ card }) => card.sound.id === soundId)
                    .map(({ index }) => index);
                  if (indices.length !== 2) return null;
                  const a = tileCenter(indices[0]);
                  const b = tileCenter(indices[1]);
                  return (
                    <Line
                      key={soundId}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={Colors.purple}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>
              <View style={styles.grid}>
                {deck.map((card, index) => (
                  <RhythmTile
                    key={card.id}
                    card={card}
                    index={index}
                    isFaceUp={flipped.includes(index)}
                    isMatched={matched.has(index)}
                    isWrong={wrongPair.includes(index)}
                    onPress={() => onFlip(index)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.movesText}>Moves: {moves}</Text>
              <Text style={styles.movesText}>
                Matched: {matched.size / 2}/{pairCount}
              </Text>
            </View>

            {isSolved && <Text style={styles.solvedText}>Lovely listening! All matched. 🎉</Text>}

            <Button label="Next Level" onPress={newRound} style={{ width: gridWidth }} />
            <Pressable accessibilityRole="button" onPress={() => setShowManager(true)}>
              <Text style={styles.manageLink}>Manage Sounds</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <RhythmSoundModal
        visible={showManager}
        onClose={() => setShowManager(false)}
        sounds={sounds}
        onAdd={addSound}
        onRemove={removeSound}
      />
    </SafeAreaView>
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
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  loading: {
    marginTop: Spacing.six,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  emptyStateButton: {
    width: 220,
  },
  gridWrapper: {
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
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
    borderColor: Colors.purple,
  },
  tileMatched: {
    backgroundColor: Colors.mintSoft,
    borderWidth: 2,
    borderColor: Colors.green,
  },
  tileWrong: {
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  movesText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
  },
  solvedText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.green,
    textAlign: 'center',
  },
  manageLink: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.primary,
  },
});
