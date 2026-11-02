import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { uuidV7 } from './uuid-v7';

const zeros = new Uint8Array(10);
const ones = new Uint8Array(10).fill(0xff);

describe('uuidV7', () => {
  it('writes the time in the first 48 bits, then the version and the variant', () => {
    // Example of RFC 9562, appendix A.6: 2022-02-22 19:22:22 UTC = 0x017F22E279B0.
    expect(uuidV7(0x017f22e279b0, zeros)).toBe('017f22e2-79b0-7000-8000-000000000000');
    expect(uuidV7(0x017f22e279b0, ones)).toBe('017f22e2-79b0-7fff-bfff-ffffffffffff');
  });

  it('is a valid UUID v7 for zod', () => {
    const id = uuidV7(Date.UTC(2026, 10, 2), new Uint8Array(10).fill(0x5a));
    expect(z.uuid({ version: 'v7' }).safeParse(id).success).toBe(true);
  });

  it('sorts by creation time', () => {
    const ids = [3, 1, 2].map((offset) => uuidV7(1_800_000_000_000 + offset, ones));
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });

  it.each([-1, 1.5, 2 ** 48])('refuses the time %d', (time) => {
    expect(() => uuidV7(time, zeros)).toThrow(RangeError);
  });

  it('refuses fewer than 10 random bytes', () => {
    expect(() => uuidV7(0, new Uint8Array(9))).toThrow(RangeError);
  });
});
