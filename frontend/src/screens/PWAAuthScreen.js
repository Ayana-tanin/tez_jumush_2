import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import PWAGoogleAuth from '../components/PWAGoogleAuth';

const PWAAuthScreen = ({ onLogin, onError }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    // Проверяем, запущено ли приложение как PWA
    checkPWAStatus();
    
    // Обработка установки PWA
    if (typeof window !== 'undefined') {
      setupPWAInstall();
    }
  }, []);

  const checkPWAStatus = () => {
    if (typeof window !== 'undefined') {
      // Проверяем, запущено ли в standalone режиме
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              window.navigator.standalone ||
                              document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      
      // Проверяем поддержку Service Worker
      if ('serviceWorker' in navigator) {
        registerServiceWorker();
      }
    }
  };

  const setupPWAInstall = () => {
    // Обработка события beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    // Обработка события appinstalled
    window.addEventListener('appinstalled', () => {
      setIsInstalling(false);
      Alert.alert(
        'Установлено!',
        'Приложение Tez Jumush успешно установлено на ваше устройство.',
        [{ text: 'Отлично!' }]
      );
    });
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker зарегистрирован:', registration);
      
      // Проверяем обновления
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Доступно обновление
            showUpdateAvailable();
          }
        });
      });
    } catch (error) {
      console.error('Ошибка регистрации Service Worker:', error);
    }
  };

  const showUpdateAvailable = () => {
    Alert.alert(
      'Доступно обновление',
      'Доступна новая версия приложения. Обновить сейчас?',
      [
        { text: 'Позже', style: 'cancel' },
        { 
          text: 'Обновить', 
          onPress: () => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        }
      ]
    );
  };

  const handleInstallPWA = async () => {
    if (!installPrompt) {
      Alert.alert(
        'Установка',
        'Для установки приложения используйте меню браузера (три точки) и выберите "Установить приложение" или "Добавить на главный экран".'
      );
      return;
    }

    setIsInstalling(true);
    
    try {
      const result = await installPrompt.prompt();
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        console.log('Пользователь принял установку');
      } else {
        console.log('Пользователь отклонил установку');
      }
    } catch (error) {
      console.error('Ошибка установки:', error);
      Alert.alert('Ошибка', 'Не удалось установить приложение');
    } finally {
      setIsInstalling(false);
      setInstallPrompt(null);
    }
  };

  const handleLogin = (user, token) => {
    console.log('PWA Login successful:', user.email);
    onLogin(user, token);
  };

  const handleError = (error) => {
    console.error('PWA Auth error:', error);
    Alert.alert('Ошибка авторизации', error);
    onError(error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚀</Text>
          <Text style={styles.title}>Tez Jumush</Text>
          <Text style={styles.subtitle}>Быстрая работа</Text>
        </View>

        {/* PWA статус */}
        <View style={styles.pwaStatus}>
          {isStandalone ? (
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>📱</Text>
              <Text style={styles.statusText}>PWA режим</Text>
            </View>
          ) : (
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>🌐</Text>
              <Text style={styles.statusText}>Веб режим</Text>
            </View>
          )}
          
          {typeof window !== 'undefined' && 'serviceWorker' in navigator && (
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>⚡</Text>
              <Text style={styles.statusText}>Офлайн поддержка</Text>
            </View>
          )}
        </View>

        {/* Форма авторизации */}
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Добро пожаловать!</Text>
          <Text style={styles.authSubtitle}>
            Войдите в систему, чтобы начать работать с задачами
          </Text>

          <PWAGoogleAuth 
            onLogin={handleLogin}
            onError={handleError}
          />

          {/* Альтернативные варианты входа */}
          <View style={styles.alternativeAuth}>
            <TouchableOpacity 
              style={styles.guestButton}
              onPress={() => handleLogin({ email: 'guest@example.com', name: 'Гость' }, 'guest-token')}
            >
              <Text style={styles.guestButtonText}>Продолжить как гость</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Установка PWA */}
        {(installPrompt || !isStandalone) && (
          <View style={styles.installSection}>
            <Text style={styles.installTitle}>Установить приложение</Text>
            <Text style={styles.installDescription}>
              Установите Tez Jumush для быстрого доступа и работы в офлайне
            </Text>
            
            <TouchableOpacity 
              style={[styles.installButton, isInstalling && styles.installButtonDisabled]}
              onPress={handleInstallPWA}
              disabled={isInstalling}
            >
              <Text style={styles.installButtonText}>
                {isInstalling ? 'Установка...' : 'Установить'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Информация о PWA */}
        <View style={styles.pwaInfo}>
          <Text style={styles.infoTitle}>Преимущества PWA:</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>⚡</Text>
              <Text style={styles.infoText}>Быстрая загрузка</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📱</Text>
              <Text style={styles.infoText}>Работа как приложение</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🔒</Text>
              <Text style={styles.infoText}>Безопасная авторизация</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🌐</Text>
              <Text style={styles.infoText}>Офлайн режим</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  pwaStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 3,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  authContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  alternativeAuth: {
    marginTop: 16,
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  guestButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '500',
  },
  installSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  installTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  installDescription: {
    fontSize: 14,
    color: '#1565c0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  installButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  installButtonDisabled: {
    backgroundColor: '#ccc',
  },
  installButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pwaInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#7f8c8d',
    flex: 1,
  },
});

export default PWAAuthScreen;
