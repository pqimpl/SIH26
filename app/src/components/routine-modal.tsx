import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ComponentProps, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { RoutineItem } from '@/state/routine-data';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_CHOICES: IconName[] = [
  'tooth-outline',
  'water-outline',
  'food-apple-outline',
  'coffee-outline',
  'pill',
  'walk',
  'shower-head',
  'phone-outline',
  'weather-sunny',
  'bed-outline',
  'book-open-outline',
  'music-note-outline',
  'account-group-outline',
  'checkbox-marked-circle-outline',
];

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

const TIME_PRESETS: { key: TimeOfDay; label: string; value: string | null }[] = [
  { key: 'morning', label: 'Morning', value: '08:00:00' },
  { key: 'afternoon', label: 'Afternoon', value: '13:00:00' },
  { key: 'evening', label: 'Evening', value: '18:00:00' },
  { key: 'anytime', label: 'Anytime', value: null },
];

function presetForTime(value: string | null): TimeOfDay {
  const match = TIME_PRESETS.find((preset) => preset.value === value);
  return match?.key ?? 'anytime';
}

type Props = {
  visible: boolean;
  onClose: () => void;
  editingItem: RoutineItem | null;
  onSave: (input: { title: string; icon: string; scheduledTime: string | null }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
};

export function RoutineModal({ visible, onClose, editingItem, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<IconName>('checkbox-marked-circle-outline');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(editingItem?.title ?? '');
      setIcon((editingItem?.icon as IconName) ?? 'checkbox-marked-circle-outline');
      setTimeOfDay(presetForTime(editingItem?.scheduledTime ?? null));
      setError(null);
    }
  }, [visible, editingItem]);

  const save = async () => {
    if (!title.trim()) {
      setError('Please enter a name for this routine.');
      return;
    }
    const scheduledTime = TIME_PRESETS.find((preset) => preset.key === timeOfDay)?.value ?? null;
    setIsSaving(true);
    const result = await onSave({ title: title.trim(), icon, scheduledTime });
    setIsSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  const remove = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    const result = await onDelete(editingItem.id);
    setIsSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{editingItem ? 'Edit Routine' : 'Add Routine'}</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Take a walk"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="sentences"
            style={styles.input}
          />

          <Text style={styles.label}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {ICON_CHOICES.map((choice) => {
              const selected = choice === icon;
              return (
                <Pressable
                  key={choice}
                  accessibilityRole="button"
                  onPress={() => setIcon(choice)}
                  style={[styles.iconOption, selected && styles.iconOptionSelected]}>
                  <MaterialCommunityIcons
                    name={choice}
                    size={22}
                    color={selected ? Colors.onPrimary : Colors.primary}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>When</Text>
          <View style={styles.timeRow}>
            {TIME_PRESETS.map((preset) => {
              const selected = preset.key === timeOfDay;
              return (
                <Pressable
                  key={preset.key}
                  accessibilityRole="button"
                  onPress={() => setTimeOfDay(preset.key)}
                  style={[styles.timeChip, selected && styles.timeChipSelected]}>
                  <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button label={isSaving ? 'Saving...' : 'Save'} onPress={save} disabled={isSaving} />

          {editingItem && (
            <Pressable accessibilityRole="button" onPress={remove} disabled={isSaving}>
              <Text style={styles.delete}>Delete Routine</Text>
            </Pressable>
          )}

          <Pressable accessibilityRole="button" onPress={onClose} disabled={isSaving}>
            <Text style={styles.cancel}>Cancel</Text>
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
    marginBottom: Spacing.one,
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
  label: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.one,
  },
  iconRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  timeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  timeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
  },
  timeChipTextSelected: {
    color: Colors.onPrimary,
  },
  error: {
    color: Colors.danger,
    fontFamily: Fonts?.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  delete: {
    fontFamily: Fonts?.sans,
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  cancel: {
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
