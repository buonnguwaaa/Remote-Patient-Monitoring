import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#030213',
  },
  outline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e8',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textOutline: {
    color: '#030213',
  },
  disabled: {
    opacity: 0.6,
  },
});
