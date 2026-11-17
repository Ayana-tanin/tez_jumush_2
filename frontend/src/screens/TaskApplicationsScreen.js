import React, { useState, useCallback } from 'react';
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
import { useTasks } from '../context/TasksContext';

export default function TaskApplicationsScreen({ navigation, route }) {
  const { task } = route.params;
  const { 
    getTaskApplications, 
    acceptApplication, 
    rejectApplication 
  } = useTasks();
  
  const [refreshing, setRefreshing] = useState(false);
  const applications = getTaskApplications(task.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Имитация обновления данных
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  const handleAcceptApplication = useCallback((application) => {
    Alert.alert(
      'Принять заявку',
      `Вы хотите принять заявку от ${application.applicantName}?\n\nПосле принятия вы сможете связаться с исполнителем.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Принять',
          onPress: () => {
            acceptApplication(application.id);
            Alert.alert(
              'Заявка принята!',
              `Заявка от ${application.applicantName} принята.\n\nТелефон: ${application.applicantPhone}`,
              [
                { text: 'Позвонить', onPress: () => {
                  // Здесь можно добавить функцию звонка
                  Alert.alert('Звонок', `Звоним на ${application.applicantPhone}`);
                }},
                { text: 'Закрыть' }
              ]
            );
          }
        }
      ]
    );
  }, [acceptApplication]);

  const handleRejectApplication = useCallback((application) => {
    Alert.alert(
      'Отклонить заявку',
      `Вы уверены, что хотите отклонить заявку от ${application.applicantName}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отклонить',
          style: 'destructive',
          onPress: () => {
            rejectApplication(application.id);
            Alert.alert('Готово', 'Заявка отклонена');
          }
        }
      ]
    );
  }, [rejectApplication]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'cancelled': return '#666';
      default: return '#666';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'pending': return 'Ожидает ответа';
      case 'accepted': return 'Принята';
      case 'rejected': return 'Отклонена';
      case 'cancelled': return 'Отменена';
      default: return status;
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const renderApplication = useCallback(({ item }) => (
    <View style={styles.applicationCard}>
      {/* Информация о заявителе */}
      <View style={styles.applicantInfo}>
        <View style={styles.applicantHeader}>
          <Text style={styles.applicantName}>{item.applicantName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.applicantRating}</Text>
          </View>
        </View>
        
        <View style={styles.contactInfo}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.phone}>{item.applicantPhone}</Text>
        </View>
        
        <View style={styles.dateInfo}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.appliedDate}>Откликнулся: {formatDate(item.appliedAt)}</Text>
        </View>
      </View>

      {/* Сообщение от заявителя */}
      {item.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Сообщение:</Text>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      )}

      {/* Статус и действия */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.applicationStatus) }]}>
          <Text style={styles.statusText}>{getStatusText(item.applicationStatus)}</Text>
        </View>

        {item.applicationStatus === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectApplication(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Отклонить</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptApplication(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Принять</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.applicationStatus === 'accepted' && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Alert.alert('Звонок', `Звоним на ${item.applicantPhone}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={16} color="white" />
            <Text style={styles.callButtonText}>Позвонить</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [handleAcceptApplication, handleRejectApplication, getStatusColor, getStatusText, formatDate]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заявки на задачу</Text>
      </View>

      {/* Информация о задаче */}
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskPrice}>{task.price} сом</Text>
      </View>

      {/* Список заявок */}
      {applications.length > 0 ? (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={keyExtractor}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Пока нет заявок</Text>
          <Text style={styles.emptyText}>
            Когда кто-то откликнется на вашу задачу, заявки появятся здесь
          </Text>
        </View>
      )}
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
  taskInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  taskPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicantInfo: {
    marginBottom: 15,
  },
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  phone: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedDate: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});