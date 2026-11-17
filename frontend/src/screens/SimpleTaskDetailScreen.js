import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TasksContext';

export default function SimpleTaskDetailScreen({ route, navigation }) {
  const { task } = route.params || {};
  const { applyToTask, hasAppliedToTask } = useTasks();
  const [isApplied, setIsApplied] = useState(false);

  // Если задача не передана, используем тестовые данные
  const taskData = task || {
    id: 1,
    title: 'Уборка квартиры',
    price: 5000,
    count_people: 2,
    date: '2024-09-15',
    time_from: '10:00',
    time_to: '14:00',
    address: 'Бишкек, ул. Чуй 123',
    description: 'Нужна уборка 3-комнатной квартиры. Включить мытье окон, полов, санузла. Работа займет примерно 4-5 часов.',
    status: 'active',
    employer: 'Айгуль К.',
    rating: 4.8,
    phone: '+996555123456',
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Время не указано';
    return timeString.slice(0, 5);
  };

  const formatTimeRange = (timeFrom, timeTo) => {
    if (timeFrom && timeTo) {
      return `${formatTime(timeFrom)} - ${formatTime(timeTo)}`;
    }
    return timeFrom ? formatTime(timeFrom) : 'Время не указано';
  };

  const handleApply = () => {
    const alreadyApplied = hasAppliedToTask(taskData.id);
    
    if (alreadyApplied || isApplied) {
      Alert.alert('Информация', 'Вы уже откликнулись на эту задачу');
      return;
    }

    if (taskData.isMyTask) {
      Alert.alert('Информация', 'Это ваша собственная задача');
      return;
    }

    Alert.alert(
      'Откликнуться на задачу',
      `Вы хотите откликнуться на задачу "${taskData.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Да, откликнуться', 
          onPress: () => {
            const success = applyToTask(taskData.id);
            if (success) {
              setIsApplied(true);
              Alert.alert('Успешно!', 'Ваш отклик отправлен заказчику. Ожидайте звонка!');
            } else {
              Alert.alert('Ошибка', 'Не удалось отправить отклик');
            }
          }
        },
      ]
    );
  };

  const handleContact = () => {
    Alert.alert(
      'Связаться с заказчиком',
      'Выберите способ связи',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Позвонить', 
          onPress: () => Alert.alert('Звонок', `Звоним на ${taskData.phone}`)
        },
        { 
          text: 'Написать в чат', 
          onPress: () => Alert.alert('Чат', 'Переход в чат с заказчиком')
        },
      ]
    );
  };

  const handleAddToMyTasks = () => {
    Alert.alert(
      'Добавить в мои задачи',
      'Эта задача будет добавлена в ваш список для отслеживания',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Добавить', 
          onPress: () => {
            Alert.alert('Успешно!', 'Задача добавлена в ваш список');
            // Здесь можно добавить логику сохранения в AsyncStorage
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали задачи</Text>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleAddToMyTasks}
        >
          <Ionicons name="bookmark-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Main Info */}
        <View style={styles.mainCard}>
          <View style={styles.titleRow}>
            <Text style={styles.taskTitle}>{taskData.title}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Активна</Text>
            </View>
          </View>
          
          <Text style={styles.taskPrice}>{taskData.price} сом</Text>
          
          {taskData.description && (
            <Text style={styles.description}>{taskData.description}</Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Детали работы</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#007AFF" />
            <Text style={styles.detailLabel}>Требуется людей:</Text>
            <Text style={styles.detailValue}>{taskData.count_people}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.detailLabel}>Дата:</Text>
            <Text style={styles.detailValue}>{formatDate(taskData.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.detailLabel}>Время:</Text>
            <Text style={styles.detailValue}>
              {taskData.time_from && taskData.time_to 
                ? formatTimeRange(taskData.time_from, taskData.time_to)
                : formatTime(taskData.time || taskData.time_from)
              }
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <Text style={styles.detailLabel}>Адрес:</Text>
            <Text style={styles.detailValue}>{taskData.address}</Text>
          </View>
        </View>

        {/* Employer Info */}
        <View style={styles.employerCard}>
          <Text style={styles.sectionTitle}>Заказчик</Text>
          
          <View style={styles.employerInfo}>
            <View style={styles.employerAvatar}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
            <View style={styles.employerDetails}>
              <Text style={styles.employerName}>{taskData.employer}</Text>
              <View style={styles.rating}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{taskData.rating}</Text>
                <Text style={styles.ratingCount}>(24 отзыва)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={handleContact}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
          <Text style={styles.contactButtonText}>Связаться</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.applyButton,
            isApplied && styles.appliedButton
          ]}
          onPress={handleApply}
        >
          <Ionicons 
            name={isApplied ? "checkmark-circle" : "checkmark"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.applyButtonText}>
            {isApplied ? 'Отклик отправлен' : 'Откликнуться'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  favoriteButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  taskPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  employerDetails: {
    flex: 1,
  },
  employerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  ratingCount: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'white',
  },
  contactButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  appliedButton: {
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});