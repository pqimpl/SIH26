import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarPicker } from '@/components/ui/avatar-picker';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PatientProfileModal({ visible, onClose }: Props) {
  const { patient, savePatientProfile } = useAppState();
  const [name, setName] = useState('');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMimeType, setPickedMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(patient?.name ?? '');
      setPickedUri(null);
      setPickedMimeType(null);
      setError(null);
    }
  }, [visible, patient]);

  const save = async () => {
    if (!name.trim()) {
      setError("Please enter your patient's name.");
      return;
    }
    setIsSaving(true);
    const result = await savePatientProfile({
      name: name.trim(),
      imageUri: pickedUri ?? undefined,
      imageMimeType: pickedMimeType,
    });
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
          <Text style={styles.title}>{patient ? 'Edit Patient Profile' : 'Add Patient Profile'}</Text>
          <Text style={styles.subtitle}>
            This information personalizes activities and greetings for your patient.
          </Text>

          <AvatarPicker
            uri={pickedUri ?? patient?.avatarUrl ?? null}
            onPick={(uri, mimeType) => {
              setPickedUri(uri);
              setPickedMimeType(mimeType ?? null);
            }}
          />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Patient's name"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="words"
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button label={isSaving ? 'Saving...' : 'Save'} onPress={save} disabled={isSaving} />
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
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
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
    marginTop: -Spacing.two,
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
  cancel: {
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
