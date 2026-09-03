import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Users,
  CalendarDays,
  ShieldAlert,
  BarChart3,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { authApi } from '../lib/api'
import { formatPhone, cn } from '../lib/utils'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: string
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { path: '/listings', label: 'Listings', icon: Truck },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/bookings', label: 'Bookings', icon: CalendarDays },
  { path: '/disputes', label: 'Dispute Resolution', icon: ShieldAlert },
  { path: '/analytics', label: 'Performance Analytics', icon: BarChart3 },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserState | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Ignore
    }
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // Ignore
    }
    navigate('/login')
  }

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-surface-700/60 shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none text-white">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-0.5">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Admin Profile */}
      <div className="p-4 border-b border-surface-700/60 shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50">
          <div className="w-8 h-8 rounded-full bg-danger-500/20 text-danger-400 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-surface-100 truncate">
              {user?.phone ? formatPhone(user.phone) : 'Administrator'}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger-400">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-500"></span>
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-surface-400 uppercase tracking-widest">
          Management
        </p>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isCurrent(item.path)
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-button text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-surface-400')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-surface-700/60 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-button text-sm font-semibold text-danger-400 hover:bg-danger-500/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </>
  )

  const activeLabel = navItems.find((item) => isCurrent(item.path))?.label || 'Admin'

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col shrink-0 bg-[#0F131D] border-r border-white/10 fixed inset-y-0 left-0 z-30">
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 w-64 bg-[#0F131D] h-full flex flex-col shadow-2xl border-r border-white/10">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#070A11]/90 backdrop-blur-md border-b border-white/10 h-16 flex items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 mr-3 rounded-lg text-surface-300 hover:bg-surface-800 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="lg:hidden w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center text-white text-xs font-black">
              LC
            </div>
            <span className="lg:hidden font-bold text-sm text-white">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-surface-400">
              {activeLabel}
            </h2>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="badge bg-danger-500/10 text-danger-400 border border-danger-500/20">
              ● Admin Live
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
