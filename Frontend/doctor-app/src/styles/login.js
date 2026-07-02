import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#030213',
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
  },
  subtitle: {
    color: '#717182',
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
  },
  input: {
    height: 52,
    backgroundColor: '#f3f3f5',
    borderRadius: 12,
    paddingHorizontal: 14,
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
    color: '#717182',
  },
  forgot: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    color: '#030213',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6e6e8',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#717182',
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
    color: '#717182',
  },
  signUp: {
    color: '#030213',
    fontWeight: '600',
  },
  dobButton: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e8',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectButton: {
    height: 52,
    backgroundColor: '#f3f3f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e8',
    overflow: 'hidden',
  },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e8',
  },
  selectOptionText: {
    color: '#030213',
  },
  placeholderText: {
    color: '#9aa0a6',
  },
  inputText: {
    color: '#030213',
  },
  dobText: {
    color: '#9aa0a6',
  },
  termsText: {
    textAlign: 'center',
    color: '#717182',
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  termsLink: {
    color: '#030213',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#717182',
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  iosDatePickerWrap: {
    width: '100%',
    minHeight: 216,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iosDatePicker: {
    width: '100%',
    height: 216,
    color: '#030213',
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
    color: '#0a0a0adc',
    fontWeight: '600',
    fontSize: 16,
  },
});
