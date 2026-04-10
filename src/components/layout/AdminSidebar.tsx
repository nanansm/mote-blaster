'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard, LogOut, Lock, UserCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const navItems = [
  { label: 'Overview',    href: '/admin',              icon: LayoutDashboard },
  { label: 'Subscribers', href: '/admin/subscribers',  icon: UserCheck },
  { label: 'All Users',   href: '/admin/users',        icon: Users },
  { label: 'Revenue',     href: '/admin/revenue',      icon: CreditCard },
]

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/admin-login')
  }

  return (
    <aside className="hidden md:flex w-64 h-full flex-col bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <span className="text-xl font-bold text-indigo-400">Mote Blaster</span>
        <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Owner section */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3 text-slate-400">
          <Lock size={14} />
          <p className="text-xs truncate">{email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
