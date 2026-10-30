import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../ui';

export default function JournalScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('journal.title')}>
      <EmptyState message={t('journal.empty')} />
    </Screen>
  );
}
