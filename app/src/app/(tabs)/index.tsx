import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

type Activity = {
  key: string;
  icon: ComponentProps<typeof Ionicons>['name'] | ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSet: 'ionicons' | 'material';
  iconBg: string;
  title: string;
  route: '/(tabs)/memory-game' | '/(tabs)/brain-exercise' | '/(tabs)/puzzle' | '/(tabs)/rhythm';
};

const ACTIVITIES: Activity[] = [
  {
    key: 'memory',
    icon: 'extension-puzzle-outline',
    iconSet: 'ionicons',
    iconBg: Colors.mintSoft,
    title: 'Memory Game',
    route: '/(tabs)/memory-game',
  },
  {
    key: 'brain',
    icon: 'brain',
    iconSet: 'material',
    iconBg: Colors.blueSoft,
    title: 'Brain Exercise',
    route: '/(tabs)/brain-exercise',
  },
  {
    key: 'puzzle',
    icon: 'leaf-outline',
    iconSet: 'ionicons',
    iconBg: Colors.orangeSoft,
    title: 'Mind & Memory',
    route: '/(tabs)/puzzle',
  },
  {
    key: 'rhythm',
    icon: 'musical-notes-outline',
    iconSet: 'ionicons',
    iconBg: '#EDE3F8',
    title: 'Tune Match',
    route: '/(tabs)/rhythm',
  },
];

function ActivityIcon({ activity }: { activity: Activity }) {
  if (activity.iconSet === 'material') {
    return (
      <MaterialCommunityIcons
        name={activity.icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={24}
        color={Colors.primary}
      />
    );
  }
  return (
    <Ionicons
      name={activity.icon as ComponentProps<typeof Ionicons>['name']}
      size={22}
      color={Colors.primary}
    />
  );
}

export default function Home() {
  const router = useRouter();
  const { patientName } = useAppState();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Ionicons name="menu-outline" size={24} color={Colors.primary} />
          <View style={styles.topBarRight}>
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
            <View style={styles.avatar} />
          </View>
        </View>

        <Text style={styles.greeting}>Hello, {patientName}</Text>
        <Text style={styles.subGreeting}>How are you feeling today?</Text>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/routine')}>
          <Card style={styles.checkInCard}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.mintSoft }]}>
              <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Daily Check-in</Text>
              <Text style={styles.rowSubtitle}>Track you mood and well-being</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
          </Card>
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Today&apos;s Plan</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/routine')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.activityRow}>
          {ACTIVITIES.map((activity) => (
            <Pressable
              key={activity.key}
              accessibilityRole="button"
              onPress={() => router.push(activity.route)}
              style={styles.activityCard}>
              <View style={[styles.activityIcon, { backgroundColor: activity.iconBg }]}>
                <ActivityIcon activity={activity} />
              </View>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityStart}>Start</Text>
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/caregiver-corner')}>
          <Card style={styles.checkInCard}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.blueSoft }]}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowTitle}>Caregiver Corner</Text>
              <Text style={styles.rowSubtitle}>Tips, guides & resources</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
          </Card>
        </Pressable>
      </ScrollView>

      <View style={styles.fabGroup} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Talk to Sudhi"
          onPress={() => router.push('/(tabs)/chat')}
          style={styles.fab}>
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.fabIcon}
            resizeMode="contain"
            tintColor={Colors.onPrimary}
          />
        </Pressable>
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
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.mintSoft,
  },
  greeting: {
    fontSize: 26,
    fontFamily: HeadingFont.semiBold,
    color: Colors.primary,
    marginTop: Spacing.two,
  },
  subGreeting: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
  },
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.primary,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  activityCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 6,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  activityStart: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: Colors.primary,
    fontWeight: '600',
  },
  fabGroup: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    width: 36,
    height: 36,
  },
});
