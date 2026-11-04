import { MEAL_TYPES, mealForTime, type MealType } from '@cran/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type BarcodeScan, useBarcodeScan } from '../foods';
import { ProductPanel } from '../scan/product-panel';
import { colors, radius, space, touch } from '../theme/tokens';
import { CameraButton, LinkButton, PrimaryButton, ScanFrame, Text } from '../ui';

/** Barcodes of food products (spec section 3). */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a'] as const;

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((meal) => meal === value);
}

// "Scan code-barres" (mockup 12): camera, aiming frame, torch, a vibration when a code is read, then
// the product sheet at the bottom (quantity, meal, "Ajouter").
export default function ScanScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ meal?: string }>();
  const [meal] = useState<MealType>(() =>
    isMealType(params.meal) ? params.meal : mealForTime(new Date()),
  );
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const { scan, onScanned, retry, rescan } = useBarcodeScan();

  // The system asks once; after a refusal, only the settings can give access back.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const granted = permission?.granted === true;
  const denied = permission !== null && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          {...(scan.status === 'scanning'
            ? {
                onBarcodeScanned: ({ data }: { data: string }) => {
                  onScanned(data);
                },
              }
            : {})}
        />
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + space[12] }]}>
        <CameraButton
          icon={X}
          label={t('scan.close')}
          onPress={() => {
            router.back();
          }}
        />
        {granted ? (
          <CameraButton
            icon={Zap}
            label={t('scan.torch')}
            value={torch}
            onPress={() => {
              setTorch((on) => !on);
            }}
          />
        ) : null}
      </View>

      {denied ? (
        <View style={styles.center}>
          <Text variant="heading" color="onScan" align="center" accessibilityRole="header">
            {t('scan.permissionTitle')}
          </Text>
          <Text color="onScanMuted" align="center">
            {t('scan.permissionText')}
          </Text>
          <PrimaryButton
            label={t('scan.openSettings')}
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        </View>
      ) : (
        <View style={styles.center}>
          <ScanFrame />
          <Text variant="lead" weight={400} color="onScanMuted" align="center">
            {t('scan.hint')}
          </Text>
        </View>
      )}

      {scan.status === 'scanning' ? null : (
        // Grams typed in "Autre…" must stay above the keyboard.
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.result, { paddingBottom: insets.bottom + space[16] }]}>
            <ScanResult scan={scan} meal={meal} onRetry={retry} onRescan={rescan} />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function ScanResult({
  scan,
  meal,
  onRetry,
  onRescan,
}: {
  scan: Exclude<BarcodeScan, { status: 'scanning' }>;
  meal: MealType;
  onRetry: () => void;
  onRescan: () => void;
}) {
  const { t } = useTranslation();
  const again = <LinkButton label={t('scan.again')} onPress={onRescan} />;

  switch (scan.status) {
    case 'loading':
      return (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.accent} />
          <Text color="textMuted">{t('scan.searching', { ean: scan.ean })}</Text>
        </View>
      );
    case 'found':
      return <ProductPanel detail={scan.detail} meal={meal} onRescan={onRescan} />;
    case 'not_found':
      return (
        <View style={styles.found}>
          <Text accessibilityLiveRegion="polite">{t('scan.notFound', { ean: scan.ean })}</Text>
          {again}
        </View>
      );
    case 'offline':
    case 'unavailable':
      return (
        <View style={styles.found}>
          <Text accessibilityLiveRegion="polite">{t(`scan.${scan.status}`)}</Text>
          <PrimaryButton label={t('scan.retry')} onPress={onRetry} />
          {again}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.scanBackdrop },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[24],
    paddingHorizontal: space.screen,
  },
  result: {
    paddingTop: space[24],
    paddingHorizontal: space.screen,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: touch.minSize },
  found: { gap: space[8] },
});
