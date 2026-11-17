import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../context/TasksContext';

export default function OfflineTasksScreen({ navigation }) {
  const { 
    allTasks, 
    applyToTask, 
    hasAppliedToTask, 
    getApplicationStatus, 
    cancelApplication 
  } = useTasks();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Загрузка задач (имитация)
  const loadTasks = useCallback(async () => {
    console.log('OfflineTasksScreen: Loading tasks...');
    setIsLoading(true);
    
    // Имитация загрузки
    setTimeout(() => {
      setIsLoading(false);
      console.log('OfflineTasksScreen: Tasks loaded successfully, count:', allTasks.length);
    }, 300);
  }, [allTasks.length]);

  // Обновление списка
  const onRefresh = useCallback(async () => {
    console.log('OfflineTasksScreen: Refreshing...');
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  // Загрузка при фокусе экрана
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  }, []);

  const formatTime = useCallback((timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  }, []);

  const formatTimeRange = useCallback((timeFrom, timeTo) => {
    if (timeFrom && timeTo) {
      return `${formatTime(timeFrom)} - ${formatTime(timeTo)}`;
    }
    // Для обратной совместимости со старыми задачами
    return timeFrom ? formatTime(timeFrom) : 'Время не указано';
  }, [formatTime]);

  const handleTaskPress = useCallback((item) => {
    console.log('Task pressed:', item.title);
    navigation.navigate('SimpleTaskDetail', { task: item });
  }, [navigation]);

  const handleApplyToTask = useCallback((task) => {
    console.log('Apply to task:', task.title);
    
    const applicationStatus = getApplicationStatus(task.id);
    
    // Если уже откликнулись, показываем опции управления откликом
    if (hasAppliedToTask(task.id)) {
      const statusText = {
        pending: 'Ожидает подтверждения',
        accepted: 'Принят заказчиком',
        rejected: 'Отклонен заказчиком',
        cancelled: 'Отменен'
      }[applicationStatus] || 'Неизвестный статус';

      Alert.alert(
        'Управление откликом',
        `Статус: ${statusText}\n\nВы можете отменить свой отклик, если он еще не принят.`,
        [
          { text: 'Закрыть', style: 'cancel' },
          ...(applicationStatus === 'pending' ? [{
            text: 'Отменить отклик',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Подтверждение',
                'Вы уверены, что хотите отменить отклик?',
                [
                  { text: 'Нет', style: 'cancel' },
                  {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: () => {
                      cancelApplication(task.id);
                      Alert.alert('Готово', 'Отклик отменен');
                    }
                  }
                ]
              );
            }
          }] : [])
        ]
      );
      return;
    }

    if (task.isMyTask) {
      Alert.alert('Информация', 'Это ваша собственная задача');
      return;
    }

    Alert.alert(
      'Откликнуться на задачу',
      `Вы хотите откликнуться на задачу "${task.title}"?\n\nВаш отклик будет отправлен заказчику для рассмотрения.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Да, откликнуться', 
          onPress: () => {
            const success = applyToTask(task.id);
            if (success) {
              Alert.alert('Успешно!', 'Ваш отклик отправлен заказчику. Ожидайте подтверждения!');
            } else {
              Alert.alert('Ошибка', 'Не удалось отправить отклик');
            }
          }
        },
      ]
    );
  }, [applyToTask, hasAppliedToTask]);

  const handleAddTask = useCallback(() => {
    console.log('Add task pressed');
    navigation.navigate('UltraSimpleAddTask');
  }, [navigation]);

  const handleSettings = useCallback(() => {
    console.log('Settings pressed');
    navigation.navigate('NetworkTest');
  }, [navigation]);

  const renderTaskItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => handleTaskPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskPrice}>{item.price} сом</Text>
      </View>
      
      {item.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.taskInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.count_people} человека</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.time_from && item.time_to 
              ? formatTimeRange(item.time_from, item.time_to)
              : formatTime(item.time || item.time_from)
            }
          </Text>
        </View>
      </View>
      
      <View style={styles.taskFooter}>
        <Text style={styles.locationText}>{item.address}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Активна</Text>
        </View>
      </View>

      {/* Кнопка отклика */}
      {!item.isMyTask && (
        <TouchableOpacity
          style={[
            styles.applyButton,
            hasAppliedToTask(item.id) && styles.appliedButton
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleApplyToTask(item);
          }}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={hasAppliedToTask(item.id) ? "checkmark-circle" : "add-circle-outline"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.applyButtonText}>
            {(() => {
              if (!hasAppliedToTask(item.id)) return 'Откликнуться';
              const status = getApplicationStatus(item.id);
              switch (status) {
                case 'pending': return 'Ожидает ответа';
                case 'accepted': return 'Принят';
                case 'rejected': return 'Отклонен';
                default: return 'Откликнулись';
              }
            })()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Индикатор своей задачи */}
      {item.isMyTask && (
        <View style={styles.myTaskBadge}>
          <Ionicons name="person" size={16} color="#007AFF" />
          <Text style={styles.myTaskText}>Ваша задача</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [handleTaskPress, handleApplyToTask, hasAppliedToTask, getApplicationStatus, formatDate, formatTimeRange]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Задачи</Text>
          <Text style={styles.headerSubtitle}>Автономный режим</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleAddTask}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSettings}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tasks List */}
      <FlatList
        data={allTasks}
        renderItem={renderTaskItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {isLoading ? 'Загрузка задач...' : 'Пока нет активных задач'}
            </Text>
            {!isLoading && (
              <TouchableOpacity
                style={styles.createTaskButton}
                onPress={handleAddTask}
                activeOpacity={0.8}
              >
                <Text style={styles.createTaskButtonText}>Создать первую задачу</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  listContainer: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  taskPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  taskInfo: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  createTaskButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createTaskButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Стили для кнопки отклика
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  appliedButton: {
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Стили для индикатора своей задачи
  myTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  myTaskText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});