import { act, renderHook } from '@testing-library/react-native';

import { loading, onboarding, setSession, signedIn, signedOut } from '../test/fake-auth-client';
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
    expect(result.current).toBe('ready');
  });

  it('signs out when the API no longer knows the session (revoked or expired)', async () => {
    setSession(signedIn);
    const { result } = await renderHook(() => useAuthStatus());
    expect(result.current).toBe('ready');

    await act(() => {
      setSession(signedOut);
    });
    expect(result.current).toBe('signedOut');
  });

  it('asks for the onboarding until the account is marked onboarded', async () => {
    setSession(onboarding);
    const { result } = await renderHook(() => useAuthStatus());
    expect(result.current).toBe('onboarding');

    await act(() => {
      setSession(signedIn);
    });
    expect(result.current).toBe('ready');
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
