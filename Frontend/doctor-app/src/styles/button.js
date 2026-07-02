import { StyleSheet } from 'react-native';
import { colors, radius } from '../theme/rpmTheme';

export default StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textOutline: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
});
