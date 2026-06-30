import * as ExpoSecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const getItemAsync = async (key) => {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return ExpoSecureStore.getItemAsync(key);
};

export const setItemAsync = async (key, value) => {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return ExpoSecureStore.setItemAsync(key, value);
};

export const deleteItemAsync = async (key) => {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return ExpoSecureStore.deleteItemAsync(key);
};
