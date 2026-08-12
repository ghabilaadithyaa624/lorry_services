import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import { authApi } from '../lib/api'

export function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('+919999999999')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null)

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    setDevOtpNotice(null)

    try {
      const res = await authApi.requestOtp(phone, 'whatsapp')
      if (res.data.success) {
        setStep('otp')
        if (res.data.devOtp) {
          setOtp(res.data.devOtp)
          setDevOtpNotice(res.data.devOtp)
        }
      } else {
        setError(res.data.message || 'Failed to send OTP')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (otp.length < 6) {
      setError('Please enter complete 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await authApi.verifyOtp(phone, otp)
      const { accessToken, refreshToken, user } = res.data

      if (user.role !== 'admin') {
        setError('Access denied: Administrator privileges required.')
        setLoading(false)
        return
      }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-surface-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-lg mb-2">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Lorry<span className="text-primary-500">Carry</span> Admin Portal
          </h1>
          <p className="text-xs text-surface-400">
            Operations Command Center & System Management
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 bg-surface-800/90 border border-surface-700/60 shadow-xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {devOtpNotice && (
            <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-semibold flex items-center justify-between">
              <span>Dev OTP Code: <strong className="font-mono text-sm text-primary-400">{devOtpNotice}</strong></span>
              <span className="text-[10px] bg-primary-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Auto-Filled</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">
                  Admin Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919999999999"
                    className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-surface-400 absolute right-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-surface-400 mt-1.5">
                  Default Admin: <code className="text-primary-400 font-mono">+919999999999</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {loading ? 'Sending Code...' : 'Request Authentication Code'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full px-4 py-3.5 bg-surface-900 border border-surface-700 rounded-xl text-white text-center text-2xl tracking-[0.4em] font-mono font-bold focus:outline-none focus:border-primary-500"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
              >
                {loading ? 'Verifying Session...' : 'Sign In as Administrator'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setError(''); }}
                className="w-full text-xs text-surface-400 hover:text-white text-center block pt-2"
              >
                ← Back to phone input
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
