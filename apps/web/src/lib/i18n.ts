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

  // ── Prompt 2: Post Freight role-aware quick-post modal ──
  'pf.title': {
    en: 'Post Freight',
    ta: 'சரக்கு பதிவு',
    hi: 'फ्रेट पोस्ट करें',
  },
  'pf.subtitle': {
    en: 'Quick post — matching begins within a 50 km radius.',
    ta: 'விரைவு பதிவு — 50 கி.மீ சுற்றளவில் பொருத்தம் தொடங்கும்.',
    hi: 'क्विक पोस्ट — 50 किमी दायरे में मिलान शुरू हो जाता है।',
  },
  'pf.step.role': {
    en: 'Who is posting?',
    ta: 'யார் பதிவிடுகிறார்கள்?',
    hi: 'कौन पोस्ट कर रहा है?',
  },
  'pf.role.factoryOwner': {
    en: 'Factory Owner',
    ta: 'தொழிற்சாலை உரிமையாளர்',
    hi: 'फ़ैक्ट्री मालिक',
  },
  'pf.role.truckOwner': {
    en: 'Truck Owner',
    ta: 'லாரி உரிமையாளர்',
    hi: 'ट्रक मालिक',
  },
  'pf.factory.tagline': {
    en: 'I need a vehicle for my cargo',
    ta: 'எனது சரக்குக்கு வாகனம் தேவை',
    hi: 'मेरे माल के लिए वाहन चाहिए',
  },
  'pf.truck.tagline': {
    en: 'I have a truck and need a load',
    ta: 'என்னிடம் லாரி உள்ளது, சுமை தேவை',
    hi: 'मेरे पास ट्रक है, लोड चाहिए',
  },
  'pf.form.needVehicle': {
    en: 'Need Vehicle',
    ta: 'வாகனம் தேவை',
    hi: 'वाहन चाहिए',
  },
  'pf.form.needLoad': {
    en: 'Need Load',
    ta: 'சுமை தேவை',
    hi: 'लोड चाहिए',
  },
  'pf.field.pincode': {
    en: 'Pickup pincode',
    ta: 'ஏற்றும் பின்கோடு',
    hi: 'पिकअप पिनकोड',
  },
  'pf.field.pincode.placeholder': {
    en: 'e.g. 411018',
    ta: 'எ.கா. 411018',
    hi: 'जैसे 411018',
  },
  'pf.field.destinationPincode': {
    en: 'Destination pincode',
    ta: 'சேரும் பின்கோடு',
    hi: 'डेस्टिनेशन पिनकोड',
  },
  'pf.field.destinationPincode.hint': {
    en: 'Where the freight is going',
    ta: 'சரக்கு எங்கு செல்கிறது',
    hi: 'माल कहाँ जा रहा है',
  },
  'pf.field.tonnage': {
    en: 'Tonnage (tonnes)',
    ta: 'கன அளவு (டன்)',
    hi: 'वहन क्षमता (टन)',
  },
  'pf.field.tonnage.placeholder': {
    en: 'e.g. 16',
    ta: 'எ.கா. 16',
    hi: 'जैसे 16',
  },
  'pf.field.budget': {
    en: 'Budget (₹)',
    ta: 'நிதி ஒதுக்கீடு (₹)',
    hi: 'बजट (₹)',
  },
  'pf.field.budget.placeholder': {
    en: 'e.g. 45000',
    ta: 'எ.கா. 45000',
    hi: 'जैसे 45000',
  },
  'pf.field.advance': {
    en: 'Advance (₹)',
    ta: 'முன்பணம் (₹)',
    hi: 'अग्रिम (₹)',
  },
  'pf.field.advance.placeholder': {
    en: 'e.g. 15000',
    ta: 'எ.கா. 15000',
    hi: 'जैसे 15000',
  },
  'pf.field.advance.hint': {
    en: 'Advance you can pay at loading',
    ta: 'ஏற்றும்போது செலுத்தக்கூடிய முன்பணம்',
    hi: 'लोडिंग पर दिया जाने वाला अग्रिम',
  },
  'pf.field.capacity': {
    en: 'Truck capacity (tonnes)',
    ta: 'லாரி கொள்ளளவு (டன்)',
    hi: 'ट्रक क्षमता (टन)',
  },
  'pf.field.capacity.placeholder': {
    en: 'e.g. 25',
    ta: 'எ.கா. 25',
    hi: 'जैसे 25',
  },
  'pf.field.route': {
    en: 'Preferred route',
    ta: 'விருப்ப வழித்தடம்',
    hi: 'पसंदीदा रूट',
  },
  'pf.field.route.placeholder': {
    en: 'e.g. Chennai → Coimbatore',
    ta: 'எ.கா. சென்னை → கோயம்புத்தூர்',
    hi: 'जैसे चेन्नई → कोयम्बटूर',
  },
  'pf.field.route.hint': {
    en: 'Cities you run between',
    ta: 'நீங்கள் இயக்கும் நகரங்கள்',
    hi: 'वे शहर जिनके बीच आप चलते हैं',
  },
  'pf.field.perKmRate': {
    en: 'Per-km rate (₹/km)',
    ta: 'ஒரு கி.மீ கட்டணம் (₹/கி.மீ)',
    hi: 'प्रति-किमी रेट (₹/किमी)',
  },
  'pf.field.perKmRate.placeholder': {
    en: 'e.g. 38',
    ta: 'எ.கா. 38',
    hi: 'जैसे 38',
  },
  'pf.field.rcUpload': {
    en: 'RC upload',
    ta: 'RC பதிவேற்றம்',
    hi: 'RC अपलोड',
  },
  'pf.field.regNumber': {
    en: 'Vehicle registration number',
    ta: 'வாகன பதிவு எண்',
    hi: 'वाहन पंजीकरण संख्या',
  },
  'pf.field.rcUpload.hint': {
    en: 'Registration Certificate — PDF or photo',
    ta: 'பதிவு சான்றிதழ் — PDF அல்லது புகைப்படம்',
    hi: 'पंजीकरण प्रमाणपत्र — PDF या फोटो',
  },
  'pf.file.choose': {
    en: 'Choose file',
    ta: 'கோப்பு தேர்வு',
    hi: 'फ़ाइल चुनें',
  },
  'pf.file.replace': {
    en: 'Replace',
    ta: 'மாற்று',
    hi: 'बदलें',
  },
  'pf.file.sizeError': {
    en: 'File must be a PDF or image under 10 MB.',
    ta: 'கோப்பு PDF அல்லது 10 MB-க்குள் படமாக இருக்க வேண்டும்.',
    hi: 'फ़ाइल PDF या 10 MB से कम की छवि होनी चाहिए।',
  },
  'pf.auth.title': {
    en: 'Sign in to post freight',
    ta: 'பதிவிட உள்நுழைக',
    hi: 'फ्रेट पोस्ट करने के लिए साइन इन करें',
  },
  'pf.auth.body': {
    en: 'Your account type opens the right quick-post form — Need Vehicle for factory owners, Need Load for truck owners.',
    ta: 'உங்கள் கணக்கு வகை சரியான விரைவு படிவத்தைத் திறக்கும் — தொழிற்சாலை உரிமையாளர்களுக்கு வாகனம் தேவை, லாரி உரிமையாளர்களுக்கு சுமை தேவை.',
    hi: 'आपका खाता प्रकार सही क्विक-पोस्ट फ़ॉर्म खोलता है — फ़ैक्ट्री मालिकों के लिए वाहन चाहिए, ट्रक मालिकों के लिए लोड चाहिए।',
  },
  'pf.back': {
    en: 'Back',
    ta: 'பின் செல்',
    hi: 'वापस',
  },
  'pf.done': {
    en: 'Done',
    ta: 'முடிந்தது',
    hi: 'ठीक है',
  },
  'pf.rc.recommended': {
    en: 'Recommended — speeds up Vahan verification',
    ta: 'பரிந்துரைக்கப்படுகிறது — வாகன் சரிபார்ப்பை விரைவுபடுத்தும்',
    hi: 'अनुशंसित — वाहन सत्यापन तेज़ करता है',
  },
  'pf.submit.needVehicle': {
    en: 'Post vehicle requirement',
    ta: 'வாகன தேவையை பதிவிடு',
    hi: 'वाहन आवश्यकता पोस्ट करें',
  },
  'pf.submit.needLoad': {
    en: 'Post vehicle availability',
    ta: 'வாகன கிடைப்பை பதிவிடு',
    hi: 'वाहन उपलब्धता पोस्ट करें',
  },
  'pf.submitting': {
    en: 'Posting…',
    ta: 'பதிவிடுகிறது…',
    hi: 'पोस्ट हो रहा है…',
  },
  'pf.success.load.title': {
    en: 'Requirement posted',
    ta: 'தேவை பதிவிடப்பட்டது',
    hi: 'आवश्यकता पोस्ट हुई',
  },
  'pf.success.load.body': {
    en: 'Verified lorry owners within 50 km are being notified on WhatsApp.',
    ta: '50 கி.மீ-க்குள் சரிபார்க்கப்பட்ட லாரி உரிமையாளர்களுக்கு WhatsApp-ல் அறிவிப்பு அனுப்பப்படுகிறது.',
    hi: '50 किमी के भीतर सत्यापित ट्रक मालिकों को WhatsApp पर सूचित किया जा रहा है।',
  },
  'pf.success.truck.title': {
    en: 'Vehicle registered',
    ta: 'வாகனம் பதிவு செய்யப்பட்டது',
    hi: 'वाहन पंजीकृत हुआ',
  },
  'pf.success.truck.body': {
    en: 'Your truck is in for Vahan verification and will start matching loads.',
    ta: 'உங்கள் லாரி வாகன் சரிபார்ப்பில் உள்ளது; சுமைகளுடன் பொருத்தம் தொடங்கும்.',
    hi: 'आपका ट्रक वाहन सत्यापन में है और लोड मिलान शुरू हो जाएगा।',
  },
  'pf.success.viewLoads': {
    en: 'View my loads',
    ta: 'எனது சுமைகளைப் பார்',
    hi: 'मेरे लोड देखें',
  },
  'pf.success.viewTrucks': {
    en: 'View my trucks',
    ta: 'எனது லாரிகளைப் பார்',
    hi: 'मेरे ट्रक देखें',
  },
  'pf.error.load': {
    en: 'Could not post the requirement. Check the details and try again.',
    ta: 'தேவையை பதிவிட முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    hi: 'आवश्यकता पोस्ट नहीं हो सकी। विवरण जाँचकर फिर से प्रयास करें।',
  },
  'pf.error.truck': {
    en: 'Could not register the vehicle. Please try again.',
    ta: 'வாகனத்தை பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    hi: 'वाहन पंजीकृत नहीं हो सका। कृपया फिर से प्रयास करें।',
  },

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
  'footer.whatsappTooltip': {
    en: 'Chat with LorryCarry Support on WhatsApp',
    ta: 'LorryCarry ஆதரவுடன் WhatsApp-இல் அரட்டையடிக்கவும்',
    hi: 'WhatsApp पर LorryCarry सहायता से चैट करें',
  },
  'footer.quickPostLoad': { en: 'Post Load', ta: 'சரக்கு அனுப்புக', hi: 'लोड पोस्ट करें' },
  'footer.quickFindTruck': { en: 'Find Truck', ta: 'சரக்கு வண்டி தேடு', hi: 'ट्रक खोजें' },
  'footer.quickContactSupport': { en: 'Contact Support', ta: 'ஆதரவைத் தொடர்பு கொள்ள', hi: 'सहायता से संपर्क करें' },
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
