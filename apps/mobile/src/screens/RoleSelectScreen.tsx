import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../navigation/types'
import { authApi, setTokens } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

type RoleSelectScreenRouteProp = RouteProp<AuthStackParamList, 'RoleSelect'>
type RoleSelectScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleSelect'>

interface RoleSelectProps {
  route: RoleSelectScreenRouteProp
  navigation: RoleSelectScreenNavigationProp
}

export function RoleSelectScreen({ route, navigation }: RoleSelectProps) {
  const { phone, otp } = route.params
  const [selectedRole, setSelectedRole] = useState<'factory_owner' | 'truck_driver' | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async () => {
    if (!selectedRole || !phone || !otp) return

    setLoading(true)
    try {
      const res = await authApi.verifyOtp(phone, otp, selectedRole)
      const { accessToken, refreshToken, user } = res.data

      setTokens(accessToken, refreshToken)
      login(accessToken, refreshToken, user)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to create account')
      } else if (err instanceof Error) {
        Alert.alert('Error', err.message || 'Failed to create account')
      } else {
        Alert.alert('Error', 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>How will you use LorryCarry?</Text>
        <Text style={styles.subtitle}>
          Select your role (can't be changed later)
        </Text>

        {/* Factory Owner Option */}
        <TouchableOpacity
          style={[
            styles.card,
            selectedRole === 'factory_owner' && styles.cardActive,
          ]}
          onPress={() => setSelectedRole('factory_owner')}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>📦</Text>
          <Text style={styles.cardTitle}>I Need a Truck</Text>
          <Text style={styles.cardDesc}>
            I have goods to transport and need to find verified trucks
          </Text>
        </TouchableOpacity>

        {/* Truck Driver Option */}
        <TouchableOpacity
          style={[
            styles.card,
            selectedRole === 'truck_driver' && styles.cardActive,
          ]}
          onPress={() => setSelectedRole('truck_driver')}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>🚛</Text>
          <Text style={styles.cardTitle}>I Have a Truck</Text>
          <Text style={styles.cardDesc}>
            I own trucks and want to find loads to avoid empty runs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            (!selectedRole || loading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedRole || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  icon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  button: { backgroundColor: '#F97316', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#F97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
