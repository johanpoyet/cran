import { contrastRatio } from './contrast';
import { colors } from './tokens';

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('rejects malformed colours', () => {
    expect(() => contrastRatio('blue', '#FFFFFF')).toThrow(/Invalid colour/);
  });
});

// Spec section 7: text contrast of at least 4.5:1.
describe.each([
  ['text on bg', colors.text, colors.bg],
  ['text on surface', colors.text, colors.surface],
  ['textMuted on bg', colors.textMuted, colors.bg],
  ['textMuted on surface', colors.textMuted, colors.surface],
  ['onAccent on accent', colors.onAccent, colors.accent],
  ['accent on surface', colors.accent, colors.surface],
  ['accent on accentSoft', colors.accent, colors.accentSoft],
  ['success on surface', colors.success, colors.surface],
  ['danger on bg (form errors)', colors.danger, colors.bg],
  ['onAccent on text (selected chip)', colors.onAccent, colors.text],
])('%s', (_, foreground, background) => {
  it('reaches 4.5:1', () => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
