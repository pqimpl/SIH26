import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ComponentProps, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { CelebrationBurst } from '@/components/ui/celebration-burst';
import { RoutineModal } from '@/components/routine-modal';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { RoutineItem, useRoutineItems } from '@/state/routine-data';

function formatTime(value: string | null) {
  if (!value) return 'Anytime';
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function Routine() {
  const { patient } = useAppState();
  const { items, isLoading, toggleCompletion, addRoutine, updateRoutine, deleteRoutine } =
    useRoutineItems(patient?.id ?? null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
  const [celebrations, setCelebrations] = useState<Record<string, number>>({});

  const completedCount = items.filter((item) => item.done).length;

  const handleToggle = async (item: RoutineItem) => {
    if (!item.done) {
      setCelebrations((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    }
    await toggleCompletion(item);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEditModal = (item: RoutineItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Text style={styles.header}>Today&apos;s Routine</Text>
        <View style={styles.emptyState}>
          <Ionicons name="person-add-outline" size={40} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Add a patient profile first</Text>
          <Text style={styles.emptySubtitle}>
            Set up your patient in the Profile tab to start building their daily routine.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.header}>Today&apos;s Routine</Text>
      <Text style={styles.subheader}>
        {completedCount} of {items.length} completed
      </Text>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => (
          <Card key={item.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openEditModal(item)}
              style={styles.rowMain}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={item.icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.textGroup}>
                <Text style={[styles.title, item.done && styles.titleDone]}>{item.title}</Text>
                <Text style={styles.time}>{formatTime(item.scheduledTime)}</Text>
              </View>
            </Pressable>
            <View style={styles.checkboxWrapper}>
              <CelebrationBurst triggerKey={celebrations[item.id] ?? 0} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark ${item.title} as ${item.done ? 'not done' : 'done'}`}
                onPress={() => handleToggle(item)}
                style={[styles.checkbox, item.done && styles.checkboxDone]}>
                {item.done && <Ionicons name="checkmark" size={18} color={Colors.onPrimary} />}
              </Pressable>
            </View>
          </Card>
        ))}

        {!isLoading && items.length === 0 && (
          <Text style={styles.emptyListText}>No routines yet. Add the first one below.</Text>
        )}

        <Pressable accessibilityRole="button" onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add Routine</Text>
        </Pressable>
      </ScrollView>

      <RoutineModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingItem={editingItem}
        onSave={(input) =>
          editingItem ? updateRoutine(editingItem.id, input) : addRoutine(input)
        }
        onDelete={deleteRoutine}
      />
    </SafeAreaView>
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
  subheader: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
  },
  titleDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  time: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkboxWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyListText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
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
  },
});
