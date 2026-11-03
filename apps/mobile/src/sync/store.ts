import { create } from 'zustand';

/** "offline": the last attempt could not reach the server; "error": the server refused it. */
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  /** Changes of the phone not yet accepted by the server. */
  pending: number;
  lastSyncedAt: Date | null;
}

/** State shown by the discreet indicator of "Ta journée" (spec S4-3). */
export const useSyncState = create<SyncState>()(() => ({
  status: 'idle',
  pending: 0,
  lastSyncedAt: null,
}));
