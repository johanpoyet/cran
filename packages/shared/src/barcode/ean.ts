/**
 * Barcodes read by the scanner (spec section 3): EAN-8, UPC-A (12 digits) and EAN-13, whose last
 * digit is a GS1 check digit.
 */
const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;

/** GS1 check digit: weights 3 and 1 alternate from the rightmost digit before the check digit. */
function checkDigit(body: string): number {
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    const fromRight = body.length - 1 - index;
    sum += Number(body[index]) * (fromRight % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** True for an EAN-8, UPC-A or EAN-13 with a correct check digit. */
export function isValidBarcode(code: string): boolean {
  if (!BARCODE_PATTERN.test(code)) return false;
  return checkDigit(code.slice(0, -1)) === Number(code.at(-1));
}

/**
 * One code per product: a UPC-A is the EAN-13 with a leading 0, as Open Food Facts stores it, so the
 * same product scanned either way is cached once.
 */
export function normalizeBarcode(code: string): string {
  return code.length === 12 ? `0${code}` : code;
}
