import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { MyTripScreen } from './src/screens/MyTripScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { HelpScreen } from './src/screens/HelpScreen';
const Tab = createBottomTabNavigator();
export default function App() {
    return (<SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto"/>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Home" component={HomeScreen}/>
            <Tab.Screen name="My Trips" component={MyTripScreen}/>
            <Tab.Screen name="Payments" component={PaymentScreen}/>
            <Tab.Screen name="Help" component={HelpScreen}/>
          </Tab.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>);
}
//# sourceMappingURL=App.js.map