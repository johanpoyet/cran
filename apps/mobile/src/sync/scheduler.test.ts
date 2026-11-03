import type { LocalDatabase } from '../db/types';
import { ApiError } from '../lib/api';
import { Sentry } from '../lib/sentry';
import { syncNow } from './engine';
import { pendingCount } from './queue';
import { requestSync, setSyncDatabase } from './scheduler';
import { useSyncState } from './store';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));
jest.mock('./engine', () => ({ syncNow: jest.fn() }));
jest.mock('./queue', () => ({ pendingCount: jest.fn(() => 0) }));

const db = {} as LocalDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  setSyncDatabase(db);
  useSyncState.setState({ status: 'idle', pending: 0, lastSyncedAt: null });
  jest.mocked(syncNow).mockResolvedValue({ pushed: 0, pulled: 0 });
});

describe('requestSync', () => {
  it('synchronises and records the time and what is left to send', async () => {
    jest.mocked(pendingCount).mockReturnValue(2);

    await requestSync();

    expect(syncNow).toHaveBeenCalledWith(db);
    expect(useSyncState.getState()).toMatchObject({ status: 'idle', pending: 2 });
    expect(useSyncState.getState().lastSyncedAt).toBeInstanceOf(Date);
  });

  it('runs once more when asked during a synchronisation, not once per request', async () => {
    let finish: () => void = () => undefined;
    jest.mocked(syncNow).mockImplementationOnce(
      () =>
        new Promise(
          (resolve) =>
            (finish = () => {
              resolve({ pushed: 0, pulled: 0 });
            }),
        ),
    );

    const first = requestSync();
    void requestSync();
    void requestSync();
    finish();
    await first;

    expect(syncNow).toHaveBeenCalledTimes(2);
  });

  it('is offline when the server cannot be reached', async () => {
    jest.mocked(syncNow).mockRejectedValue(new TypeError('Network request failed'));

    await requestSync();

    expect(useSyncState.getState().status).toBe('offline');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports an error answered by the server', async () => {
    jest.mocked(syncNow).mockRejectedValue(new ApiError(500, 'internal_error'));

    await requestSync();

    expect(useSyncState.getState().status).toBe('error');
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('does nothing when signed out', async () => {
    setSyncDatabase(null);

    await requestSync();

    expect(syncNow).not.toHaveBeenCalled();
  });
});
