import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Импортируем реальные экраны
// Удалены TasksScreen и SimpleTasksScreen (содержат API вызовы)
import MapScreen from '../screens/MapScreen';
// Удален AddTaskScreen (содержит API вызовы)
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
// Удалены TaskDetailScreen, MyTasksScreen, ConnectionTestScreen (содержат API вызовы)
import NetworkTestScreen from '../screens/NetworkTestScreen';
import SimpleTaskDetailScreen from '../screens/SimpleTaskDetailScreen';
// Удалены SimpleAddTaskScreen, SimpleMyTasksScreen (могут содержать API вызовы)
import UltraSimpleTasksScreen from '../screens/UltraSimpleTasksScreen';
import UltraSimpleAddTaskScreen from '../screens/UltraSimpleAddTaskScreen';
import FastTasksScreen from '../screens/FastTasksScreen';
import OfflineTasksScreen from '../screens/OfflineTasksScreen';
import OfflineMyTasksScreen from '../screens/OfflineMyTasksScreen';
import TaskApplicationsScreen from '../screens/TaskApplicationsScreen';
import EditTaskScreen from '../screens/EditTaskScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for authenticated users
function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'AddTask') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'MyTasks') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{ title: 'Чаты' }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={OfflineTasksScreen}
        options={{ title: 'Задачи' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Карта' }}
      />
      <Tab.Screen 
        name="AddTask" 
        component={UltraSimpleAddTaskScreen}
        options={{ title: 'Создать' }}
      />
      <Tab.Screen 
        name="MyTasks" 
        component={OfflineMyTasksScreen}
        options={{ 
          title: 'Мои задачи',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'briefcase' : 'briefcase-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      <Tab.Screen 
        name="Profile"
        options={{ title: 'Профиль' }}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Main Navigator
export default function MainNavigator({ onLogout }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs">
        {(props) => <MainTabs {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen 
        name="TaskDetail" 
        component={SimpleTaskDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ConnectionTest" 
        component={NetworkTestScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="NetworkTest" 
        component={NetworkTestScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="SimpleTaskDetail" 
        component={SimpleTaskDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      {/* SimpleAddTask удален - содержал API вызовы */}
      <Stack.Screen 
        name="UltraSimpleAddTask" 
        component={UltraSimpleAddTaskScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TaskApplications" 
        component={TaskApplicationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="EditTask" 
        component={EditTaskScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
