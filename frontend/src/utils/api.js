import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Определение API URL из переменных окружения
const getApiBaseUrl = () => {
  // Используем переменную окружения или fallback
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    console.log('🌐 Using API URL from environment:', envUrl);
    return envUrl;
  }

  // Fallback логика для обратной совместимости
  const LAPTOP_IP = '192.168.79.121';

  if (__DEV__) {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return `http://${LAPTOP_IP}:8000`;
    } else {
      return 'http://localhost:8000';
    }
  }

  return 'http://backend:8000';
};

const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000;
const DEBUG_API = process.env.EXPO_PUBLIC_DEBUG_API_CALLS === 'true';

if (DEBUG_API) {
  console.log('🌐 API_BASE_URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
  console.log('🔧 Development mode:', __DEV__);
  console.log('⏱️ API Timeout:', API_TIMEOUT);
}

class ApiService {
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Ошибка получения токена:', error);
      return null;
    }
  }

  // Проверка подключения к backend
  async checkConnection() {
    try {
      console.log('🔍 Checking backend connection...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд для проверки
      
      const response = await fetch(`${API_BASE_URL}/tasks/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`✅ Backend connection: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.log(`❌ Backend connection failed:`, error.message);
      return false;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      timeout: API_TIMEOUT,
      ...options,
    };

    try {
      if (DEBUG_API) {
        console.log(`🌐 Making request to: ${API_BASE_URL}${endpoint}`);
        console.log(`📤 Request config:`, { method: config.method || 'GET', headers: config.headers });
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        if (DEBUG_API) {
          console.log(`⏰ Request timeout after ${API_TIMEOUT / 1000} seconds`);
        }
        controller.abort();
      }, API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });

      if (DEBUG_API) {
        console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);

      if (error.name === 'AbortError') {
        throw new Error('Превышено время ожидания запроса');
      }

      if (error.message === 'Network request failed') {
        throw new Error('Backend недоступен. Запустите сервер командой: cd backend && python run.py');
      }

      if (error.message && error.message.includes('fetch')) {
        throw new Error('Не удается подключиться к серверу. Проверьте IP адрес в api.js');
      }

      // Обработка случая, когда error является объектом
      if (typeof error === 'object' && error.message) {
        throw new Error(error.message);
      }

      // Если error не является Error объектом
      if (typeof error === 'string') {
        throw new Error(error);
      }

      // Fallback для неизвестных ошибок
      throw new Error('Произошла неизвестная ошибка при выполнении запроса');
    }
  }

  // Методы для работы с задачами
  async getTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/tasks${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async getTasksNearby(lat, lon, radius = 5.0) {
    const params = { lat, lon, radius };
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/tasks/nearby?${queryString}`);
  }

  async getTask(taskId) {
    return this.makeRequest(`/tasks/${taskId}`);
  }

  async createTask(taskData) {
    return this.makeRequest('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId, taskData) {
    return this.makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(taskId) {
    return this.makeRequest(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();