'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LayoutDashboard, Users, CreditCard, LogOut, Lock, UserCheck } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { authClient } from '@/lib/auth-client'

const navItems = [
  { label: 'Overview',    href: '/admin',             icon: LayoutDashboard },
  { label: 'Subscribers', href: '/admin/subscribers', icon: UserCheck },
  { label: 'All Users',   href: '/admin/users',       icon: Users },
  { label: 'Revenue',     href: '/admin/revenue',     icon: CreditCard },
]

interface AdminMobileHeaderProps {
  email: string
}

export function AdminMobileHeader({ email }: AdminMobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    setOpen(false)
    await authClient.signOut()
    router.push('/admin-login')
  }

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-800 shrink-0">
      <span className="text-lg font-bold text-indigo-400">Mote Blaster</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <SheetContent side="left" className="bg-slate-900 border-r border-slate-800 p-0 flex flex-col text-slate-100">
          <div className="p-6 border-b border-slate-800">
            <span className="text-xl font-bold text-indigo-400">Mote Blaster</span>
            <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
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
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3 text-slate-400">
              <Lock size={14} />
              <p className="text-xs truncate">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 rounded-lg transition-colors min-h-[44px]"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
