import { uuidV7 } from '@cran/shared';
import { getRandomBytes } from 'expo-crypto';

/** Id of a new row: UUID v7 generated on the device (spec section 3). */
export function newId(): string {
  return uuidV7(Date.now(), getRandomBytes(10));
}
