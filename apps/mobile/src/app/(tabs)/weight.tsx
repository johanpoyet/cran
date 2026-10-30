import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../ui';

export default function WeightScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('weight.title')}>
      <EmptyState message={t('weight.empty')} />
    </Screen>
  );
}
