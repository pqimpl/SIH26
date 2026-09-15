import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/state/auth-state';

const RESOURCES: {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  title: string;
  subtitle: string;
}[] = [
  {
    icon: 'map-outline',
    iconBg: Colors.blueSoft,
    title: 'Understanding Memory Loss',
    subtitle: 'Learn the basics',
  },
  {
    icon: 'chatbubbles-outline',
    iconBg: Colors.mintSoft,
    title: 'Communication Guide',
    subtitle: 'Tips to connect better',
  },
  {
    icon: 'person-outline',
    iconBg: Colors.orangeSoft,
    title: 'Care Strategies',
    subtitle: 'Practical daily strategies',
  },
  {
    icon: 'people-outline',
    iconBg: '#EDE3F8',
    title: 'Find Support',
    subtitle: 'Communities and resources',
  },
];

export default function CaregiverCorner() {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Caregiver Corner" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.tipCard}>
          <View style={styles.tipText}>
            <Text style={styles.tipTitle}>Daily Tip</Text>
            <Text style={styles.tipBody}>
              Encourage a routine. Consistency helps reduce confusion and improves memory.
            </Text>
          </View>
          <Ionicons name="bulb-outline" size={28} color={Colors.orange} />
        </Card>

        {RESOURCES.map((resource) => (
          <Card key={resource.title} style={styles.resourceRow}>
            <View style={[styles.resourceIcon, { backgroundColor: resource.iconBg }]}>
              <Ionicons name={resource.icon} size={18} color={Colors.primary} />
            </View>
            <View style={styles.resourceTextGroup}>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourceSubtitle}>{resource.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
          </Card>
        ))}
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.mintSoft,
    borderColor: Colors.mintSoft,
  },
  tipText: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  tipTitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: Colors.text,
  },
  tipBody: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceTextGroup: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
  },
  resourceSubtitle: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
