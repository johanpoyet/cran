import { StyleSheet } from 'react-native';

import { space } from '../theme/tokens';
import { Card } from './card';
import { Text } from './text';

export function EmptyState({ message }: { message: string }) {
  return (
    <Card style={styles.card}>
      <Text variant="body" color="textMuted" align="center">
        {message}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[24] },
});
