import type { NumberSystem } from './types.ts';
import { formatBijectiveBase26, parseBijectiveBase26 } from './sequence.ts';

export const latinUpperNumberSystem: NumberSystem = {
  id: 'latin-upper',
  parse(text) {
    return parseBijectiveBase26(text, true);
  },
  format(n) {
    return formatBijectiveBase26(n, true);
  },
};

export const latinLowerNumberSystem: NumberSystem = {
  id: 'latin-lower',
  parse(text) {
    return parseBijectiveBase26(text, false);
  },
  format(n) {
    return formatBijectiveBase26(n, false);
  },
};