import { act, fireEvent, screen } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { ActionSheetIOS, Linking } from 'react-native';

import ScanScreen from './app/scan';
import { addEntries } from './journal/add-entries';
import { setSession, signedIn } from './test/fake-auth-client';
import { mockFetchFailure, mockFetchResponse } from './test/fetch';
import { skyr } from './test/foods';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/add-entries', () => ({ addEntries: jest.fn() }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
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

/** Opens the scan from the add sheet, as the barcode button does. */
async function openScan(meal = 'snack') {
  setSession(signedIn);
  await renderRouter({ index: () => null, add: () => null, scan: ScanScreen }, { initialUrl: '/' });
  await act(() => {
    router.push({ pathname: '/add', params: { meal } });
  });
  await act(() => {
    router.push({ pathname: '/scan', params: { meal } });
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

    expect(await screen.findByRole('header', { name: 'Skyr nature 0 %' })).toBeOnTheScreen();
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
    expect(await screen.findByRole('header', { name: 'Skyr nature 0 %' })).toBeOnTheScreen();
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

  it('closes back to the add sheet', async () => {
    await openScan();

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer le scan' }));

    expect(screen).toHavePathname('/add');
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

const userId = signedIn.data?.user.id;

/** Scans the skyr of the mockup (1 pot of 150 g) and waits for its sheet. */
async function scanSkyr(
  detail = { food: skyr, portions: [] as { label: string; grams: number }[] },
) {
  mockFetchResponse(200, detail);
  await openScan();
  await read(EAN);
  await screen.findByRole('header', { name: detail.food.name });
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('Feuille produit', () => {
  it('adds the serving to the meal of the add sheet in one touch after the detection', async () => {
    await scanSkyr();

    // Values of the mockup for 150 g.
    expect(button('1 portion · 150\u00a0g')).toBeSelected();
    expect(screen.getByLabelText('95\u00a0kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Protéines : 16,5 g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Glucides : 6 g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lipides : 0,3 g')).toBeOnTheScreen();
    expect(button('Ajouter à : Collation')).toBeOnTheScreen();

    await fireEvent.press(button('Ajouter · 95\u00a0kcal')); // the only touch

    expect(addEntries).toHaveBeenCalledWith(expect.anything(), userId, {
      mealType: 'snack',
      items: [{ food: skyr, grams: 150, portionLabel: '1 portion' }],
      at: expect.any(Date) as Date,
    });
    // Back to Today, past the add sheet.
    expect(screen).toHavePathname('/');
  });

  it('adds 100 g', async () => {
    await scanSkyr();

    await fireEvent.press(button('100 g'));
    await fireEvent.press(button('Ajouter · 63\u00a0kcal'));

    expect(jest.mocked(addEntries).mock.calls[0]?.[2].items).toEqual([
      { food: skyr, grams: 100, portionLabel: null },
    ]);
  });

  it('adds another quantity typed in grams', async () => {
    await scanSkyr();

    await fireEvent.press(button('Autre…'));
    const field = screen.getByLabelText('Quantité en grammes');
    await fireEvent.changeText(field, '0');
    expect(button(/^Ajouter ·/)).toBeDisabled();

    await fireEvent.changeText(field, '200');
    await fireEvent.press(button('Ajouter · 126\u00a0kcal'));

    expect(jest.mocked(addEntries).mock.calls[0]?.[2].items).toEqual([
      { food: skyr, grams: 200, portionLabel: null },
    ]);
  });

  it('offers the named portions of the user', async () => {
    await scanSkyr({ food: skyr, portions: [{ label: '1 bol', grams: 250 }] });

    await fireEvent.press(button('1 bol · 250\u00a0g'));
    await fireEvent.press(button(/^Ajouter ·/));

    expect(jest.mocked(addEntries).mock.calls[0]?.[2].items).toEqual([
      { food: skyr, grams: 250, portionLabel: '1 bol' },
    ]);
  });

  it('preselects 100 g without a serving', async () => {
    await scanSkyr({ food: { ...skyr, defaultPortionG: null }, portions: [] });

    expect(button('100 g')).toBeSelected();
    expect(screen.queryByText(/1 portion/)).toBeNull();
  });

  it('changes the meal', async () => {
    const sheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((options, callback) => {
        expect(options.options).toEqual(['Petit-déj', 'Déjeuner', 'Collation', 'Dîner', 'Annuler']);
        callback(3);
      });
    await scanSkyr();

    await fireEvent.press(button('Ajouter à : Collation'));
    expect(sheet).toHaveBeenCalled();
    await fireEvent.press(button(/^Ajouter ·/));

    expect(jest.mocked(addEntries).mock.calls[0]?.[2].mealType).toBe('dinner');
  });

  it('says when the entry could not be saved', async () => {
    jest.mocked(addEntries).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    await scanSkyr();

    await fireEvent.press(button(/^Ajouter ·/));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Les aliments n’ont pas pu être ajoutés. Réessaie.',
    );
    expect(screen).toHavePathname('/scan');
  });
});
