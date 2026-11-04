import { act, fireEvent, screen } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import ScanScreen from './app/scan';
import { setSession, signedIn } from './test/fake-auth-client';
import { mockFetchFailure, mockFetchResponse } from './test/fetch';
import { skyr } from './test/foods';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

interface CameraProps {
  enableTorch?: boolean;
  onBarcodeScanned?: (result: { data: string }) => void;
  children?: ReactNode;
}

// The camera is native: a view that keeps its props, so that tests can "read" a code.
let camera: CameraProps | null = null;
jest.mock('expo-camera', () => ({
  CameraView: (props: CameraProps) => {
    camera = props;
    return null;
  },
  useCameraPermissions: jest.fn(),
}));

const requestPermission = jest.fn();

function permission(granted: boolean, canAskAgain = true) {
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' } as never,
      requestPermission,
      jest.fn(),
    ]);
}

const EAN = '3033490004743';

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  camera = null;
  permission(true);
});

async function openScan() {
  setSession(signedIn);
  await renderRouter({ index: () => null, scan: ScanScreen }, { initialUrl: '/' });
  await act(() => {
    router.push('/scan');
  });
  await screen.findByText('Vise le code-barres du produit');
}

/** The camera reads a code, as it does several times a second while the code is in view. */
async function read(code: string) {
  await act(async () => {
    camera?.onBarcodeScanned?.({ data: code });
    await Promise.resolve();
  });
}

describe('Scan code-barres', () => {
  it('reads a code once, vibrates and shows the product', async () => {
    const fetch = mockFetchResponse(200, { food: skyr, portions: [] });
    await openScan();

    await read(EAN);
    await read(EAN);

    expect(await screen.findByText('Skyr nature 0 % · Siggi’s')).toBeOnTheScreen();
    expect(screen.getByText('Trouvé sur Open Food Facts')).toBeOnTheScreen();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toMatch(new RegExp(`/v1/foods/barcode/${EAN}$`));
    // Scanning stops until the user asks for another product.
    expect(camera?.onBarcodeScanned).toBeUndefined();
  });

  it('ignores a code that is not a valid EAN', async () => {
    const fetch = mockFetchResponse(200, { food: skyr, portions: [] });
    await openScan();

    await read('3033490004744');

    expect(fetch).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(camera?.onBarcodeScanned).toBeDefined();
  });

  it('says when the product is unknown, and scans again on demand', async () => {
    mockFetchResponse(404, { error: { code: 'not_found', message: 'Product not found' } });
    await openScan();

    await read(EAN);
    expect(
      await screen.findByText(`Produit introuvable sur Open Food Facts (${EAN}).`),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Scanner un autre produit' }));
    expect(camera?.onBarcodeScanned).toBeDefined();
    expect(screen.queryByText(/Produit introuvable/)).toBeNull();
  });

  it('offers to try again without network', async () => {
    mockFetchFailure();
    await openScan();

    await read(EAN);
    expect(
      await screen.findByText(
        'Pas de réseau : le produit ne peut pas être cherché pour l’instant.',
      ),
    ).toBeOnTheScreen();

    // Same spy: the failed call, then the new try.
    const fetch = mockFetchResponse(200, { food: skyr, portions: [] });
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Skyr nature 0 % · Siggi’s')).toBeOnTheScreen();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('says when Open Food Facts does not answer', async () => {
    mockFetchResponse(503, { error: { code: 'off_unavailable', message: 'Unavailable' } });
    await openScan();

    await read(EAN);

    expect(
      await screen.findByText('Open Food Facts ne répond pas. Réessaie dans un instant.'),
    ).toBeOnTheScreen();
  });

  it('switches the torch on and off', async () => {
    await openScan();
    const torch = screen.getByRole('switch', { name: 'Lampe' });
    expect(torch).not.toBeChecked();

    await fireEvent.press(torch);

    expect(screen.getByRole('switch', { name: 'Lampe' })).toBeChecked();
    expect(camera?.enableTorch).toBe(true);
  });

  it('closes', async () => {
    await openScan();

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer le scan' }));

    expect(screen).toHavePathname('/');
  });

  it('asks for the camera the first time', async () => {
    permission(false, true);
    await openScan();

    expect(requestPermission).toHaveBeenCalled();
    expect(camera).toBeNull();
  });

  it('sends to the settings when the camera was refused', async () => {
    permission(false, false);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    setSession(signedIn);
    await renderRouter({ index: () => null, scan: ScanScreen }, { initialUrl: '/scan' });

    expect(
      await screen.findByRole('header', { name: 'Cran n’a pas accès à l’appareil photo' }),
    ).toBeOnTheScreen();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.queryByRole('switch', { name: 'Lampe' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir les réglages' }));
    expect(openSettings).toHaveBeenCalled();
  });
});
