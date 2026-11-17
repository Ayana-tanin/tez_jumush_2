import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ApiService from '../utils/api';
import AddressPicker from '../components/AddressPicker';
import { validateAddressComplete } from '../utils/addressValidator';

export default function AddTaskScreen({ navigation }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    count_people: '1',
    date: new Date(),
    time: new Date(),
    address: '',
    latitude: null,
    longitude: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setFormData(prev => ({
        ...prev,
        time: selectedTime
      }));
    }
  };

  const handleAddressSelect = (address, latitude, longitude) => {
    setFormData(prev => ({
      ...prev,
      address: address,
      latitude: latitude,
      longitude: longitude
    }));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU');
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Ошибка', 'Введите название задачи');
      return false;
    }
    if (!formData.price || isNaN(formData.price) || parseInt(formData.price) <= 0) {
      Alert.alert('Ошибка', 'Введите корректную цену');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Ошибка', 'Выберите адрес на карте');
      return false;
    }
    // Требуем координаты из выбора на карте
    if (formData.latitude == null || formData.longitude == null) {
      Alert.alert('Ошибка', 'Укажите точку на карте через выбор адреса');
      return false;
    }
    // Проверяем, что точка попадает в пределы г. Бишкек / Чуйской области (примерные границы)
    const isWithinChuy = (lat, lon) => {
      const MIN_LAT = 41.80; // южнее — Нарын/Иссык‑Куль
      const MAX_LAT = 43.60; // севернее — Казахстан
      const MIN_LON = 72.50; // западнее — Талас
      const MAX_LON = 77.00; // восточнее — Иссык‑Куль
      return lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON;
    };
    if (!isWithinChuy(formData.latitude, formData.longitude)) {
      Alert.alert('Ошибка', 'Адрес за пределами г. Бишкек / Чуйской области');
      return false;
    }
    if (!formData.count_people || isNaN(formData.count_people) || parseInt(formData.count_people) <= 0) {
      Alert.alert('Ошибка', 'Введите количество людей');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Дополнительная проверка адреса перед созданием задачи
    setIsValidatingAddress(true);
    try {
      const addressValidation = await validateAddressComplete(formData.address, true);
      
      if (!addressValidation.isValid) {
        setIsValidatingAddress(false);
        Alert.alert(
          'Проблема с адресом',
          addressValidation.error + (addressValidation.suggestions?.length > 0 
            ? `\n\nВозможные варианты:\n• ${addressValidation.suggestions.join('\n• ')}`
            : ''),
          [
            { text: 'Исправить адрес', onPress: () => setShowAddressPicker(true) },
            { 
              text: 'Создать как есть', 
              style: 'destructive',
              onPress: () => proceedWithTaskCreation()
            }
          ]
        );
        return;
      }

      // Адрес валиден, продолжаем создание задачи
      proceedWithTaskCreation();
      
    } catch (error) {
      setIsValidatingAddress(false);
      console.error('Ошибка валидации адреса:', error);
      Alert.alert(
        'Ошибка проверки адреса',
        'Не удалось проверить адрес. Продолжить создание задачи?',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Продолжить', 
            onPress: () => proceedWithTaskCreation()
          }
        ]
      );
    }
  };

  const proceedWithTaskCreation = async () => {
    setIsValidatingAddress(false);
    setIsLoading(true);
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseInt(formData.price),
        count_people: parseInt(formData.count_people),
        date: formData.date.toISOString().split('T')[0], // YYYY-MM-DD
        time: formData.time.toTimeString().split(' ')[0].slice(0, 5), // HH:MM
        address: formData.address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      await ApiService.createTask(taskData);
      
      Alert.alert(
        'Успешно!', 
        'Задача создана успешно',
        [
          {
            text: 'OK',
            onPress: () => {
              // Очищаем форму
              setFormData({
                title: '',
                description: '',
                price: '',
                count_people: '1',
                date: new Date(),
                time: new Date(),
                address: '',
                latitude: null,
                longitude: null,
              });
              // Переходим на экран задач
              navigation.navigate('Tasks');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось создать задачу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Создать задачу</Text>
          <Text style={styles.subtitle}>Заполните информацию о задаче</Text>
        </View>

        <View style={styles.form}>
          {/* Название задачи */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Название задачи *</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: Уборка квартиры"
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              maxLength={100}
            />
          </View>

          {/* Описание */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Подробное описание задачи..."
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Цена и количество людей */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Цена (сом) *</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                value={formData.price}
                onChangeText={(value) => handleInputChange('price', value)}
                keyboardType="numeric"
              />
            </View>
            
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Людей нужно *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={formData.count_people}
                onChangeText={(value) => handleInputChange('count_people', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Дата и время */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Дата *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateTimeText}>{formatDate(formData.date)}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Время *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.dateTimeText}>{formatTime(formData.time)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Адрес */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Адрес *</Text>
            <TouchableOpacity
              style={styles.addressButton}
              onPress={() => setShowAddressPicker(true)}
            >
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={[styles.addressText, formData.address ? styles.addressTextFilled : styles.addressTextPlaceholder]}>
                {formData.address || 'Выберите адрес на карте'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            {formData.latitude && formData.longitude && (
              <Text style={styles.coordinatesText}>
                📍 Координаты: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </Text>
            )}
          </View>

          {/* Кнопка создания */}
          <TouchableOpacity
            style={[styles.submitButton, (isLoading || isValidatingAddress) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || isValidatingAddress}
          >
            <Text style={styles.submitButtonText}>
              {isValidatingAddress ? 'Проверка адреса...' : isLoading ? 'Создание...' : 'Создать задачу'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={formData.time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Address Picker */}
      <AddressPicker
        visible={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        onAddressSelect={handleAddressSelect}
        initialAddress={formData.address}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  dateTimeButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  addressButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  addressTextFilled: {
    color: '#333',
  },
  addressTextPlaceholder: {
    color: '#999',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});