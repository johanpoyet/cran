import { act, renderHook } from '@testing-library/react-native';

import { notifyLocalChange, useLocalQuery } from './changes';

describe('useLocalQuery', () => {
  it('reads again after a local change, not at every render', async () => {
    let value = 1;
    const read = jest.fn(() => value);
    const { result, rerender } = await renderHook(() => useLocalQuery(read));

    expect(result.current).toBe(1);
    await rerender({});
    expect(read).toHaveBeenCalledTimes(1);

    value = 2;
    await act(() => {
      notifyLocalChange();
    });
    expect(result.current).toBe(2);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
