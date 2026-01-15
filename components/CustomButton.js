// components/CustomButton.js
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export default function CustomButton({ onPress, label, mode = 'contained', color }) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      style={styles.button}
      buttonColor={color || '#6200ee'}
      textColor="#fff"
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 6,
    marginHorizontal: 12,
    paddingVertical: 6,
  },
});
