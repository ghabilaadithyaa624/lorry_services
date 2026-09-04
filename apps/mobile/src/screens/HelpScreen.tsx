import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../config'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I book a trip/truck?',
    answer: 'Go to the Home tab, tap on Quick Actions to "Find Trucks" or "Find Loads" depending on your role, choose your destination/truck, and proceed with the booking instructions.',
  },
  {
    id: '2',
    question: 'How is payment processed?',
    answer: 'Payments can be securely handled via our integrated payment system on the Payments tab. We support cards, UPI, and bank transfers.',
  },
  {
    id: '3',
    question: 'Are the drivers/trucks verified?',
    answer: 'Yes, all drivers, carriers, and trucks are thoroughly vetted through our comprehensive KYC process before they can accept listings on LorryCarry.',
  },
]

export function HelpScreen() {
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleFaq = (id: string) => {
    setExpandedFaqId(prev => (prev === id ? null : id))
  }

  /**
   * There is no support-ticket endpoint on the API yet, so the form composes a
   * real email to the support desk rather than pretending a ticket was filed.
   */
  const handleContactSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Please fill in both the Subject and Message fields.')
      return
    }

    setIsSubmitting(true)
    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(`[LorryCarry app] ${subject.trim()}`)}` +
      `&body=${encodeURIComponent(message.trim())}`

    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) throw new Error('unsupported')
      await Linking.openURL(url)
      setSubject('')
      setMessage('')
    } catch {
      Alert.alert(
        'Could not open your email app',
        `Please email us directly at ${SUPPORT_EMAIL} and we will get back to you.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsAppSupport = async () => {
    if (!SUPPORT_PHONE) {
      Alert.alert(
        'WhatsApp support unavailable',
        `WhatsApp support is not configured for this build. Please email ${SUPPORT_EMAIL} instead.`,
      )
      return
    }

    const text = 'Hello LorryCarry Support, I need help with...'
    const deepLink = `whatsapp://send?phone=${SUPPORT_PHONE}&text=${encodeURIComponent(text)}`
    const webLink = `https://wa.me/${SUPPORT_PHONE.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`

    try {
      const supported = await Linking.canOpenURL(deepLink)
      await Linking.openURL(supported ? deepLink : webLink)
    } catch {
      Alert.alert(
        'Could not open WhatsApp',
        `WhatsApp is not available on this device. Please email ${SUPPORT_EMAIL} instead.`,
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Contact us for assistance or read through our FAQs</Text>
        </View>

        {/* WhatsApp Quick Support Link */}
        <TouchableOpacity
          style={styles.whatsappCard}
          onPress={handleWhatsAppSupport}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Chat on WhatsApp"
          accessibilityHint="Opens WhatsApp to start a conversation with our 24/7 support team."
        >
          <Text style={styles.whatsappIcon}>💬</Text>
          <View style={styles.whatsappTextContainer}>
            <Text style={styles.whatsappTitle}>Chat on WhatsApp</Text>
            <Text style={styles.whatsappDesc}>
              {SUPPORT_PHONE ? 'Get a quick response from our support desk' : `Not configured — email ${SUPPORT_EMAIL}`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_DATA.map(item => {
            const isExpanded = expandedFaqId === item.id
            return (
              <View key={item.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(item.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`FAQ Question: ${item.question}`}
                  accessibilityHint="Double tap to expand or collapse the answer."
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqToggleIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* Contact Us Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support Form</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need help with?"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
              accessibilityLabel="Subject Input"
              accessibilityHint="Enter the main subject of your help request."
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please describe your issue in detail..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              accessibilityLabel="Message Input"
              accessibilityHint="Enter the details of your inquiry or problem."
            />

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleContactSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit Support Request"
              accessibilityHint="Submits your inquiry to LorryCarry support team."
              accessibilityState={{ disabled: isSubmitting }}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Opening…' : 'Email Support Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B' },
  sectionHint: { fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 17 },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCF8C6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7E5AE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  whatsappIcon: { fontSize: 32, marginRight: 12 },
  whatsappTextContainer: { flex: 1 },
  whatsappTitle: { fontSize: 16, fontWeight: '700', color: '#075E54' },
  whatsappDesc: { fontSize: 12, color: '#128C7E', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1, paddingRight: 8 },
  faqToggleIcon: { fontSize: 12, color: '#64748B' },
  faqAnswerContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqAnswer: { fontSize: 14, color: '#475569', lineHeight: 20 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  button: {
    backgroundColor: '#F97316',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
})
