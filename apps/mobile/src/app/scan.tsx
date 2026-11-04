import { MEAL_TYPES, mealForTime, type MealType } from '@cran/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionUserId } from '../auth';
import { localDb } from '../db';
import { type BarcodeScan, useBarcodeScan } from '../foods';
import { useKeyboardHeight } from '../lib/use-keyboard-height';
import { createFromScan, ProductPanel } from '../scan/product-panel';
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
  const params = useLocalSearchParams<{ meal?: string; ean?: string }>();
  const [meal] = useState<MealType>(() =>
    isMealType(params.meal) ? params.meal : mealForTime(new Date()),
  );
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const userId = useSessionUserId() ?? '';
  const { scan, onScanned, retry, rescan, refresh } = useBarcodeScan(localDb, userId, params.ean);

  // The code read is kept in the route: if iOS frees the screen while "Nouvel aliment" is open, it
  // comes back with the same product.
  const scannedEan = scan.status === 'scanning' ? '' : scan.ean;
  const routeEan = params.ean ?? '';
  useEffect(() => {
    if (scannedEan !== routeEan) router.setParams({ ean: scannedEan });
  }, [scannedEan, routeEan]);

  // Back from "Nouvel aliment": the food just created for this barcode replaces the answer. The
  // latest refresh is read from a ref: the focus effect must run on focus only.
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);
  const returning = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (returning.current) latestRefresh.current();
      returning.current = true;
    }, []),
  );
  const keyboardHeight = useKeyboardHeight();
  const typing = keyboardHeight > 0;
  const result = useRef<ScrollViewInstance>(null);

  // Grams typed in "Autre…": the sheet fills the space above the keyboard and shows its end, the
  // field and "Ajouter".
  useEffect(() => {
    if (typing) requestAnimationFrame(() => result.current?.scrollToEnd({ animated: true }));
  }, [typing]);

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
        // Touching the camera closes the keyboard. While it is open, there is no room for the frame.
        <Pressable
          accessible={false}
          onPress={() => {
            Keyboard.dismiss();
          }}
          style={styles.center}
        >
          {typing ? null : (
            <>
              <ScanFrame />
              <Text variant="lead" weight={400} color="onScanMuted" align="center">
                {t('scan.hint')}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {scan.status === 'scanning' ? null : (
        <View style={[styles.result, { paddingBottom: typing ? keyboardHeight : insets.bottom }]}>
          <ScrollView
            ref={result}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultContent}
          >
            <ScanResult scan={scan} meal={meal} typing={typing} onRetry={retry} onRescan={rescan} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ScanResult({
  scan,
  meal,
  typing,
  onRetry,
  onRescan,
}: {
  scan: Exclude<BarcodeScan, { status: 'scanning' }>;
  meal: MealType;
  /** The keyboard is open: the sheet keeps only what is needed to add. */
  typing: boolean;
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
      return <ProductPanel detail={scan.detail} meal={meal} compact={typing} onRescan={onRescan} />;
    case 'not_found':
      return (
        <View style={styles.found}>
          <Text accessibilityLiveRegion="polite">{t('scan.notFound', { ean: scan.ean })}</Text>
          <PrimaryButton
            label={t('scan.create')}
            onPress={() => {
              createFromScan(scan.ean);
            }}
          />
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
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[24],
    paddingHorizontal: space.screen,
  },
  // Shrinks, then scrolls, when the keyboard leaves less room than the sheet needs.
  result: {
    flexShrink: 1,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
  },
  resultContent: {
    paddingTop: space[24],
    paddingBottom: space[16],
    paddingHorizontal: space.screen,
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: touch.minSize },
  found: { gap: space[8] },
});
