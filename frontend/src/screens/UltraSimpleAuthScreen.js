import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

export default function UltraSimpleAuthScreen({ onLogin }) {
  const handleLogin = () => {
    console.log('Login button pressed!');
    Alert.alert('Вход', 'Выполняется вход в систему...', [
      {
        text: 'OK',
        onPress: () => {
          console.log('Calling onLogin...');
          onLogin();
        }
      }
    ]);
  };

  const handleTest = () => {
    Alert.alert('Тест', 'Тестовая кнопка работает!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tez Jumush</Text>
        <Text style={styles.subtitle}>Простая версия для тестирования</Text>
        
        {/* Основная кнопка входа */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>Войти в приложение</Text>
        </TouchableOpacity>
        
        {/* Тестовая кнопка */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTest}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>Тест кнопки</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Нажмите любую кнопку для проверки отклика
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
    minWidth: 280,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});