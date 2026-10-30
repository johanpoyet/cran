import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { EmptyState, Text } from '../ui';

// "Ajouter un aliment" sheet, opened by the + of the tab bar. Content arrives in S3.
export default function AddSheet() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="heading" weight={800} accessibilityRole="header">
          {t('add.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('add.close')}
          onPress={() => {
            router.back();
          }}
          style={styles.close}
        >
          <X size={20} color={colors.text} />
        </Pressable>
      </View>
      <EmptyState message={t('add.empty')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.screen, gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: touch.minSize,
    height: touch.minSize,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
