import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import styles from '../styles/button';

export default function ButtonPrimary({ title, onPress, disabled, variant, style, children }) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, isOutline ? styles.outline : styles.primary, disabled && styles.disabled, style]}
    >
      {children ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>
      ) : (
        <Text style={[styles.text, isOutline ? styles.textOutline : styles.textPrimary]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}


