import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { signOut } from '../../auth';
import { localDb } from '../../db';
import { pendingCount, requestSync } from '../../sync';
import { EmptyState, PrimaryButton, Screen } from '../../ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Screen title={t('profile.title')}>
      <EmptyState message={t('profile.empty')} />
      {/* Moves to the account settings screen (spec: settings/account) once it is designed. */}
      <PrimaryButton
        variant="outline"
        label={t('auth.signOut')}
        loading={signingOut}
        onPress={() => {
          void (async () => {
            setSigningOut(true);
            // Last chance to send the changes of the phone: signing out deletes them.
            await requestSync();
            const pending = pendingCount(localDb);
            if (pending === 0) {
              await signOut();
              return;
            }
            setSigningOut(false);
            Alert.alert(
              t('auth.signOutPendingTitle'),
              t('auth.signOutPending', { count: pending }),
              [
                { text: t('auth.signOutCancel'), style: 'cancel' },
                {
                  text: t('auth.signOutAnyway'),
                  style: 'destructive',
                  onPress: () => {
                    setSigningOut(true);
                    void signOut();
                  },
                },
              ],
            );
          })();
        }}
      />
    </Screen>
  );
}
