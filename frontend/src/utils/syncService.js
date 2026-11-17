// Сервис синхронизации для получения откликов от других пользователей
import ApiService from './api';

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncCallbacks = [];
  }

  // Запуск автоматической синхронизации
  startSync(intervalMs = 30000) { // 30 секунд по умолчанию
    if (this.isRunning) {
      console.log('🔄 Sync already running');
      return;
    }

    console.log('🚀 Starting sync service...');
    this.isRunning = true;
    
    // Первая синхронизация сразу
    this.performSync();
    
    // Затем по интервалу
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  // Остановка синхронизации
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Sync service stopped');
  }

  // Добавить callback для уведомлений о новых данных
  addSyncCallback(callback) {
    this.syncCallbacks.push(callback);
  }

  // Удалить callback
  removeSyncCallback(callback) {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  // Выполнить синхронизацию
  async performSync() {
    try {
      console.log('🔄 Performing sync...');
      
      // Проверяем подключение к backend
      const isConnected = await ApiService.checkConnection();
      if (!isConnected) {
        console.log('❌ Backend not available for sync');
        return;
      }

      // Получаем новые данные с сервера
      const syncData = await this.fetchUpdates();
      
      if (syncData.hasUpdates) {
        console.log('📥 New data received:', syncData);
        
        // Уведомляем всех подписчиков о новых данных
        this.syncCallbacks.forEach(callback => {
          try {
            callback(syncData);
          } catch (error) {
            console.error('Error in sync callback:', error);
          }
        });
      }
      
      this.lastSyncTime = new Date();
      console.log('✅ Sync completed successfully');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  // Получить обновления с сервера
  async fetchUpdates() {
    try {
      // Получаем все задачи
      const allTasks = await ApiService.getTasks();
      
      // Получаем заявки на мои задачи (если API поддерживает)
      // const myApplications = await ApiService.getMyTaskApplications();
      
      // Пока используем моковые данные для демонстрации
      const mockNewApplications = this.generateMockApplications();
      
      return {
        hasUpdates: mockNewApplications.length > 0,
        newTasks: allTasks || [],
        newApplications: mockNewApplications,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error fetching updates:', error);
      return { hasUpdates: false };
    }
  }

  // Генерация моковых заявок для демонстрации
  generateMockApplications() {
    // Случайно генерируем новые заявки
    if (Math.random() > 0.7) { // 30% шанс новой заявки
      const mockNames = ['Алексей М.', 'Мария К.', 'Дмитрий С.', 'Анна П.', 'Игорь Т.'];
      const mockMessages = [
        'Готов выполнить задачу качественно и в срок!',
        'Имею опыт в данной сфере. Могу приступить сегодня.',
        'Профессионально выполню работу. Есть все необходимые инструменты.',
        'Ответственный исполнитель. Гарантирую качество.',
        'Быстро и недорого! Опыт работы 5+ лет.'
      ];
      
      return [{
        id: Date.now() + Math.random(),
        taskId: 101, // ID существующей задачи
        applicantName: mockNames[Math.floor(Math.random() * mockNames.length)],
        applicantRating: (4.0 + Math.random() * 1.0).toFixed(1),
        applicantPhone: `+996${Math.floor(Math.random() * 900000000 + 100000000)}`,
        appliedAt: new Date().toISOString(),
        applicationStatus: 'pending',
        message: mockMessages[Math.floor(Math.random() * mockMessages.length)],
        isNew: true // Флаг для уведомления
      }];
    }
    
    return [];
  }

  // Принудительная синхронизация
  async forcSync() {
    console.log('🔄 Force sync requested');
    await this.performSync();
  }

  // Получить статус синхронизации
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      interval: this.syncInterval ? 30000 : null
    };
  }
}

// Экспортируем singleton
export default new SyncService();