import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../navigation/types'
import { authApi, setTokens } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>

interface LoginProps {
  navigation: LoginScreenNavigationProp
}

export function LoginScreen({ navigation }: LoginProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const { login } = useAuth()

  const formatPhone = (input: string) => {
    const cleaned = input.replace(/\D/g, '')
    if (cleaned.length === 10) return `+91${cleaned}`
    if (cleaned.startsWith('+')) return cleaned
    return cleaned
  }

  const requestOtp = async () => {
    const formattedPhone = formatPhone(phone)
    if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit Indian mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.requestOtp(formattedPhone, channel)
      
      if (res.data.success) {
        setStep('otp')
        if (res.data.devOtp) {
          setOtp(res.data.devOtp)
        }
      } else {
        Alert.alert('Error', res.data.message || 'Failed to send OTP')
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    const formattedPhone = formatPhone(phone)
    
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(formattedPhone, otp)
      const { accessToken, refreshToken, user } = res.data

      if (user.isNewUser) {
        // Navigate to role selection
        navigation.navigate('RoleSelect', { phone: formattedPhone, otp })
        return
      }

      // Existing user
      setTokens(accessToken, refreshToken)
      login(accessToken, refreshToken, user)
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Branding */}
          <View style={styles.brandHeader}>
            <Text style={styles.logoText}>LorryCarry</Text>
            <Text style={styles.title}>
              {step === 'phone' ? 'Welcome to LorryCarry' : 'Enter OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone' 
                ? 'Enter your phone number to continue' 
                : `Code sent to ${phone}`}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.prefixBadge}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                {/* Channel Selection */}
                <Text style={styles.channelLabel}>SEND OTP VIA</Text>
                <View style={styles.channelContainer}>
                  <TouchableOpacity
                    style={[
                      styles.channelButton,
                      channel === 'whatsapp' && styles.channelActive,
                    ]}
                    onPress={() => setChannel('whatsapp')}
                  >
                    <Text
                      style={[
                        styles.channelText,
                        channel === 'whatsapp' && styles.channelTextActive,
                      ]}
                    >
                      💬 WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.channelButton,
                      channel === 'sms' && styles.channelActive,
                    ]}
                    onPress={() => setChannel('sms')}
                  >
                    <Text
                      style={[
                        styles.channelText,
                        channel === 'sms' && styles.channelTextActive,
                      ]}
                    >
                      📱 SMS
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    (loading || phone.length < 10) && styles.buttonDisabled,
                  ]}
                  onPress={requestOtp}
                  disabled={loading || phone.length < 10}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Send OTP via {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />

                <TouchableOpacity
                  style={[
                    styles.button,
                    (loading || otp.length < 6) && styles.buttonDisabled,
                  ]}
                  onPress={verifyOtp}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Login</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <TouchableOpacity onPress={() => setStep('phone')}>
                    <Text style={styles.link}>← Change number</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={requestOtp} disabled={loading}>
                    <Text style={styles.link}>Resend OTP</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F97316',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  prefixBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  prefixText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  channelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  channelContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  channelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  channelActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  channelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  channelTextActive: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#F97316',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 8,
  },
  link: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
  },
})
