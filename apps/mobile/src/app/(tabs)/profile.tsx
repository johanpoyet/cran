import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { signOut } from '../../auth';
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
          setSigningOut(true);
          void signOut();
        }}
      />
    </Screen>
  );
}
