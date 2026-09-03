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

  // ── Prompt 12: Need Load / Need Vehicle forms + dashboard summary ──
  'common.cancel': { en: 'Cancel', ta: 'ரத்து செய்', hi: 'रद्द करें' },
  'dashboard.atAGlance': { en: 'At a glance', ta: 'ஒரு பார்வையில்', hi: 'एक नज़र में' },
  'dashboard.summaryTitle': { en: 'Your freight snapshot', ta: 'உங்கள் சரக்கு நிலவரம்', hi: 'आपका फ्रेट स्नैपशॉट' },
  'dashboard.summaryHint': { en: 'Updated from your latest activity', ta: 'உங்கள் சமீபத்திய செயல்பாட்டிலிருந்து புதுப்பிக்கப்பட்டது', hi: 'आपकी हाल की गतिविधि से अपडेट किया गया' },
  'dashboard.activeBookings': { en: 'Active bookings', ta: 'செயலில் உள்ள முன்பதிவுகள்', hi: 'सक्रिय बुकिंग' },
  'dashboard.activeBookingsHint': { en: 'Trips in progress', ta: 'நடப்பில் உள்ள பயணங்கள்', hi: 'चल रही यात्राएँ' },
  'dashboard.completedTrips': { en: 'Completed trips', ta: 'நிறைவுற்ற பயணங்கள்', hi: 'पूरी हुई यात्राएँ' },
  'dashboard.completedTripsHint': { en: 'Delivered with POD', ta: 'POD உடன் வழங்கப்பட்டது', hi: 'POD के साथ डिलीवर' },
  'dashboard.earnings': { en: 'Earnings', ta: 'வருவாய்', hi: 'कमाई' },
  'dashboard.earningsHint': { en: 'From completed bookings', ta: 'நிறைவுற்ற முன்பதிவுகளிலிருந்து', hi: 'पूरी हुई बुकिंग से' },

  'needLoad.backToDashboard': { en: 'Back to dashboard', ta: 'டாஷ்போர்டுக்குத் திரும்பு', hi: 'डैशबोर्ड पर वापस जाएँ' },
  'needLoad.eyebrow': { en: 'Need load', ta: 'சுமை தேவை', hi: 'लोड चाहिए' },
  'needLoad.stepLabel': { en: 'New freight request', ta: 'புதிய சரக்கு கோரிக்கை', hi: 'नई फ्रेट रिक्वेस्ट' },
  'needLoad.title': { en: 'Tell us what needs moving.', ta: 'நகர்த்த வேண்டிய சரக்கைச் சொல்லுங்கள்.', hi: 'क्या ले जाना है, हमें बताएँ।' },
  'needLoad.subtitle': { en: 'Share the route and cargo details. We’ll match you with Vahan-verified vehicles near your pickup point.', ta: 'வழித்தடம் மற்றும் சரக்கு விவரங்களைப் பகிருங்கள். உங்கள் ஏற்றுமதி இடத்திற்கு அருகிலுள்ள வாகன் சரிபார்க்கப்பட்ட வாகனங்களுடன் இணைப்போம்.', hi: 'रूट और कार्गो विवरण साझा करें। हम आपको पिकअप पॉइंट के पास वाहन-सत्यापित वाहनों से मिलाएँगे।' },
  'needLoad.progressLabel': { en: 'Load request progress', ta: 'சுமை கோரிக்கை முன்னேற்றம்', hi: 'लोड रिक्वेस्ट प्रगति' },
  'needLoad.progressRoute': { en: 'Route', ta: 'வழித்தடம்', hi: 'रूट' },
  'needLoad.progressCargo': { en: 'Cargo', ta: 'சரக்கு', hi: 'कार्गो' },
  'needLoad.progressPublish': { en: 'Publish', ta: 'வெளியிடு', hi: 'प्रकाशित करें' },
  'needLoad.routeTitle': { en: 'Where is the load going?', ta: 'சரக்கு எங்குச் செல்கிறது?', hi: 'लोड कहाँ जाना है?' },
  'needLoad.routeHint': { en: 'Use the city, warehouse, or industrial area name.', ta: 'நகரம், கிடங்கு அல்லது தொழிற்பேட்டை பெயரைப் பயன்படுத்துங்கள்.', hi: 'शहर, वेयरहाउस या औद्योगिक क्षेत्र का नाम लिखें।' },
  'needLoad.verifiedRoute': { en: '50 km matching', ta: '50 கி.மீ பொருத்தம்', hi: '50 किमी मैचिंग' },
  'needLoad.pickup': { en: 'Pickup location', ta: 'ஏற்றுமதி இடம்', hi: 'पिकअप स्थान' },
  'needLoad.pickupPlaceholder': { en: 'e.g. MIDC, Pune', ta: 'எ.கா. MIDC, புனே', hi: 'जैसे MIDC, पुणे' },
  'needLoad.pickupPin': { en: 'Pickup PIN', ta: 'ஏற்றுமதி PIN', hi: 'पिकअप PIN' },
  'needLoad.destination': { en: 'Delivery location', ta: 'இறக்குமதி இடம்', hi: 'डिलीवरी स्थान' },
  'needLoad.destinationPlaceholder': { en: 'e.g. Whitefield, Bengaluru', ta: 'எ.கா. வைட்ஃபீல்ட், பெங்களூரு', hi: 'जैसे व्हाइटफील्ड, बेंगलुरु' },
  'needLoad.destinationPin': { en: 'Delivery PIN', ta: 'இறக்குமதி PIN', hi: 'डिलीवरी PIN' },
  'needLoad.cargoTitle': { en: 'Cargo & trip details', ta: 'சரக்கு & பயண விவரங்கள்', hi: 'कार्गो और यात्रा विवरण' },
  'needLoad.cargoHint': { en: 'Help carriers quote the right vehicle and rate.', ta: 'சரியான வாகனம் மற்றும் கட்டணத்தைத் தேர்வு செய்ய உதவுங்கள்.', hi: 'कैरियर को सही वाहन और रेट बताने में मदद करें।' },
  'needLoad.weight': { en: 'Cargo weight (tonnes)', ta: 'சரக்கு எடை (டன்)', hi: 'कार्गो वजन (टन)' },
  'needLoad.vehicleType': { en: 'Preferred vehicle body', ta: 'விரும்பிய வாகன வகை', hi: 'पसंदीदा वाहन बॉडी' },
  'needLoad.openBody': { en: 'Open body lorry', ta: 'திறந்த உடல் லாரி', hi: 'ओपन बॉडी लॉरी' },
  'needLoad.container': { en: 'Closed container', ta: 'மூடிய கண்டெய்னர்', hi: 'क्लोज्ड कंटेनर' },
  'needLoad.trailer': { en: 'Open body trailer', ta: 'திறந்த டிரெய்லர்', hi: 'ओपन बॉडी ट्रेलर' },
  'needLoad.readyDate': { en: 'Load-ready date & time', ta: 'சரக்கு தயாராகும் தேதி & நேரம்', hi: 'लोड तैयार होने की तारीख और समय' },
  'needLoad.budget': { en: 'Target freight budget', ta: 'இலக்கு சரக்கு கட்டணம்', hi: 'लक्षित फ्रेट बजट' },
  'needLoad.budgetHint': { en: 'Optional — carriers can still quote.', ta: 'விருப்பத்தேர்வு — வாகன உரிமையாளர்கள் கட்டணத்தைத் தெரிவிக்கலாம்.', hi: 'वैकल्पिक — कैरियर फिर भी कोट कर सकते हैं।' },
  'needLoad.urgent': { en: 'Urgent pickup', ta: 'அவசர ஏற்றுமதி', hi: 'तुरंत पिकअप' },
  'needLoad.privacy': { en: 'Your details are shared only with matched carriers.', ta: 'உங்கள் விவரங்கள் பொருத்தமான வாகன உரிமையாளர்களுடன் மட்டுமே பகிரப்படும்.', hi: 'आपका विवरण केवल मैच किए गए कैरियर के साथ साझा किया जाएगा।' },
  'needLoad.publish': { en: 'Publish load request', ta: 'சுமை கோரிக்கையை வெளியிடு', hi: 'लोड रिक्वेस्ट प्रकाशित करें' },
  'needLoad.previewEyebrow': { en: 'Live preview', ta: 'நேரடி முன்னோட்டம்', hi: 'लाइव प्रीव्यू' },
  'needLoad.previewTitle': { en: 'Your request card', ta: 'உங்கள் கோரிக்கை அட்டை', hi: 'आपका रिक्वेस्ट कार्ड' },
  'needLoad.previewRoute': { en: 'Route', ta: 'வழித்தடம்', hi: 'रूट' },
  'needLoad.routePlaceholder': { en: 'Add pickup and delivery to preview your route', ta: 'வழித்தட முன்னோட்டத்திற்கு ஏற்றுமதி மற்றும் இறக்குமதி இடங்களைச் சேர்க்கவும்', hi: 'रूट का प्रीव्यू देखने के लिए पिकअप और डिलीवरी जोड़ें' },
  'needLoad.previewCargo': { en: 'Cargo', ta: 'சரக்கு', hi: 'कार्गो' },
  'needLoad.previewVehicle': { en: 'Body', ta: 'வகை', hi: 'बॉडी' },
  'needLoad.containerShort': { en: 'Container', ta: 'கண்டெய்னர்', hi: 'कंटेनर' },
  'needLoad.openShort': { en: 'Open body', ta: 'திறந்த உடல்', hi: 'ओपन बॉडी' },
  'needLoad.matchNote': { en: 'Matched with nearby verified vehicles', ta: 'அருகிலுள்ள சரிபார்க்கப்பட்ட வாகனங்களுடன் பொருத்தம்', hi: 'पास के सत्यापित वाहनों से मैच' },
  'needLoad.alertNote': { en: 'Get direct quote alerts on WhatsApp', ta: 'WhatsApp-ல் நேரடி கட்டண எச்சரிக்கைகளைப் பெறுங்கள்', hi: 'WhatsApp पर सीधे कोट अलर्ट पाएँ' },
  'needLoad.verifiedNote': { en: 'Zero broker commission', ta: 'பூஜ்ஜிய தரகர் கமிஷன்', hi: 'शून्य ब्रोकर कमीशन' },
  'needLoad.tipTitle': { en: 'A better match starts with a clear route', ta: 'தெளிவான வழித்தடத்துடன் நல்ல பொருத்தம் தொடங்குகிறது', hi: 'बेहतर मैच स्पष्ट रूट से शुरू होता है' },
  'needLoad.tipBody': { en: 'Add a warehouse or industrial area, not just a state name, to help carriers estimate their approach distance.', ta: 'மாநிலத்தின் பெயர் மட்டும் அல்லாமல் கிடங்கு அல்லது தொழிற்பேட்டை பெயரைச் சேர்க்கவும்.', hi: 'सिर्फ राज्य का नाम नहीं, वेयरहाउस या औद्योगिक क्षेत्र जोड़ें ताकि कैरियर दूरी का अनुमान लगा सके।' },
  'needLoad.success': { en: 'Load request published successfully.', ta: 'சுமை கோரிக்கை வெற்றிகரமாக வெளியிடப்பட்டது.', hi: 'लोड रिक्वेस्ट सफलतापूर्वक प्रकाशित हुई।' },
  'needLoad.error': { en: 'We could not publish this request. Please check the details and try again.', ta: 'கோரிக்கையை வெளியிட முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.', hi: 'रिक्वेस्ट प्रकाशित नहीं हो सकी। विवरण जाँचकर फिर कोशिश करें।' },

  'needVehicle.backToDashboard': { en: 'Back to dashboard', ta: 'டாஷ்போர்டுக்குத் திரும்பு', hi: 'डैशबोर्ड पर वापस जाएँ' },
  'needVehicle.eyebrow': { en: 'Need vehicle', ta: 'வாகனம் தேவை', hi: 'वाहन चाहिए' },
  'needVehicle.stepLabel': { en: 'New vehicle profile', ta: 'புதிய வாகன சுயவிவரம்', hi: 'नई वाहन प्रोफ़ाइल' },
  'needVehicle.title': { en: 'Put your vehicle to work.', ta: 'உங்கள் வாகனத்தை வேலைக்கு கொண்டு வாருங்கள்.', hi: 'अपने वाहन को काम पर लगाएँ।' },
  'needVehicle.subtitle': { en: 'Register your lorry once. We’ll surface nearby loads that fit your capacity and preferred corridors.', ta: 'உங்கள் லாரியை ஒருமுறை பதிவு செய்யுங்கள். உங்கள் திறன் மற்றும் விரும்பிய வழித்தடங்களுக்கு ஏற்ற அருகிலுள்ள சுமைகளை நாங்கள் காட்டுவோம்.', hi: 'अपनी लॉरी एक बार रजिस्टर करें। हम आपकी क्षमता और पसंदीदा रूट के अनुसार पास के लोड दिखाएँगे।' },
  'needVehicle.progressLabel': { en: 'Vehicle profile progress', ta: 'வாகன சுயவிவர முன்னேற்றம்', hi: 'वाहन प्रोफ़ाइल प्रगति' },
  'needVehicle.progressVehicle': { en: 'Vehicle', ta: 'வாகனம்', hi: 'वाहन' },
  'needVehicle.progressDetails': { en: 'Details', ta: 'விவரங்கள்', hi: 'विवरण' },
  'needVehicle.progressVerify': { en: 'Verify', ta: 'சரிபார்', hi: 'सत्यापित करें' },
  'needVehicle.vehicleTitle': { en: 'Vehicle identity', ta: 'வாகன அடையாளம்', hi: 'वाहन पहचान' },
  'needVehicle.vehicleHint': { en: 'Use the registration exactly as it appears on the RC.', ta: 'RC-ல் உள்ளபடியே பதிவு எண்ணைப் பயன்படுத்துங்கள்.', hi: 'RC पर जैसा है, वैसा ही रजिस्ट्रेशन लिखें।' },
  'needVehicle.secure': { en: 'Secure & private', ta: 'பாதுகாப்பானது', hi: 'सुरक्षित और निजी' },
  'needVehicle.registration': { en: 'Registration number', ta: 'பதிவு எண்', hi: 'रजिस्ट्रेशन नंबर' },
  'needVehicle.registrationPlaceholder': { en: 'e.g. MH 12 QT 8492', ta: 'எ.கா. MH 12 QT 8492', hi: 'जैसे MH 12 QT 8492' },
  'needVehicle.registrationHint': { en: 'We’ll use this to start Vahan verification.', ta: 'வாகன் சரிபார்ப்பைத் தொடங்க இது பயன்படுத்தப்படும்.', hi: 'इसी से वाहन सत्यापन शुरू होगा।' },
  'needVehicle.bodyType': { en: 'Vehicle body', ta: 'வாகன வகை', hi: 'वाहन बॉडी' },
  'needVehicle.capacity': { en: 'Payload capacity (tonnes)', ta: 'சுமை திறன் (டன்)', hi: 'पेलोड क्षमता (टन)' },
  'needVehicle.openBody': { en: 'Open body lorry', ta: 'திறந்த உடல் லாரி', hi: 'ओपन बॉडी लॉरी' },
  'needVehicle.container': { en: 'Closed container', ta: 'மூடிய கண்டெய்னர்', hi: 'क्लोज्ड कंटेनर' },
  'needVehicle.trailer': { en: 'Open body trailer', ta: 'திறந்த டிரெய்லர்', hi: 'ओपन बॉडी ट्रेलर' },
  'needVehicle.operationTitle': { en: 'Operating profile', ta: 'செயல்பாட்டு சுயவிவரம்', hi: 'ऑपरेटिंग प्रोफ़ाइल' },
  'needVehicle.operationHint': { en: 'Tell us where the vehicle is and how far you’re willing to travel.', ta: 'வாகனம் இருக்கும் இடத்தையும் நீங்கள் செல்லத் தயாராக உள்ள தூரத்தையும் சொல்லுங்கள்.', hi: 'वाहन कहाँ है और आप कितनी दूर जाना चाहते हैं, बताएँ।' },
  'needVehicle.location': { en: 'Current location', ta: 'தற்போதைய இடம்', hi: 'वर्तमान स्थान' },
  'needVehicle.locationPlaceholder': { en: 'e.g. Andheri, Mumbai', ta: 'எ.கா. அந்தேரி, மும்பை', hi: 'जैसे अंधेरी, मुंबई' },
  'needVehicle.radius': { en: 'Service radius', ta: 'சேவை சுற்றளவு', hi: 'सेवा क्षेत्र' },
  'needVehicle.radiusHint': { en: 'How far from this location?', ta: 'இந்த இடத்திலிருந்து எவ்வளவு தூரம்?', hi: 'इस स्थान से कितनी दूर?' },
  'needVehicle.destinations': { en: 'Preferred destinations', ta: 'விரும்பிய இலக்குகள்', hi: 'पसंदीदा गंतव्य' },
  'needVehicle.destinationsPlaceholder': { en: 'Mumbai, Bengaluru, Chennai', ta: 'மும்பை, பெங்களூரு, சென்னை', hi: 'मुंबई, बेंगलुरु, चेन्नई' },
  'needVehicle.destinationsHint': { en: 'Separate multiple cities with commas.', ta: 'பல நகரங்களை காற்புள்ளியால் பிரிக்கவும்.', hi: 'कई शहरों को कॉमा से अलग करें।' },
  'needVehicle.deckLength': { en: 'Deck length', ta: 'டெக் நீளம்', hi: 'डेक लंबाई' },
  'needVehicle.deckHeight': { en: 'Deck height', ta: 'டெக் உயரம்', hi: 'डेक ऊँचाई' },
  'needVehicle.documentsTitle': { en: 'Documents can be added next', ta: 'ஆவணங்களை அடுத்து சேர்க்கலாம்', hi: 'दस्तावेज़ बाद में जोड़ें' },
  'needVehicle.documentsHint': { en: 'Upload your RC book and insurance after registration to become Vahan verified.', ta: 'வாகன் சரிபார்ப்பைப் பெற பதிவு செய்த பிறகு RC புத்தகம் மற்றும் காப்பீட்டை பதிவேற்றவும்.', hi: 'वाहन सत्यापन के लिए रजिस्ट्रेशन के बाद RC बुक और बीमा अपलोड करें।' },
  'needVehicle.uploadLater': { en: 'Go to documents', ta: 'ஆவணங்களுக்குச் செல்', hi: 'दस्तावेज़ पर जाएँ' },
  'needVehicle.privacy': { en: 'Your registration is only used for verification and matching.', ta: 'உங்கள் பதிவு எண் சரிபார்ப்பு மற்றும் பொருத்தத்திற்காக மட்டுமே பயன்படுத்தப்படும்.', hi: 'आपका रजिस्ट्रेशन केवल सत्यापन और मैचिंग के लिए इस्तेमाल होगा।' },
  'needVehicle.register': { en: 'Register vehicle', ta: 'வாகனத்தைப் பதிவு செய்', hi: 'वाहन रजिस्टर करें' },
  'needVehicle.previewEyebrow': { en: 'Profile preview', ta: 'சுயவிவர முன்னோட்டம்', hi: 'प्रोफ़ाइल प्रीव्यू' },
  'needVehicle.previewTitle': { en: 'Ready to match', ta: 'பொருத்தத்திற்கு தயார்', hi: 'मैच के लिए तैयार' },
  'needVehicle.previewRegistration': { en: 'Your registration number', ta: 'உங்கள் பதிவு எண்', hi: 'आपका रजिस्ट्रेशन नंबर' },
  'needVehicle.previewBody': { en: 'Body type', ta: 'வாகன வகை', hi: 'बॉडी प्रकार' },
  'needVehicle.previewCapacity': { en: 'Capacity', ta: 'திறன்', hi: 'क्षमता' },
  'needVehicle.previewRadius': { en: 'Radius', ta: 'சுற்றளவு', hi: 'क्षेत्र' },
  'needVehicle.containerShort': { en: 'Container', ta: 'கண்டெய்னர்', hi: 'कंटेनर' },
  'needVehicle.openShort': { en: 'Open body', ta: 'திறந்த உடல்', hi: 'ओपन बॉडी' },
  'needVehicle.matchNote': { en: 'See loads that fit your vehicle', ta: 'உங்கள் வாகனத்திற்கு ஏற்ற சுமைகளைப் பாருங்கள்', hi: 'अपने वाहन के लिए सही लोड देखें' },
  'needVehicle.verificationNote': { en: 'Vahan verification builds shipper trust', ta: 'வாகன் சரிபார்ப்பு அனுப்புநர் நம்பிக்கையை உருவாக்குகிறது', hi: 'वाहन सत्यापन शिपर का भरोसा बढ़ाता है' },
  'needVehicle.tipTitle': { en: 'Complete your documents next', ta: 'அடுத்து உங்கள் ஆவணங்களை முடிக்கவும்', hi: 'अगले चरण में दस्तावेज़ पूरे करें' },
  'needVehicle.tipBody': { en: 'Verified vehicles get a clear trust badge and are easier for shippers to shortlist.', ta: 'சரிபார்க்கப்பட்ட வாகனங்களுக்கு நம்பிக்கை பேட்ஜ் கிடைக்கும்; அனுப்புநர்கள் எளிதாகத் தேர்வு செய்வார்கள்.', hi: 'सत्यापित वाहनों को भरोसे का बैज मिलता है और शिपर उन्हें आसानी से चुनते हैं।' },
  'needVehicle.success': { en: 'Vehicle registered. Complete documents to start verification.', ta: 'வாகனம் பதிவு செய்யப்பட்டது. சரிபார்ப்பைத் தொடங்க ஆவணங்களை முடிக்கவும்.', hi: 'वाहन रजिस्टर हो गया। सत्यापन शुरू करने के लिए दस्तावेज़ पूरे करें।' },
  'needVehicle.error': { en: 'We could not register this vehicle. Please check the details and try again.', ta: 'வாகனத்தைப் பதிவு செய்ய முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.', hi: 'वाहन रजिस्टर नहीं हो सका। विवरण जाँचकर फिर कोशिश करें।' },
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
