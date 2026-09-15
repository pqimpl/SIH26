import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { InstructionBanner } from '@/components/ui/instruction-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { recordGameScore } from '@/state/game-scores';
import { usePuzzleImage } from '@/state/puzzle-image';

const GRID_SIZE = 4;
const BOARD_PIXELS = 300;
const TILE_PIXELS = BOARD_PIXELS / GRID_SIZE;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const MIN_MOVES = 12;

function shuffledPositions() {
  const positions = Array.from({ length: TILE_COUNT }, (_, index) => index);
  do {
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
  } while (positions.every((value, index) => value === index));
  return positions;
}

function scoreForMoves(moves: number) {
  return Math.max(20, Math.min(100, 100 - (moves - MIN_MOVES) * 4));
}

function CroppedTile({
  imageUrl,
  originalIndex,
  size,
}: {
  imageUrl: string;
  originalIndex: number;
  size: number;
}) {
  const row = Math.floor(originalIndex / GRID_SIZE);
  const col = originalIndex % GRID_SIZE;
  const scale = size / TILE_PIXELS;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: BOARD_PIXELS * scale,
          height: BOARD_PIXELS * scale,
          marginLeft: -col * TILE_PIXELS * scale,
          marginTop: -row * TILE_PIXELS * scale,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

export default function Puzzle() {
  const { patient } = useAppState();
  const { imageUrl, isLoading, uploadPuzzleImage } = usePuzzleImage(patient?.id ?? null);
  const [positions, setPositions] = useState(shuffledPositions);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRecordedScore = useRef(false);

  const isSolved = positions.every((value, index) => value === index);

  const onTapTile = (slotIndex: number) => {
    if (isSolved) return;
    if (selected === null) {
      setSelected(slotIndex);
      return;
    }
    if (selected === slotIndex) {
      setSelected(null);
      return;
    }
    setPositions((prev) => {
      const next = [...prev];
      [next[selected], next[slotIndex]] = [next[slotIndex], next[selected]];
      return next;
    });
    setMoves((value) => value + 1);
    setSelected(null);
  };

  const resetBoard = () => {
    setPositions(shuffledPositions());
    setSelected(null);
    setMoves(0);
    hasRecordedScore.current = false;
  };

  useEffect(() => {
    if (!isSolved || hasRecordedScore.current || !patient) return;
    hasRecordedScore.current = true;
    recordGameScore(patient.id, 'puzzle', scoreForMoves(moves), { moves });
  }, [isSolved, moves, patient]);

  const pickAndUpload = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    const saveResult = await uploadPuzzleImage(result.assets[0].uri, result.assets[0].mimeType);
    setIsUploading(false);
    if (saveResult.error) {
      setError(saveResult.error);
      return;
    }
    resetBoard();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Mind & Memory" />
      {Boolean(imageUrl) && (
        <InstructionBanner text="Tap two tiles to swap their places. Keep swapping until the picture is back together." />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : !imageUrl ? (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={40} color={Colors.primary} />
            <Text style={styles.emptyTitle}>Add a photo to begin</Text>
            <Text style={styles.emptySubtitle}>
              Choose a favorite photo of your patient. We&apos;ll turn it into a gentle puzzle.
            </Text>
            <Button
              label={isUploading ? 'Uploading...' : 'Choose Photo'}
              onPress={pickAndUpload}
              disabled={isUploading}
              style={styles.emptyStateButton}
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        ) : (
          <>
            <View style={styles.boardFrame}>
              <View style={styles.boardGrid}>
                {positions.map((originalIndex, slotIndex) => (
                  <Pressable
                    key={slotIndex}
                    accessibilityRole="button"
                    onPress={() => onTapTile(slotIndex)}
                    style={[styles.tile, selected === slotIndex && styles.tileSelected]}>
                    <CroppedTile imageUrl={imageUrl} originalIndex={originalIndex} size={TILE_PIXELS} />
                  </Pressable>
                ))}
              </View>
            </View>

            {isSolved && (
              <Text style={styles.solvedText}>Beautifully done! The picture is complete. 🎉</Text>
            )}

            <View style={styles.statsRow}>
              <Text style={styles.movesText}>Moves: {moves}</Text>
              <Pressable accessibilityRole="button" onPress={pickAndUpload} disabled={isUploading}>
                <Text style={styles.changePhoto}>{isUploading ? 'Uploading...' : 'Change Photo'}</Text>
              </Pressable>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}

            <Button label="Next Level" onPress={resetBoard} style={{ width: BOARD_PIXELS }} />
          </>
        )}
      </ScrollView>
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
  boardFrame: {
    borderWidth: 3,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.large,
    padding: Spacing.one,
    backgroundColor: Colors.surface,
  },
  boardGrid: {
    width: BOARD_PIXELS,
    height: BOARD_PIXELS,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  tile: {
    width: TILE_PIXELS,
    height: TILE_PIXELS,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: Colors.danger,
  },
  solvedText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.green,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: BOARD_PIXELS,
  },
  movesText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
  },
  changePhoto: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.primary,
  },
  error: {
    color: Colors.danger,
    fontFamily: Fonts?.sans,
    fontSize: 13,
    textAlign: 'center',
  },
});
