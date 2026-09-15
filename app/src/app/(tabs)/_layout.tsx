import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/state/auth-state';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  routine: 'walk-outline',
  progress: 'stats-chart-outline',
  chat: 'mic-outline',
  profile: 'person-outline',
};

export default function TabsLayout() {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 78,
          paddingBottom: 14,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts?.sans,
          fontSize: 11,
          lineHeight: 14,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? 'ellipse-outline'} size={size ?? 20} color={color} />
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="routine" options={{ title: 'Routine' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="chat" options={{ title: 'Sudhi' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="memory-game" options={{ href: null }} />
      <Tabs.Screen name="brain-exercise" options={{ href: null }} />
      <Tabs.Screen name="puzzle" options={{ href: null }} />
      <Tabs.Screen name="rhythm" options={{ href: null }} />
    </Tabs>
  );
}
