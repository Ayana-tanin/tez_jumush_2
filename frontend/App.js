import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainNavigator from './src/navigation/MainNavigator';
import AuthScreen from './src/screens/LoginAndRegistration/AuthScreen';
import SimpleAuthScreen from './src/screens/SimpleAuthScreen';
import UltraSimpleAuthScreen from './src/screens/UltraSimpleAuthScreen';
import GoogleAuthScreen from './src/screens/GoogleAuthScreen';
import PWAAuthScreen from './src/screens/PWAAuthScreen';
import GoogleAuthService from './src/utils/googleAuth';
import { TasksProvider } from './src/context/TasksContext';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      // Для PWA проверяем localStorage
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          console.log('PWA token found:', JSON.parse(userData).email);
          setIsAuthenticated(true);
          return;
        }
      }
      
      // Проверяем Google Auth статус
      const googleAuthStatus = await GoogleAuthService.checkAuthStatus();
      
      if (googleAuthStatus.isAuthenticated) {
        console.log('Google Auth found:', googleAuthStatus.user.email);
        setIsAuthenticated(true);
        return;
      }
      
      // Fallback на старый метод
      const token = await AsyncStorage.getItem('userToken');
      console.log('Legacy token found:', !!token);
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Ошибка при проверке токена:', error);
      setError(error.message);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user, token) => {
    console.log('Login successful:', user?.email || 'unknown');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      // Выходим из Google Auth
      await GoogleAuthService.signOut();
      
      // Очищаем PWA токены
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      // Очищаем legacy токен
      await AsyncStorage.removeItem('userToken');
      
      setIsAuthenticated(false);
      console.log('Logout successful');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const resetError = () => {
    setError(null);
    setIsLoading(true);
    checkAuthStatus();
  };

  // Экран ошибки
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Произошла ошибка</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={resetError}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Экран загрузки
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  try {
    return (
      <TasksProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          {isAuthenticated ? (
            <MainNavigator onLogout={handleLogout} />
          ) : (
            Platform.OS === 'web' ? (
              <PWAAuthScreen onLogin={handleLogin} onError={setError} />
            ) : (
              <GoogleAuthScreen onLogin={handleLogin} />
            )
          )}
        </NavigationContainer>
      </TasksProvider>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Ошибка приложения</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setError(null);
            setIsLoading(true);
            checkAuthStatus();
          }}
        >
          <Text style={styles.retryButtonText}>Перезапустить</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
