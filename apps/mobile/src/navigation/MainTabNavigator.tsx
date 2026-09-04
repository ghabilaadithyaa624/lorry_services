import React from 'react'
import { Text } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { HomeScreen } from '../screens/HomeScreen'
import { MyTripScreen } from '../screens/MyTripScreen'
import { DriverTripScreen } from '../screens/DriverTripScreen'
import { PaymentScreen } from '../screens/PaymentScreen'
import { HelpScreen } from '../screens/HelpScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'

const Tab = createBottomTabNavigator()

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          let icon = '🏠'
          if (route.name === 'Home') icon = '🏠'
          else if (route.name === 'Driver Mode') icon = '🚚'
          else if (route.name === 'My Trips') icon = '📋'
          else if (route.name === 'Payments') icon = '💳'
          else if (route.name === 'Notifications') icon = '🔔'
          else if (route.name === 'Help') icon = '❓'

          return <Text style={{ fontSize: size - 2 }}>{icon}</Text>
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Driver Mode" component={DriverTripScreen} />
      <Tab.Screen name="My Trips" component={MyTripScreen} />
      <Tab.Screen name="Payments" component={PaymentScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Help" component={HelpScreen} />
    </Tab.Navigator>
  )
}
