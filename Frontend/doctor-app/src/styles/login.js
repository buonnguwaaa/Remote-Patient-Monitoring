import { StyleSheet } from 'react-native';
import { colors, radius } from '../theme/rpmTheme';

export default StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: colors.surface,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: radius["3xl"],
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
    marginTop: 12,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  input: {
    height: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.text,
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  eyeText: {
    color: colors.textSecondary,
  },
  forgot: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    color: colors.primary,
    fontWeight: '600',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
  },
  socialRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    fontSize: 14,
    paddingBottom: 24,
    marginTop: 18,
  },
  footerText: {
    color: colors.textSecondary,
  },
  signUp: {
    color: colors.primary,
    fontWeight: '600',
  },
  dobButton: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectButton: {
    height: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectOptions: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectOptionText: {
    color: colors.text,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  inputText: {
    color: colors.text,
  },
  dobText: {
    color: colors.textMuted,
  },
  termsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.textSecondary,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  iosDatePickerWrap: {
    width: '100%',
    minHeight: 216,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  iosDatePicker: {
    width: '100%',
    height: 216,
    color: colors.text,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  modalActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalActionText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
});
