'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LANGUAGE_CHANGE_EVENT,
  UiLanguage,
  isUiLanguage,
  readStoredLanguage,
} from './language'

type MessageCatalog = Partial<Record<UiLanguage, string>>

/**
 * Lightweight UI translation catalogue.
 *
 * This powers the primary surface strings that make language switching visible
 * (hero messaging, primary navigation, footer framework) without pulling a
 * heavy runtime dependency into the web bundle. Keys are namespaced by area:
 * `hero.*`, `nav.*`, `footer.*`.
 *
 * A future migration can move this catalogue into i18next resource files; the
 * `t(key)` contract used by the UI pages stays the same.
 */
export const MESSAGES: Record<string, MessageCatalog> = {
  // ── Prompt 2: Hero Section & Messaging ──
  'hero.headline': {
    en: "India's Direct Freight Operating Network",
    ta: 'இந்தியாவின் நேரடி சரக்கு செயல்பாட்டு நெட்வொர்க்',
    hi: 'भारत का डायरेक्ट फ्रेट ऑपरेटिंग नेटवर्क',
  },
  'hero.subtext': {
    en: "Connecting shippers directly with Vahan-verified lorry owners across India's major highway corridors.",
    ta: 'இந்தியாவின் முக்கிய நெடுஞ்சாலை வழித்தடங்களில் வாகன் சரிபார்க்கப்பட்ட லாரி உரிமையாளர்களுடன் அனுப்புநர்களை நேரடியாக இணைக்கிறது.',
    hi: 'वाहन-सत्यापित लॉरी मालिकों को भारत के प्रमुख राजमार्ग गलियारों में सीधे शिपर्स से जोड़ता है।',
  },
  'hero.findTrucks': {
    en: 'Find Trucks',
    ta: 'சரக்கு வண்டிகள் தேடு',
    hi: 'ट्रक खोजें',
  },
  'hero.findLoads': {
    en: 'Find Loads',
    ta: 'சுமைகள் தேடு',
    hi: 'लोड खोजें',
  },
  'hero.directPortal': {
    en: 'Direct Shipper-Carrier Portal',
    ta: 'நேரடி அனுப்புநர்-வாகன ஓட்டுநர் இணைப்பு',
    hi: 'डायरेक्ट शिपर-कैरियर पोर्टल',
  },
  'hero.zeroBroker': {
    en: 'Zero Broker Fees',
    ta: 'பூஜ்ஜிய பங்குதாரர் கட்டணம்',
    hi: 'शून्य ब्रोकर शुल्क',
  },
  'hero.vahanVerified': { en: 'Vahan API Verified', ta: 'வாகன் API சரிபார்க்கப்பட்டது', hi: 'वाहन API सत्यापित' },
  'hero.radiusMatch': { en: '50km Radius Match', ta: '50km சுற்றுப் பகுதி பொருத்தம்', hi: '50km त्रिज्या मैच' },
  'hero.whatsappAlerts': { en: 'Direct WhatsApp Alerts', ta: 'நேரடி WhatsApp எச்சரிக்கைகள்', hi: 'डायरेक्ट WhatsApp अलर्ट' },
  'hero.zeroCommission': { en: 'Zero Broker Commission', ta: 'பூஜ்ஜிய பங்குதாரர் கமிஷன்', hi: 'शून्य ब्रोकर कमीशन' },

  // ── Prompt 3: Multilingual UI Integration (primary navigation) ──
  'nav.findTrucks': { en: 'Find Trucks', ta: 'சரக்கு வண்டிகள் தேடு', hi: 'ट्रक खोजें' },
  'nav.findLoads': { en: 'Find Loads', ta: 'சுமைகள் தேடு', hi: 'लोड खोजें' },
  'nav.pricing': { en: 'Pricing & Plans', ta: 'விலை & திட்டங்கள்', hi: 'मूल्य और योजनाएँ' },
  'nav.controlTower': { en: 'Control Tower', ta: 'கட்டுப்பாட்டு அறை', hi: 'कंट्रोल टावर' },
  'nav.postFreight': { en: 'Post Freight', ta: 'சரக்குகளை இடுகை', hi: 'फ्रेट पोस्ट करें' },
  'nav.signIn': { en: 'Sign in', ta: 'உள்நுழைக', hi: 'साइन इन करें' },
  'nav.language': { en: 'Language / மொழி', ta: 'மொழி / भाषा', hi: 'भाषा / இடைமுகம்' },
  'nav.profileAccount': { en: 'Profile & account', ta: 'சுயவிவரம் & கணக்கு', hi: 'प्रोफ़ाइल और खाता' },
  'nav.notifications': { en: 'Notifications', ta: 'அறிவிப்புகள்', hi: 'सूचनाएँ' },
  'nav.settings': { en: 'Settings', ta: 'அமைப்புகள்', hi: 'सेटिंग्स' },

  // ── Prompt 7: Footer & Resource Links ──
  'footer.platform': { en: 'PLATFORM', ta: 'தளம்', hi: 'प्लेटफ़ॉर्म' },
  'footer.solutions': { en: 'SOLUTIONS', ta: 'தீர்வுகள்', hi: 'समाधान' },
  'footer.corridors': { en: 'CORRIDORS', ta: 'வழித்தடங்கள்', hi: 'गलियारे' },
  'footer.resources': { en: 'RESOURCES', ta: 'வளங்கள்', hi: 'संसाधन' },
  'footer.company': { en: 'COMPANY', ta: 'நிறுவனம்', hi: 'कंपनी' },
  'footer.support': { en: 'SUPPORT', ta: 'ஆதரவு', hi: 'सहायता' },
  'footer.legal': { en: 'LEGAL', ta: 'சட்டம்', hi: 'कानूनी' },
  'footer.tagline': {
    en: "India's Direct Freight Operating Network. Connecting shippers directly with Vahan-verified lorry owners across India's major highway corridors.",
    ta: 'இந்தியாவின் நேரடி சரக்கு செயல்பாட்டு நெட்வொர்க். இந்தியாவின் முக்கிய நெடுஞ்சாலை வழித்தடங்களில் வாகன் சரிபார்க்கப்பட்ட லாரி உரிமையாளர்களுடன் அனுப்புநர்களை நேரடியாக இணைக்கிறது.',
    hi: 'भारत का डायरेक्ट फ्रेट ऑपरेटिंग नेटवर्क। वाहन-सत्यापित लॉरी मालिकों को भारत के प्रमुख राजमार्ग गलियारों में सीधे शिपर्स से जोड़ता है।',
  },
  'footer.whatsappHelpline': { en: 'WhatsApp Helpline', ta: 'WhatsApp உதவி எண்', hi: 'WhatsApp हेल्पलाइन' },
  'footer.termsOfService': { en: 'Terms of Service', ta: 'சேவை விதிமுறைகள்', hi: 'सेवा की शर्तें' },
  'footer.privacyPolicy': { en: 'Privacy & Data Security', ta: 'தனியுரிமை & தரவு பாதுகாப்பு', hi: 'गोपनीयता और डेटा सुरक्षा' },
}

/** Resolve a key for a language. Falls back to English, then the key itself. */
export function translate(key: string, language?: UiLanguage): string {
  const catalog = MESSAGES[key]
  const lang = language || readStoredLanguage()
  return catalog?.[lang] || catalog?.en || key
}

export interface I18nApi {
  language: UiLanguage
  t: (key: string) => string
}

/**
 * React binding that mirrors the language toggle.
 *
 * Reads the persisted language on mount and keeps the value in sync when the
 * toggle (or another mounted component) broadcasts a change.
 */
export function useI18n(): I18nApi {
  const [language, setLanguage] = useState<UiLanguage>('en')

  useEffect(() => {
    setLanguage(readStoredLanguage())

    const handleExternalChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isUiLanguage(detail)) setLanguage(detail)
    }
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
  }, [])

  const t = useCallback((key: string) => translate(key, language), [language])
  return { language, t }
}
