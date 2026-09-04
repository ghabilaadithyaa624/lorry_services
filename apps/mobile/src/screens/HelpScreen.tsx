import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { SUPPORT_EMAIL, SUPPORT_PHONE, WEB_APP_URL } from '../lib/env'
import { useAuth } from '../contexts/AuthContext'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'booking',
    question: 'How does a booking work?',
    answer:
      'A cargo owner books a truck at an agreed price. 50% is paid as a loading advance and the remaining 50% is released after delivery is confirmed. Both milestones are visible under My Trips.',
  },
  {
    id: 'payments',
    question: 'How are subscription payments processed?',
    answer:
      'Subscription payments are handled by a secure payment gateway. Card, UPI and net-banking details are entered on the gateway page, never inside this app. Your plan activates only after the gateway confirms the payment.',
  },
  {
    id: 'trial',
    question: 'What does the free trial include?',
    answer:
      'Every new account gets a 90-day trial with full marketplace access, including contact reveals and bookings. When it ends you can keep browsing, but reveals and new bookings need an active plan.',
  },
  {
    id: 'tracking',
    question: 'How does checkpoint tracking work?',
    answer:
      'Each trip has five geofenced checkpoints from loading point to unloading point. The driver records a crossing from Driver Mode when physically inside the geofence; the cargo owner is notified at every milestone.',
  },
  {
    id: 'verification',
    question: 'Are drivers and trucks verified?',
    answer:
      'Trucks go through document verification (RC, insurance, permits) before they appear in search results, and every account is verified by phone OTP.',
  },
]

async function openLink(url: string, failureMessage: string) {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Could not open', failureMessage)
  }
}

export function HelpScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

  const toggleFaq = (id: string) => setExpandedFaqId((prev) => (prev === id ? null : id))

  const supportContext = `\n\n—\nAccount: ${user?.phone ?? 'not signed in'}${user?.id ? `\nUser ID: ${user.id}` : ''}`

  const handleWhatsApp = useCallback(async () => {
    if (!SUPPORT_PHONE) return
    const text = `Hello LorryCarry support, I need help with ${supportContext}`
    const digits = SUPPORT_PHONE.replace(/[^\d]/g, '')
    const appUrl = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`
    const webUrl = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    try {
      const canOpenApp = await Linking.canOpenURL(appUrl)
      await Linking.openURL(canOpenApp ? appUrl : webUrl)
    } catch {
      await openLink(webUrl, `WhatsApp is not available on this device. You can message ${SUPPORT_PHONE} directly.`)
    }
  }, [supportContext])

  const handleCall = useCallback(() => {
    if (!SUPPORT_PHONE) return
    openLink(`tel:${SUPPORT_PHONE}`, `Calling is not available on this device. Dial ${SUPPORT_PHONE} from your phone.`)
  }, [])

  const handleEmail = useCallback(() => {
    if (!SUPPORT_EMAIL) return
    const subject = encodeURIComponent('LorryCarry support request')
    const body = encodeURIComponent(`Describe your issue here.${supportContext}`)
    openLink(
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`,
      `No mail app is configured. You can email ${SUPPORT_EMAIL} from any device.`
    )
  }, [supportContext])

  const handleWebsite = useCallback(() => {
    openLink(`${WEB_APP_URL}/help`, 'Could not open the LorryCarry website.')
  }, [])

  const hasAnyContact = Boolean(SUPPORT_PHONE || SUPPORT_EMAIL)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Reach the LorryCarry team or read the FAQs</Text>
        </View>

        {SUPPORT_PHONE ? (
          <TouchableOpacity
            style={styles.whatsappCard}
            onPress={handleWhatsApp}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Chat on WhatsApp"
            accessibilityHint="Opens WhatsApp with a message to LorryCarry support."
          >
            <Text style={styles.whatsappIcon}>💬</Text>
            <View style={styles.flex1}>
              <Text style={styles.whatsappTitle}>Chat on WhatsApp</Text>
              <Text style={styles.whatsappDesc}>{SUPPORT_PHONE}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.contactGrid}>
          {SUPPORT_PHONE ? (
            <TouchableOpacity style={styles.contactCard} onPress={handleCall} accessibilityRole="button" accessibilityLabel="Call support">
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactTitle}>Call</Text>
              <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>
          ) : null}
          {SUPPORT_EMAIL ? (
            <TouchableOpacity style={styles.contactCard} onPress={handleEmail} accessibilityRole="button" accessibilityLabel="Email support">
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactValue} numberOfLines={1}>
                {SUPPORT_EMAIL}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.contactCard} onPress={handleWebsite} accessibilityRole="button" accessibilityLabel="Open help centre on the website">
            <Text style={styles.contactIcon}>🌐</Text>
            <Text style={styles.contactTitle}>Help centre</Text>
            <Text style={styles.contactValue}>Open on the web</Text>
          </TouchableOpacity>
        </View>

        {!hasAnyContact ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Direct support contacts are not configured in this build. Use the web help centre above or contact your
              LorryCarry account manager.
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently asked questions</Text>
          {FAQ_DATA.map((item) => {
            const isExpanded = expandedFaqId === item.id
            return (
              <View key={item.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(item.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={item.question}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqToggleIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {isExpanded ? (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick links</Text>
          <View style={styles.linkCard}>
            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Payments')} accessibilityRole="button">
              <Text style={styles.linkText}>Plans, trial status & payment history</Text>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('My Trips')} accessibilityRole="button">
              <Text style={styles.linkText}>My trips & payment milestones</Text>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Notifications')} accessibilityRole="button">
              <Text style={styles.linkText}>Notifications</Text>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B' },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCF8C6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C7E5AE',
  },
  whatsappIcon: { fontSize: 32, marginRight: 12 },
  whatsappTitle: { fontSize: 16, fontWeight: '700', color: '#075E54' },
  whatsappDesc: { fontSize: 12, color: '#128C7E', marginTop: 2 },
  contactGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  contactCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  contactIcon: { fontSize: 22 },
  contactTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  contactValue: { fontSize: 10, color: '#64748B', textAlign: 'center' },
  noticeCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 24 },
  noticeText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  faqCard: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF' },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1, paddingRight: 8 },
  faqToggleIcon: { fontSize: 12, color: '#64748B' },
  faqAnswerContainer: { padding: 16, paddingTop: 0, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  faqAnswer: { fontSize: 14, color: '#475569', lineHeight: 20, paddingTop: 12 },
  linkCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  linkText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  linkChevron: { fontSize: 20, color: '#94A3B8' },
  linkDivider: { height: 1, backgroundColor: '#F1F5F9' },
})
