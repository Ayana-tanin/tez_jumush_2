import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SimpleAuthScreen({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);

  // Оптимизация для быстрого отклика
  const handleLoginOptimized = React.useCallback(async () => {
    if (isLoading) return; // Предотвращаем множественные нажатия
    
    try {
      setIsLoading(true);
      
      // Простая имитация входа
      await AsyncStorage.setItem('userToken', 'demo_token');
      await AsyncStorage.setItem('userId', '1');
      
      Alert.alert('Успех', 'Вход выполнен успешно!');
      onLogin();
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Ошибка', 'Не удалось войти в систему');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onLogin]);



  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tez Jumush</Text>
        <Text style={styles.subtitle}>Демо вход</Text>
        
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLoginOptimized}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Вход...' : 'Войти как демо пользователь'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Это упрощенная версия для тестирования.{'\n'}
          Нажмите кнопку для входа в приложение.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});