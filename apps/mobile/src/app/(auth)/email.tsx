import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type AuthErrorKey, signInWithEmail, signUpWithEmail } from '../../auth';
import { colors, space, touch } from '../../theme/tokens';
import { LinkButton, PrimaryButton, Text, TextField } from '../../ui';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'signIn' | 'signUp';

export default function EmailScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  const signUp = mode === 'signUp';
  const complete = email.trim().length > 0 && password.length >= (signUp ? MIN_PASSWORD_LENGTH : 1);

  // On success the session changes and the root layout leaves the sign-in screens.
  async function submit() {
    setPending(true);
    setError(null);
    const action = signUp ? signUpWithEmail : signInWithEmail;
    const result = await action(email.trim(), password);
    setPending(false);
    if (result.status === 'error') setError(result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.emailForm.back')}
            onPress={() => {
              router.back();
            }}
            style={styles.back}
          >
            <ChevronLeft color={colors.text} size={28} />
          </Pressable>

          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              {t('auth.emailForm.title')}
            </Text>
            <Text variant="body" color="textMuted">
              {t(signUp ? 'auth.emailForm.signUpSubtitle' : 'auth.emailForm.signInSubtitle')}
            </Text>
          </View>

          <View style={styles.fields}>
            <TextField
              label={t('auth.emailForm.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextField
              label={t('auth.emailForm.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={signUp ? 'new-password' : 'current-password'}
              textContentType={signUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (complete && !pending) void submit();
              }}
              {...(signUp ? { hint: t('auth.emailForm.passwordHint') } : {})}
            />
          </View>

          {error ? (
            <Text variant="label" weight={500} color="danger" accessibilityRole="alert">
              {t(error)}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={t(signUp ? 'auth.emailForm.signUp' : 'auth.emailForm.signIn')}
              disabled={!complete}
              loading={pending}
              onPress={() => void submit()}
            />
            <LinkButton
              label={t(signUp ? 'auth.emailForm.toSignIn' : 'auth.emailForm.toSignUp')}
              disabled={pending}
              onPress={() => {
                setMode(signUp ? 'signIn' : 'signUp');
                setError(null);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.screen, paddingBottom: space[24], gap: space[24] },
  back: {
    width: touch.minSize,
    height: touch.minSize,
    marginLeft: -space[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { gap: space[8] },
  fields: { gap: space[16] },
  actions: { gap: space[8] },
});
