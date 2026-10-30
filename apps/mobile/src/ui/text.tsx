import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

import {
  colors,
  type ColorToken,
  fontFamily,
  type FontWeight,
  typography,
  type TypographyVariant,
} from '../theme/tokens';

export interface TextProps extends NativeTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right';
}

// Respects the system text size (Dynamic Type) through allowFontScaling, on by default.
export function Text({
  variant = 'body',
  color = 'text',
  weight,
  align,
  style,
  ...rest
}: TextProps) {
  const type = typography[variant];
  return (
    <NativeText
      style={[
        {
          fontFamily: fontFamily[weight ?? type.weight],
          fontSize: type.fontSize,
          lineHeight: type.lineHeight,
          color: colors[color],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
