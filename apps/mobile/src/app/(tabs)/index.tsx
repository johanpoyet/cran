import { formatDayLabel } from '@cran/shared';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../ui';

export default function TodayScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('today.title')} overline={formatDayLabel(new Date())}>
      <EmptyState message={t('today.empty')} />
    </Screen>
  );
}
