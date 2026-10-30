import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Barcode, Plus, RotateCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import logo from '../../../assets/icon.png';
import {
  type AuthErrorKey,
  type AuthResult,
  googleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../../auth';
import { colors, control, radius, shadow, space } from '../../theme/tokens';
import { Card, IconTile, LinkButton, ListRow, PrimaryButton, Text } from '../../ui';

const LOGO_SIZE = 112;

type Provider = 'apple' | 'google';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // On success the session changes and the root layout leaves the sign-in screens.
  async function signIn(provider: Provider, action: () => Promise<AuthResult>) {
    setPending(provider);
    setError(null);
    const result = await action();
    setPending(null);
    if (result.status === 'error') setError(result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image
            accessibilityRole="image"
            accessibilityLabel={t('auth.appName')}
            source={logo}
            style={styles.logo}
          />
          <Text variant="display" align="center" accessibilityRole="header">
            {t('auth.wordmark')}
          </Text>
          <Text variant="lead" color="textMuted" align="center">
            {t('auth.tagline')}
          </Text>
        </View>

        <Card style={styles.features}>
          <ListRow
            title={t('auth.features.quickAdd')}
            leading={<IconTile icon={Plus} color="accent" background="accentSoft" />}
          />
          <ListRow
            separator
            title={t('auth.features.scan')}
            leading={<IconTile icon={Barcode} color="protein" background="proteinSoft" />}
          />
          <ListRow
            separator
            title={t('auth.features.adaptive')}
            leading={<IconTile icon={RotateCw} color="success" background="carbsSoft" />}
          />
        </Card>

        <View style={styles.actions}>
          {appleAvailable ? (
            // Apple's own button, as App Review expects: it draws "Continuer avec Apple" itself.
            <AppleAuthentication.AppleAuthenticationButton
              accessibilityRole="button"
              accessibilityLabel={t('auth.apple')}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={control.height / 2}
              style={styles.apple}
              onPress={() => {
                if (pending === null) void signIn('apple', signInWithApple);
              }}
            />
          ) : null}
          {googleSignInAvailable ? (
            <PrimaryButton
              variant="outline"
              label={t('auth.google')}
              loading={pending === 'google'}
              disabled={pending !== null && pending !== 'google'}
              onPress={() => void signIn('google', signInWithGoogle)}
            />
          ) : null}
          <LinkButton
            label={t('auth.email')}
            disabled={pending !== null}
            onPress={() => {
              router.push('/email');
            }}
          />
          {error ? (
            <Text variant="caption" color="danger" align="center" accessibilityRole="alert">
              {t(error)}
            </Text>
          ) : null}
        </View>

        <Text variant="caption" color="textMuted" align="center">
          {t('auth.legal.before')}
          <Text variant="caption" color="accent" style={styles.legalLink}>
            {t('auth.legal.terms')}
          </Text>
          {t('auth.legal.between')}
          <Text variant="caption" color="accent" style={styles.legalLink}>
            {t('auth.legal.privacy')}
          </Text>
          {t('auth.legal.after')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: space[24],
    paddingHorizontal: space.screen + space[4],
    paddingTop: space[24] * 2,
    paddingBottom: space[16],
  },
  brand: { alignItems: 'center', gap: space[12] },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.hero,
    boxShadow: shadow.logo,
    marginBottom: space[12],
  },
  features: { paddingVertical: space[4] },
  actions: { gap: space[12] },
  apple: { height: control.height },
  legalLink: { textDecorationLine: 'underline' },
});
