import 'i18next';

import type { resources } from './index';

// Typed translation keys: t('tabs.today') is checked at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['fr'];
  }
}
