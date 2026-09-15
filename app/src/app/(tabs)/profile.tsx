import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaregiverAccountModal } from '@/components/caregiver-account-modal';
import { PatientProfileModal } from '@/components/patient-profile-modal';
import { Card } from '@/components/ui/card';
import { Colors, Fonts, HeadingFont, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { useAuth } from '@/state/auth-state';

export default function Profile() {
  const { session, signOut } = useAuth();
  const { caregiver, patient } = useAppState();
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.header}>Profile</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          {caregiver?.avatarUrl ? (
            <Image source={{ uri: caregiver.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={26} color={Colors.primary} />
            </View>
          )}
          <View style={styles.profileTextGroup}>
            <Text style={styles.name}>{caregiver?.displayName ?? 'Caregiver'}</Text>
            {session?.user.email && <Text style={styles.role}>{session.user.email}</Text>}
          </View>
        </Card>

        <Pressable accessibilityRole="button" onPress={() => setShowPatientModal(true)}>
          <Card style={styles.row}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>Patient Profile</Text>
              {patient && <Text style={styles.rowSubtitle}>{patient.name}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
          </Card>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => setShowCaregiverModal(true)}>
          <Card style={styles.row}>
            <Ionicons name="medkit-outline" size={20} color={Colors.primary} />
            <Text style={styles.rowLabel}>Caregiver Account</Text>
            <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
          </Card>
        </Pressable>

        <Card style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
        </Card>

        <Card style={styles.row}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowLabel}>Privacy & Data</Text>
          <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
        </Card>

        <Pressable accessibilityRole="button" onPress={signOut}>
          <Card style={styles.row}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={[styles.rowLabel, { color: Colors.danger }]}>Sign Out</Text>
          </Card>
        </Pressable>

        <Text style={styles.disclaimer}>
          Sudhi is a non-medical prototype and does not replace professional care.
        </Text>
      </ScrollView>

      <PatientProfileModal visible={showPatientModal} onClose={() => setShowPatientModal(false)} />
      <CaregiverAccountModal
        visible={showCaregiverModal}
        onClose={() => setShowCaregiverModal(false)}
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
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextGroup: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
  },
  role: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
