import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { RhythmSound } from '@/state/rhythm-sounds';

const CLIP_SECONDS = 3;
const TRIM_STEP = 0.5;

type Props = {
  visible: boolean;
  onClose: () => void;
  sounds: RhythmSound[];
  onAdd: (
    uri: string,
    label: string,
    mimeType?: string | null,
    trimStart?: number
  ) => Promise<{ error: string | null }>;
  onRemove: (id: string) => Promise<{ error: string | null }>;
};

function SoundRow({ sound, onRemove }: { sound: RhythmSound; onRemove: (id: string) => void }) {
  const player = useAudioPlayer(sound.audioUrl);
  return (
    <View style={styles.soundRow}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          player.seekTo(sound.trimStart);
          player.play();
        }}
        style={styles.playButton}>
        <Ionicons name="play" size={16} color={Colors.onPrimary} />
      </Pressable>
      <Text style={styles.soundLabel}>{sound.label}</Text>
      <Pressable accessibilityRole="button" onPress={() => onRemove(sound.id)}>
        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
      </Pressable>
    </View>
  );
}

/**
 * Detects how long the picked file is, and — only when it's longer than the
 * 3-second clip we actually play — lets the caregiver choose which 3-second
 * window to use, with a live preview. We can't produce a shorter audio file
 * client-side without a native encoder (incompatible with Expo Go), so
 * "trimming" means storing a start offset and having playback stop itself
 * after 3 seconds, rather than editing the file.
 */
function SoundTrimmer({
  uri,
  trimStart,
  onTrimStartChange,
}: {
  uri: string;
  trimStart: number;
  onTrimStartChange: (value: number) => void;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  if (!status.isLoaded || status.duration <= CLIP_SECONDS) {
    return null;
  }

  const maxStart = Math.max(0, status.duration - CLIP_SECONDS);

  const preview = () => {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    player.seekTo(trimStart);
    player.play();
    stopTimeoutRef.current = setTimeout(() => player.pause(), CLIP_SECONDS * 1000);
  };

  return (
    <View style={styles.trimBlock}>
      <Text style={styles.trimHint}>
        This sound is {status.duration.toFixed(1)}s long — only 3 seconds play in the game. Choose
        which part to use.
      </Text>
      <View style={styles.trimRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Earlier start point"
          onPress={() => onTrimStartChange(Math.max(0, Number((trimStart - TRIM_STEP).toFixed(1))))}
          style={styles.trimStepButton}>
          <Ionicons name="remove" size={18} color={Colors.primary} />
        </Pressable>
        <Text style={styles.trimValue}>Starts at {trimStart.toFixed(1)}s</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Later start point"
          onPress={() => onTrimStartChange(Math.min(maxStart, Number((trimStart + TRIM_STEP).toFixed(1))))}
          style={styles.trimStepButton}>
          <Ionicons name="add" size={18} color={Colors.primary} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={preview} style={styles.trimPreviewButton}>
        <Ionicons name="play" size={14} color={Colors.primary} />
        <Text style={styles.trimPreviewText}>Preview these 3 seconds</Text>
      </Pressable>
    </View>
  );
}

export function RhythmSoundModal({ visible, onClose, sounds, onAdd, onRemove }: Props) {
  const [label, setLabel] = useState('');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMimeType, setPickedMimeType] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled || !result.assets[0]) return;
    setPickedUri(result.assets[0].uri);
    setPickedMimeType(result.assets[0].mimeType ?? null);
    setTrimStart(0);
    if (!label) setLabel(result.assets[0].name.replace(/\.[^.]+$/, ''));
  };

  const save = async () => {
    if (!pickedUri) {
      setError('Please choose a sound file.');
      return;
    }
    setIsSaving(true);
    const result = await onAdd(pickedUri, label.trim() || 'Sound', pickedMimeType, trimStart);
    setIsSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLabel('');
    setPickedUri(null);
    setPickedMimeType(null);
    setTrimStart(0);
    setError(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Manage Sounds</Text>
          <Text style={styles.subtitle}>
            Add at least 2 short sounds or tunes. Tune Match will use them as matching pairs.
          </Text>

          <FlatList
            data={sounds}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => <SoundRow sound={item} onRemove={onRemove} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No sounds added yet.</Text>}
          />

          <Pressable accessibilityRole="button" onPress={pickFile} style={styles.pickButton}>
            <Ionicons name="musical-notes-outline" size={18} color={Colors.primary} />
            <Text style={styles.pickButtonText}>{pickedUri ? 'Sound selected' : 'Choose a sound file'}</Text>
          </Pressable>

          {pickedUri && (
            <SoundTrimmer uri={pickedUri} trimStart={trimStart} onTrimStartChange={setTrimStart} />
          )}

          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Name this sound"
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button label={isSaving ? 'Adding...' : 'Add Sound'} onPress={save} disabled={isSaving} />
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 61, 62, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontFamily: HeadingFont.semiBold,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  list: {
    maxHeight: 180,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  pickButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.primary,
  },
  trimBlock: {
    backgroundColor: Colors.mintSoft,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  trimHint: {
    fontSize: 12.5,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    lineHeight: 17,
  },
  trimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  trimStepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimValue: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  trimPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trimPreviewText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    fontSize: 15,
  },
  error: {
    color: Colors.danger,
    fontFamily: Fonts?.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  done: {
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
