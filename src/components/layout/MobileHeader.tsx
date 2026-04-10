'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LayoutDashboard, Smartphone, Megaphone, CreditCard, LogOut } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { authClient } from '@/lib/auth-client'

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',  icon: LayoutDashboard },
  { label: 'WA Connection', href: '/connection', icon: Smartphone },
  { label: 'Campaigns',     href: '/campaigns',  icon: Megaphone },
  { label: 'Billing',       href: '/billing',    icon: CreditCard },
]

interface MobileHeaderProps {
  user: { name: string; email: string }
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    setOpen(false)
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-blue-50 border-b border-blue-100 shrink-0">
      <span className="text-lg font-bold text-blue-600">Mote Blaster</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-blue-100"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <SheetContent side="left" className="bg-blue-50 border-r border-blue-100 p-0 flex flex-col">
          <div className="p-6 border-b border-blue-100">
            <span className="text-xl font-bold text-blue-600">Mote Blaster</span>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors min-h-[44px]"
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
