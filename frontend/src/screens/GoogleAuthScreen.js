import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GoogleAuthService from '../utils/googleAuth';

export default function GoogleAuthScreen({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Проверяем, авторизован ли пользователь при загрузке
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const authStatus = await GoogleAuthService.checkAuthStatus();
      
      if (authStatus.isAuthenticated) {
        console.log('User already authenticated:', authStatus.user.email);
        onLogin(authStatus.user, authStatus.token);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      console.log('Starting Google Sign In...');
      
      const result = await GoogleAuthService.signInWithGoogle();
      
      if (result.success) {
        // Передаем данные пользователя в AuthScreen для заполнения паспортных данных
        onLogin(result.user, result.token);
      } else {
        Alert.alert(
          'Ошибка входа',
          result.error || 'Не удалось войти через Google. Попробуйте еще раз.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      Alert.alert(
        'Ошибка',
        'Произошла ошибка при входе. Проверьте подключение к интернету и попробуйте еще раз.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    Alert.alert(
      'Гостевой режим',
      'Вы можете использовать приложение без регистрации, но некоторые функции будут недоступны.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Продолжить как гость',
          onPress: () => {
            onLogin(
              {
                id: 'guest',
                name: 'Гость',
                email: 'guest@local',
                picture: null,
                isGuest: true,
              },
              'guest-token'
            );
          }
        }
      ]
    );
  };

  const handleTestMode = () => {
    Alert.alert(
      'Тестовый режим',
      'Войти с тестовым аккаунтом для демонстрации?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да',
          onPress: () => {
            onLogin(
              {
                id: 'test-user',
                name: 'Тестовый Пользователь',
                email: 'test@example.com',
                picture: 'https://via.placeholder.com/100',
                givenName: 'Тестовый',
                familyName: 'Пользователь',
                isTest: true,
              },
              'test-token'
            );
          }
        }
      ]
    );
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Проверка авторизации...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Logo and Title */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="briefcase" size={60} color="#007AFF" />
        </View>
        <Text style={styles.appTitle}>Tez Jumush</Text>
        <Text style={styles.appSubtitle}>Найди работу или найми исполнителя</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
        <Text style={styles.welcomeText}>
          Войдите в свой аккаунт, чтобы создавать задачи и откликаться на работу
        </Text>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="white" />
              <Text style={styles.googleButtonText}>Войти через Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alternative Options */}
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeTitle}>Или</Text>
          
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestMode}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={20} color="#007AFF" />
            <Text style={styles.guestButtonText}>Продолжить как гость</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestMode}
            activeOpacity={0.8}
          >
            <Ionicons name="flask-outline" size={20} color="#FF9500" />
            <Text style={styles.testButtonText}>Тестовый режим</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Возможности приложения:</Text>
          
          <View style={styles.feature}>
            <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Создавайте задачи</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="search-outline" size={20} color="#2196F3" />
            <Text style={styles.featureText}>Находите работу</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="chatbubble-outline" size={20} color="#FF9500" />
            <Text style={styles.featureText}>Общайтесь с заказчиками</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="card-outline" size={20} color="#9C27B0" />
            <Text style={styles.featureText}>Получайте оплату</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>
            Ваши данные защищены и используются только для работы приложения
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  alternativeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  alternativeTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'white',
    marginBottom: 10,
    width: '100%',
  },
  guestButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
    backgroundColor: 'white',
    width: '100%',
  },
  testButtonText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresContainer: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4CAF50',
    flex: 1,
    lineHeight: 20,
  },
});