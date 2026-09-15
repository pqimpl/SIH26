import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/state/auth-state';

export default function Auth() {
  const { session, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  if (session) {
    return <Redirect href="/" />;
  }

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUpWithPassword(email.trim(), password, displayName.trim());
        if (result.error) {
          setError(result.error);
        } else if (result.needsEmailConfirmation) {
          setPendingConfirmationEmail(email.trim());
        }
      } else {
        const result = await signInWithPassword(email.trim(), password);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingConfirmationEmail) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>Sudhi</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {pendingConfirmationEmail}. Open it, then come back here
            and sign in.
          </Text>
          <Button
            label="Back to sign in"
            variant="secondary"
            onPress={() => {
              setPendingConfirmationEmail(null);
              setMode('sign-in');
              setPassword('');
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>Sudhi</Text>
          <Text style={styles.title}>{isSignUp ? 'Create a caregiver account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Set up your account to configure activities and routines.'
              : 'Sign in to manage your patient profiles.'}
          </Text>

          <View style={styles.form}>
            {isSignUp && (
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="words"
                style={styles.input}
              />
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              style={styles.input}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            label={isSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            onPress={submit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />

          <Text
            style={styles.switchText}
            onPress={() => {
              setError(null);
              setMode(isSignUp ? 'sign-in' : 'sign-up');
            }}>
            {isSignUp ? 'Already have an account? Sign in' : "New here? Create a caregiver account"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  brand: {
    fontSize: 20,
    fontFamily: HeadingFont.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 24,
    fontFamily: HeadingFont.semiBold,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
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
    marginTop: Spacing.two,
  },
  submitButton: {
    marginTop: Spacing.three,
  },
  switchText: {
    fontFamily: Fonts?.sans,
    color: Colors.primary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
