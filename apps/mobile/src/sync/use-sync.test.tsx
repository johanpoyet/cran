import { act, renderHook } from '@testing-library/react-native';
import { addNetworkStateListener } from 'expo-network';
import { AppState } from 'react-native';

import { notifyLocalChange } from '../db/changes';
import type { LocalDatabase } from '../db/types';
import { refreshPendingCount, requestSync, setSyncDatabase } from './scheduler';
import { SYNC_AFTER_CHANGE_MS, SYNC_INTERVAL_MS, useSync } from './use-sync';

jest.mock('./scheduler', () => ({
  requestSync: jest.fn(() => Promise.resolve()),
  refreshPendingCount: jest.fn(() => 1),
  setSyncDatabase: jest.fn(),
}));
jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const db = {} as LocalDatabase;

/** Runs `run` in an asynchronous act: a synchronous act moving fake timers breaks later renders. */
async function inAct(run: () => void): Promise<void> {
  await act(() => {
    run();
    return Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSync', () => {
  it('synchronises at launch, then every 5 minutes', async () => {
    await renderHook(() => {
      useSync(db, true);
    });
    expect(setSyncDatabase).toHaveBeenCalledWith(db);
    expect(requestSync).toHaveBeenCalledTimes(1);

    await inAct(() => {
      jest.advanceTimersByTime(SYNC_INTERVAL_MS);
    });
    expect(requestSync).toHaveBeenCalledTimes(2);
  });

  it('synchronises a few seconds after a local change, once for several changes', async () => {
    await renderHook(() => {
      useSync(db, true);
    });
    jest.mocked(requestSync).mockClear();

    await inAct(() => {
      notifyLocalChange();
      notifyLocalChange();
    });
    await inAct(() => {
      jest.advanceTimersByTime(SYNC_AFTER_CHANGE_MS);
    });

    expect(requestSync).toHaveBeenCalledTimes(1);
  });

  it('waits for a real change: pulled rows leave nothing to send', async () => {
    jest.mocked(refreshPendingCount).mockReturnValue(0);
    await renderHook(() => {
      useSync(db, true);
    });
    jest.mocked(requestSync).mockClear();

    await inAct(() => {
      notifyLocalChange();
      jest.advanceTimersByTime(SYNC_AFTER_CHANGE_MS);
    });

    expect(requestSync).not.toHaveBeenCalled();
  });

  it('synchronises when the network comes back and back in the foreground', async () => {
    const appState = jest.spyOn(AppState, 'addEventListener');
    await renderHook(() => {
      useSync(db, true);
    });
    jest.mocked(requestSync).mockClear();
    const onNetwork = jest.mocked(addNetworkStateListener).mock.calls[0]?.[0];
    const onAppState = appState.mock.calls[0]?.[1];

    await inAct(() => {
      onNetwork?.({ isConnected: false, isInternetReachable: false });
      onNetwork?.({ isConnected: true, isInternetReachable: true });
      onAppState?.('active');
    });

    expect(requestSync).toHaveBeenCalledTimes(2);
  });

  it('does nothing while signed out, and stops at sign-out', async () => {
    const { rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useSync(db, enabled);
      },
      { initialProps: { enabled: false } },
    );
    expect(requestSync).not.toHaveBeenCalled();

    await rerender({ enabled: true });
    await rerender({ enabled: false });

    expect(setSyncDatabase).toHaveBeenLastCalledWith(null);
  });
});
