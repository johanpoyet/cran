import { describe, expect, it } from 'vitest';

import { isValidBarcode, normalizeBarcode } from './ean';

describe('isValidBarcode', () => {
  it.each([
    ['an EAN-13', '3017620422003'],
    ['another EAN-13', '3175680011480'],
    ['an EAN-8', '96385074'],
    ['a UPC-A', '036000291452'],
    ['a check digit of 0', '3000000000090'],
  ])('accepts %s', (_, code) => {
    expect(isValidBarcode(code)).toBe(true);
  });

  it.each([
    ['a wrong check digit', '3017620422004'],
    ['letters', '30176204220AB'],
    ['7 digits', '1234567'],
    ['14 digits', '13017620422003'],
    ['spaces', ' 3017620422003'],
    ['an empty string', ''],
  ])('rejects %s', (_, code) => {
    expect(isValidBarcode(code)).toBe(false);
  });
});

describe('normalizeBarcode', () => {
  it('turns a UPC-A into its EAN-13', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(isValidBarcode(normalizeBarcode('036000291452'))).toBe(true);
  });

  it('keeps EAN-8 and EAN-13 as they are', () => {
    expect(normalizeBarcode('96385074')).toBe('96385074');
    expect(normalizeBarcode('3017620422003')).toBe('3017620422003');
  });
});
