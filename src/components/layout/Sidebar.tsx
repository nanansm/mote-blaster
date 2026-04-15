'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Smartphone, Megaphone, CreditCard, MessageSquare, LogOut, Bot } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import logoGram from '@/app/logogramsquare.webp'

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',      icon: LayoutDashboard, badge: null },
  { label: 'Nomor WA',     href: '/connection',     icon: Smartphone,      badge: null },
  { label: 'Kirim Pesan',  href: '/campaigns',      icon: Megaphone,       badge: null },
  { label: 'Catat Chat',   href: '/chat-recording', icon: MessageSquare,   badge: null },
  { label: 'AI Agent',     href: '/ai-agent',       icon: Bot,             badge: 'PRO' },
  { label: 'Langganan',    href: '/billing',        icon: CreditCard,      badge: null },
]

interface SidebarProps {
  user: {
    name: string
    email: string
    image?: string | null
    plan?: string
    proExpiresAt?: Date | string | null
  }
}

function isProStillActive(plan?: string, proExpiresAt?: Date | string | null): boolean {
  return plan === 'pro' && proExpiresAt != null && new Date(proExpiresAt) > new Date()
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const proActive = isProStillActive(user.plan, user.proExpiresAt)

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex w-64 h-full flex-col bg-amber-50 border-r border-amber-100">
      {/* Logo */}
      <div className="p-6 border-b border-amber-100 flex items-center gap-2">
        <Image src={logoGram} alt="Mote" width={32} height={32} className="rounded-lg" />
        <span className="text-xl font-bold text-slate-900">Blaster</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-100 text-[#1a3a2a] font-semibold'
                  : 'text-slate-600 hover:bg-amber-50 hover:text-[#1a3a2a]'
              }`}
            >
              <Icon
                size={18}
                className={active ? 'text-amber-600' : 'text-slate-400'}
              />
              {label}
              {badge && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1a3a2a]">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-amber-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#1a3a2a] text-[#F5E642] flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Plan badge */}
        <div className="mb-3">
          {proActive ? (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-[#1a3a2a]">
                ⭐ Pro Plan
              </span>
              {user.proExpiresAt && (
                <p className="text-[10px] text-slate-400 mt-0.5 pl-0.5">
                  Berlaku hingga:{' '}
                  {new Date(user.proExpiresAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              Free Plan
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
