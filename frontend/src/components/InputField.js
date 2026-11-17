import React from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'none',
  onPress,
  editable = true,
  isPlaceholder = false,
}) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component 
      style={styles.inputContainer}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
      {onPress ? (
        <Text style={[styles.input, isPlaceholder && styles.placeholderText]}>
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
      )}
    </Component>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
});