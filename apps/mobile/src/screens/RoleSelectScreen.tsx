import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
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
import type { RegistrationRole } from '../lib/roles'

interface RoleSelectProps {
  route: RoleSelectScreenRouteProp
  navigation: RoleSelectScreenNavigationProp
}

const roles: Array<{ value: RegistrationRole; icon: string; title: string; caption: string; description: string }> = [
  {
    value: 'factory_owner',
    icon: '🏭',
    title: 'Factory Owner',
    caption: 'SHIP GOODS',
    description: 'Post freight requirements and connect with verified transporters.',
  },
  {
    value: 'truck_driver',
    icon: '🚛',
    title: 'Truck Driver',
    caption: 'ON THE ROAD',
    description: 'List vehicles, find loads, avoid empty runs, and manage bookings.',
  },
]

export function RoleSelectScreen({ route }: RoleSelectProps) {
  const { phone, otp } = route.params
  const [selectedRole, setSelectedRole] = useState<RegistrationRole | null>(null)
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
        Alert.alert('Could not create account', err.response?.data?.message || 'Please request a new code and try again.')
      } else {
        Alert.alert('Could not create account', 'Please request a new code and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progress} accessibilityLabel="Onboarding step 1 of 3">
          <View style={[styles.progressDot, styles.progressDotActive]}><Text style={styles.progressDone}>✓</Text></View>
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, styles.progressDotActive]}><Text style={styles.progressNumber}>2</Text></View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}><Text style={styles.progressNumberMuted}>3</Text></View>
        </View>

        <Text style={styles.eyebrow}>STEP 2 OF 3 · SET UP YOUR WORKSPACE</Text>
        <Text style={styles.title}>What brings you to LorryCarry?</Text>
        <Text style={styles.subtitle}>Choose the role that fits your work. We’ll tailor the tools and dashboard for you.</Text>

        <View style={styles.roles} accessibilityRole="radiogroup" accessibilityLabel="Choose your role">
          {roles.map((role) => {
            const isSelected = selectedRole === role.value
            return (
              <TouchableOpacity
                key={role.value}
                style={[styles.card, isSelected && styles.cardActive]}
                onPress={() => setSelectedRole(role.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select ${role.title}`}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapActive]}><Text style={styles.icon}>{role.icon}</Text></View>
                  <View style={[styles.radio, isSelected && styles.radioActive]}>{isSelected && <View style={styles.radioInner} />}</View>
                </View>
                <Text style={styles.cardCaption}>{role.caption}</Text>
                <Text style={styles.cardTitle}>{role.title}</Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.trialCard}>
          <Text style={styles.trialIcon}>✨</Text>
          <View style={styles.trialCopy}>
            <Text style={styles.trialTitle}>90 days of full access, on us</Text>
            <Text style={styles.trialDescription}>No card required. Your trial begins as soon as your account is verified.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!selectedRole || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedRole || loading}
          accessibilityRole="button"
          accessibilityLabel={selectedRole ? `Create ${roles.find((role) => role.value === selectedRole)?.title} account with a 90 day free trial` : 'Choose a role to continue'}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{selectedRole ? `Start 90-day trial as ${roles.find((role) => role.value === selectedRole)?.title}` : 'Choose a role to continue'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flexGrow: 1, padding: 24, paddingVertical: 32 },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  progressDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: '#F97316' },
  progressDone: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  progressNumber: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  progressNumberMuted: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  progressLine: { width: 38, height: 2, backgroundColor: '#F97316' },
  eyebrow: { color: '#C2410C', fontSize: 10, fontWeight: '800', textAlign: 'center', letterSpacing: 1.1, marginBottom: 10 },
  title: { fontSize: 27, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginTop: 10, marginBottom: 24 },
  roles: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 42, height: 42, backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: '#F97316' },
  icon: { fontSize: 21 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#F97316', backgroundColor: '#F97316' },
  radioInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  cardCaption: { color: '#EA580C', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 12 },
  cardTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginTop: 3 },
  cardDesc: { color: '#64748B', fontSize: 13, lineHeight: 18, marginTop: 4 },
  trialCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', padding: 15, borderRadius: 16, marginTop: 18 },
  trialIcon: { fontSize: 20 },
  trialCopy: { flex: 1 },
  trialTitle: { color: '#9A3412', fontSize: 14, fontWeight: '800' },
  trialDescription: { color: '#9A3412', opacity: 0.8, fontSize: 12, lineHeight: 17, marginTop: 3 },
  button: { backgroundColor: '#F97316', minHeight: 52, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 18, shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 3 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center', paddingHorizontal: 12 },
})
