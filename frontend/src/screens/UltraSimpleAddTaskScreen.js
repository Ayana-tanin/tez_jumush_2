import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../context/TasksContext';

export default function UltraSimpleAddTaskScreen({ navigation }) {
  const { addTask } = useTasks();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    count_people: '1',
    date: new Date(),
    timeFrom: new Date(),
    timeTo: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // +2 часа по умолчанию
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);

  // Очистка состояния при потере фокуса
  useFocusEffect(
    useCallback(() => {
      // При получении фокуса - ничего не делаем
      return () => {
        // При потере фокуса - закрываем все пикеры и сбрасываем loading
        setShowDatePicker(false);
        setShowTimeFromPicker(false);
        setShowTimeToPicker(false);
        setIsLoading(false);
        console.log('UltraSimpleAddTaskScreen: Очистка состояния при потере фокуса');
      };
    }, [])
  );

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      setIsLoading(false);
      console.log('UltraSimpleAddTaskScreen: Компонент размонтирован');
    };
  }, []);

  // Обработчик аппаратной кнопки "Назад" для Android
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedData() || isLoading) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Несохраненные данные',
        'У вас есть несохраненные изменения. Вы уверены, что хотите выйти?',
        [
          { text: 'Остаться', style: 'cancel' },
          { 
            text: 'Выйти', 
            style: 'destructive',
            onPress: () => {
              setIsLoading(false);
              setShowDatePicker(false);
              setShowTimeFromPicker(false);
              setShowTimeToPicker(false);
              navigation.dispatch(e.data.action);
            }
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedData, isLoading]);

  const handleInputChange = useCallback((field, value) => {
    console.log(`Изменение ${field}:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Безопасная навигация
  const safeNavigate = useCallback((routeName) => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate(routeName);
      }
    } catch (error) {
      console.error('Ошибка навигации:', error);
    }
  }, [navigation]);

  const handleDateChange = useCallback((event, selectedDate) => {
    console.log('Date picker event:', event?.type, selectedDate);
    setShowDatePicker(false);
    
    // Проверяем, что пользователь не отменил выбор
    if (event?.type === 'set' && selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  }, []);

  const handleTimeFromChange = useCallback((event, selectedTime) => {
    console.log('Time from picker event:', event?.type, selectedTime);
    setShowTimeFromPicker(false);
    
    if (event?.type === 'set' && selectedTime) {
      setFormData(prev => ({
        ...prev,
        timeFrom: selectedTime
      }));
    }
  }, []);

  const handleTimeToChange = useCallback((event, selectedTime) => {
    console.log('Time to picker event:', event?.type, selectedTime);
    setShowTimeToPicker(false);
    
    if (event?.type === 'set' && selectedTime) {
      setFormData(prev => ({
        ...prev,
        timeTo: selectedTime
      }));
    }
  }, []);

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
    console.log('Валидация формы:', formData);
    
    if (!formData.title.trim()) {
      Alert.alert('Ошибка', 'Введите название задачи');
      return false;
    }
    if (!formData.price || isNaN(formData.price) || parseInt(formData.price) <= 0) {
      Alert.alert('Ошибка', 'Введите корректную цену');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Ошибка', 'Введите адрес');
      return false;
    }
    if (!formData.count_people || isNaN(formData.count_people) || parseInt(formData.count_people) <= 0) {
      Alert.alert('Ошибка', 'Введите количество людей');
      return false;
    }
    // Проверяем, что дата не в прошлом
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Ошибка', 'Дата не может быть в прошлом');
      return false;
    }
    
    // Проверяем, что поля времени заполнены
    if (!formData.timeFrom || !formData.timeTo) {
      Alert.alert('Ошибка', 'Выберите время начала и окончания');
      return false;
    }
    
    // Проверяем время (разрешаем работу через полночь)
    const timeFromMinutes = formData.timeFrom.getHours() * 60 + formData.timeFrom.getMinutes();
    const timeToMinutes = formData.timeTo.getHours() * 60 + formData.timeTo.getMinutes();
    
    // Если время "до" меньше времени "от", значит работа идет через полночь
    if (timeToMinutes <= timeFromMinutes) {
      // Проверяем, что разница не слишком большая (максимум 12 часов через полночь)
      const diffMinutes = (24 * 60) - timeFromMinutes + timeToMinutes;
      if (diffMinutes > 12 * 60) {
        Alert.alert('Ошибка', 'Максимальная продолжительность работы - 12 часов');
        return false;
      }
      // Показываем предупреждение о работе через полночь
      console.log('Работа через полночь:', `${formData.timeFrom.toTimeString().slice(0,5)} - ${formData.timeTo.toTimeString().slice(0,5)} (+1 день)`);
    } else {
      // Обычная проверка в пределах одного дня
      const diffMinutes = timeToMinutes - timeFromMinutes;
      if (diffMinutes < 30) {
        Alert.alert('Ошибка', 'Минимальная продолжительность работы - 30 минут');
        return false;
      }
      if (diffMinutes > 12 * 60) {
        Alert.alert('Ошибка', 'Максимальная продолжительность работы - 12 часов');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    console.log('UltraSimpleAddTaskScreen: Нажата кнопка создания задачи');
    
    if (!validateForm()) {
      console.log('UltraSimpleAddTaskScreen: Валидация не прошла');
      return;
    }

    setIsLoading(true);
    
    try {
      // Создаем объект задачи
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseInt(formData.price),
        count_people: parseInt(formData.count_people) || 1,
        date: formData.date.toISOString().split('T')[0], // YYYY-MM-DD
        time_from: formData.timeFrom.toTimeString().split(' ')[0].slice(0, 5), // HH:MM
        time_to: formData.timeTo.toTimeString().split(' ')[0].slice(0, 5), // HH:MM
        address: formData.address.trim(),
      };
      
      console.log('UltraSimpleAddTaskScreen: Создаем задачу с данными:', taskData);
      
      // Добавляем задачу через контекст (теперь асинхронно)
      const newTask = await addTask(taskData);
      console.log('UltraSimpleAddTaskScreen: Задача добавлена в контекст:', newTask);
      
      setIsLoading(false);
      
      Alert.alert(
        'Успешно!', 
        `Задача "${formData.title}" создана и сохранена в базу данных!`,
        [
          {
            text: 'Посмотреть все задачи',
            onPress: () => {
              // Очищаем форму
              setFormData({
                title: '',
                description: '',
                price: '',
                count_people: '1',
                date: new Date(),
                timeFrom: new Date(),
                timeTo: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
                address: '',
              });
              
              // Переходим к списку всех задач
              safeNavigate('Tasks');
            }
          },
          {
            text: 'Мои задачи',
            onPress: () => {
              // Очищаем форму
              setFormData({
                title: '',
                description: '',
                price: '',
                count_people: '1',
                date: new Date(),
                timeFrom: new Date(),
                timeTo: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
                address: '',
              });
              
              // Переходим к моим задачам
              safeNavigate('MyTasks');
            }
          }
        ]
      );
    } catch (error) {
      setIsLoading(false);
      console.error('UltraSimpleAddTaskScreen: Ошибка создания задачи:', error);
      
      // Показываем более информативное сообщение
      const errorMessage = error.message || 'Неизвестная ошибка';
      Alert.alert(
        'Информация', 
        `Задача сохранена локально.\n\nПричина: ${errorMessage}\n\nЗадача будет синхронизирована с сервером при восстановлении подключения.`,
        [{ text: 'Понятно' }]
      );
    }
  };

  const handleTest = useCallback(() => {
    Alert.alert('Тест', 'Тестовая кнопка работает!');
  }, []);

  // Проверка на наличие несохраненных данных
  const hasUnsavedData = useCallback(() => {
    return formData.title.trim() || 
           formData.description.trim() || 
           formData.price.trim() || 
           formData.address.trim() ||
           formData.count_people !== '1';
  }, [formData]);

  // Обработчик кнопки "Назад"
  const handleGoBack = useCallback(() => {
    if (isLoading) {
      Alert.alert('Подождите', 'Идет создание задачи...');
      return;
    }

    if (hasUnsavedData()) {
      Alert.alert(
        'Несохраненные данные',
        'У вас есть несохраненные изменения. Вы уверены, что хотите выйти?',
        [
          { text: 'Остаться', style: 'cancel' },
          { 
            text: 'Выйти', 
            style: 'destructive',
            onPress: () => {
              // Очищаем состояние перед выходом
              setIsLoading(false);
              setShowDatePicker(false);
              setShowTimeFromPicker(false);
              setShowTimeToPicker(false);
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [isLoading, hasUnsavedData, navigation]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Создать задачу</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Тестовая кнопка */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTest}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Тест кнопки</Text>
          </TouchableOpacity>

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
              numberOfLines={3}
              maxLength={200}
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
              <Text style={styles.label}>Людей нужно</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={formData.count_people}
                onChangeText={(value) => handleInputChange('count_people', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Дата */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Дата *</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.dateTimeText}>{formatDate(formData.date)}</Text>
            </TouchableOpacity>
          </View>

          {/* Время от и до */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Время от *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimeFromPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.dateTimeText}>{formatTime(formData.timeFrom)}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Время до *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimeToPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.dateTimeText}>{formatTime(formData.timeTo)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Адрес */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Адрес *</Text>
            <TextInput
              style={styles.input}
              placeholder="Бишкек, ул. Чуй 123"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              maxLength={200}
            />
          </View>

          {/* Кнопка создания */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Создание...' : 'Создать задачу'}
            </Text>
          </TouchableOpacity>

          {/* Информация */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Задача будет сохранена в базу данных. При отсутствии подключения - локально.
            </Text>
          </View>
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

      {/* Time From Picker */}
      {showTimeFromPicker && (
        <DateTimePicker
          value={formData.timeFrom}
          mode="time"
          display="default"
          onChange={handleTimeFromChange}
        />
      )}

      {/* Time To Picker */}
      {showTimeToPicker && (
        <DateTimePicker
          value={formData.timeTo}
          mode="time"
          display="default"
          onChange={handleTimeToChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    height: 80,
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
    flex: 1,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
    lineHeight: 20,
  },
});