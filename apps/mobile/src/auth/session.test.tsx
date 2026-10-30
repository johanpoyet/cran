import { act, renderHook } from '@testing-library/react-native';

import { loading, setSession, signedIn, signedOut } from '../test/fake-auth-client';
import { useAuthStatus } from './session';

jest.mock('./client', () => jest.requireActual<object>('../test/fake-auth-client'));

describe('useAuthStatus', () => {
  it('waits for the first answer before deciding', async () => {
    setSession(loading);
    const { result } = await renderHook(() => useAuthStatus());
    expect(result.current).toBe('loading');

    await act(() => {
      setSession(signedOut);
    });
    expect(result.current).toBe('signedOut');
  });

  it('is signed in as soon as a cached session is restored, before the API answers', async () => {
    setSession({ ...signedIn, isPending: true });
    const { result } = await renderHook(() => useAuthStatus());
    expect(result.current).toBe('signedIn');
  });

  it('signs out when the API no longer knows the session (revoked or expired)', async () => {
    setSession(signedIn);
    const { result } = await renderHook(() => useAuthStatus());
    expect(result.current).toBe('signedIn');

    await act(() => {
      setSession(signedOut);
    });
    expect(result.current).toBe('signedOut');
  });

  it('stays signed out while a later refresh is running', async () => {
    setSession(signedOut);
    const { result } = await renderHook(() => useAuthStatus());

    await act(() => {
      setSession(loading);
    });
    expect(result.current).toBe('signedOut');
  });
});
