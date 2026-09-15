import { Redirect } from 'expo-router';

import { AppSplash } from '@/components/ui/app-splash';
import { useAppState } from '@/state/app-state';
import { useAuth } from '@/state/auth-state';

export default function StartGate() {
  const { session, isLoading } = useAuth();
  const { hasOnboarded } = useAppState();

  if (isLoading) {
    return <AppSplash />;
  }

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href={hasOnboarded ? '/(tabs)' : '/onboarding'} />;
}
