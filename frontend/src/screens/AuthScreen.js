import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleAuthScreen from './GoogleAuthScreen';
import { useAuthForm } from '../hooks/useAuthForm';
import { InputField } from '../components/InputField';

export default function AuthScreen({ onLogin }) {
  const [authMethod] = useState('google');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPassportForm, setShowPassportForm] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);

  const {
    formData,
    agreementAccepted,
    setAgreementAccepted,
    handleInputChange,
    validatePassportData,
    isFormValid,
  } = useAuthForm();

  const handleGoogleAuthSuccess = useCallback((userData, token) => {
    // Сохраняем данные пользователя Google и показываем форму паспортных данных
    setGoogleUserData({ user: userData, token });
    setShowPassportForm(true);
  }, []);

  const completeRegistration = useCallback(async () => {
    const errors = validatePassportData();
    if (errors.length > 0) {
      Alert.alert('Ошибка валидации', errors.join('\n'));
      return;
    }

    try {
      const baseUrl = 'http://localhost:8000';
      const registrationData = {
        full_name: formData.fullName,
        passport_series: formData.passportSeries,
        passport_number: formData.passportNumber,
        passport_issued_by: formData.passportIssuedBy,
        passport_date: formData.passportDate,
      };

      // Если есть данные Google, добавляем их
      if (googleUserData) {
        registrationData.google_id = googleUserData.user.id;
        registrationData.email = googleUserData.user.email;
        registrationData.google_token = googleUserData.token;
      }

      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const userData = await response.json();
        await AsyncStorage.setItem('userToken', googleUserData?.token || 'verified_token');
        await AsyncStorage.setItem('userId', userData.id.toString());
        Alert.alert('Успех', 'Регистрация прошла успешно!');
        onLogin();
      } else {
        const errorData = await response.json();
        Alert.alert('Ошибка', errorData.detail || 'Произошла ошибка при регистрации');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка при регистрации');
    }
  }, [formData, googleUserData, validatePassportData, onLogin]);

  const handleSubmit = useCallback(async () => {
    if (!agreementAccepted) {
      Alert.alert('Ошибка', 'Примите условия соглашения');
      return;
    }

    await completeRegistration();
  }, [agreementAccepted, completeRegistration]);

  if (authMethod === 'google' && !showPassportForm) {
    return <GoogleAuthScreen onLogin={handleGoogleAuthSuccess} />;
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Личные данные</Text>
        <Text style={styles.subtitle}>Заполните паспортные данные для завершения регистрации</Text>
      </View>

      <View style={styles.form}>
        {/* Поля паспортных данных */}
        <InputField
          icon="person-outline"
          placeholder="ФИО"
          value={formData.fullName}
          onChangeText={(value) => handleInputChange('fullName', value)}
          autoCapitalize="words"
        />

        <InputField
          icon="card-outline"
          placeholder="Серия паспорта (7 цифр)"
          value={formData.passportSeries}
          onChangeText={(value) => handleInputChange('passportSeries', value)}
          keyboardType="number-pad"
          maxLength={7}
        />

        <InputField
          icon="card-outline"
          placeholder="ИНН (14 цифр)"
          value={formData.passportNumber}
          onChangeText={(value) => handleInputChange('passportNumber', value)}
          keyboardType="number-pad"
          maxLength={14}
        />

        <InputField
          icon="business-outline"
          placeholder="Кем выдан (до 11 символов)"
          value={formData.passportIssuedBy}
          onChangeText={(value) => handleInputChange('passportIssuedBy', value)}
          maxLength={11}
        />

        <InputField
          icon="calendar-outline"
          placeholder="Дата выдачи (ДД.ММ.ГГГГ)"
          value={formData.passportDate}
          onPress={() => setShowCalendar(true)}
          isPlaceholder={!formData.passportDate}
        />

        {/* Соглашение */}
        <View style={styles.agreementContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreementAccepted(!agreementAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>
              {agreementAccepted && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text style={styles.agreementText}>
              Я ознакомился с{' '}
              <Text style={styles.agreementLink}>соглашением на обработку персональных данных</Text>
              {' '}и принимаю его{' '}
              <Text style={styles.agreementLink}>условия</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Кнопка завершения регистрации */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid() && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid()}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>Завершить регистрацию</Text>
        </TouchableOpacity>
      </View>

      {/* Календарь */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Выберите дату</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContent}>
              <Text style={styles.calendarText}>
                Введите дату выдачи паспорта
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="ДД.ММ.ГГГГ"
                  value={formData.passportDate}
                  onChangeText={(value) => handleInputChange('passportDate', value)}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowCalendar(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.calendarButtonText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  agreementContainer: {
    marginBottom: 30,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  agreementText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  agreementLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 50,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calendarContent: {
    alignItems: 'center',
  },
  calendarText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  calendarButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  calendarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});