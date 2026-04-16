import { TextStyle } from 'react-native';

import { TextStyleSettings } from '../types';

function resolveFontFamily(fontFamily: TextStyleSettings['fontFamily']) {
  switch (fontFamily) {
    case 'SERIF':
      return 'serif';
    case 'SANS_SERIF':
      return 'sans-serif';
    case 'MONOSPACE':
      return 'monospace';
    default:
      return undefined;
  }
}

export function buildFormattedTextStyle(config: TextStyleSettings): TextStyle {
  return {
    fontFamily: resolveFontFamily(config.fontFamily),
    fontSize: config.fontSize,
    fontWeight: config.bold ? '700' : '400',
    fontStyle: config.italic ? 'italic' : 'normal',
    textDecorationLine: config.underline ? 'underline' : 'none',
    backgroundColor: config.highlight ? config.highlightColor : 'transparent',
  };
}
