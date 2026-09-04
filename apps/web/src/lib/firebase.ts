import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyC8SW2Lb47NNY_sx_HAePDVZQnMtiDULOA",
  authDomain: "lorry-services-ccbff.firebaseapp.com",
  projectId: "lorry-services-ccbff",
  storageBucket: "lorry-services-ccbff.firebasestorage.app",
  messagingSenderId: "849130422964",
  appId: "1:849130422964:web:7e6094b7535f0131410de1",
  measurementId: "G-GL3V4S9GFK"
}

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Connect to Local Emulator when running on localhost
if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

/**
 * Initializes an invisible reCAPTCHA verifier for phone auth.
 * When the Auth Emulator is connected, reCAPTCHA verification is automatically mocked/bypassed.
 */
export function getRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
  if (typeof window === 'undefined') throw new Error('Window is not defined')
  
  const existing = (window as any).recaptchaVerifier
  if (existing) return existing

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
  ;(window as any).recaptchaVerifier = verifier
  return verifier
}

/**
 * Sends phone OTP via Firebase Auth SDK (intercepted by emulator locally for free).
 */
export async function sendFirebaseOtp(
  phone: string,
  containerId = 'recaptcha-container'
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(containerId)
  return signInWithPhoneNumber(auth, phone, verifier)
}


