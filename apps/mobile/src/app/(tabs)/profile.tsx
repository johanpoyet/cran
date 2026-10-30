import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('profile.title')}>
      <EmptyState message={t('profile.empty')} />
    </Screen>
  );
}
