'use client'
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LayoutDashboard, Smartphone, Megaphone, CreditCard, MessageSquare, LogOut } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { authClient } from '@/lib/auth-client'
import logoGram from '@/app/logogramsquare.webp'

const navItems = [
  { label: 'Dashboard',         href: '/dashboard',      icon: LayoutDashboard },
  { label: 'WA Connection',     href: '/connection',     icon: Smartphone },
  { label: 'Campaigns',         href: '/campaigns',      icon: Megaphone },
  { label: 'WA Chat Recording', href: '/chat-recording', icon: MessageSquare },
  { label: 'Billing',           href: '/billing',        icon: CreditCard },
]

interface MobileHeaderProps {
  user: {
    name: string
    email: string
    plan?: string
    proExpiresAt?: Date | string | null
  }
}

function isProStillActive(plan?: string, proExpiresAt?: Date | string | null): boolean {
  return plan === 'pro' && proExpiresAt != null && new Date(proExpiresAt) > new Date()
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname        = usePathname()
  const router          = useRouter()
  const proActive       = isProStillActive(user.plan, user.proExpiresAt)

  const handleLogout = async () => {
    setOpen(false)
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-amber-50 border-b border-amber-100 shrink-0">
      <div className="flex items-center gap-2">
        <Image src={logoGram} alt="Mote" width={28} height={28} className="rounded-md" />
        <span className="text-base font-bold text-slate-900">Blaster</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-amber-100"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <SheetContent side="left" className="bg-amber-50 border-r border-amber-100 p-0 flex flex-col">
          <div className="p-6 border-b border-amber-100 flex items-center gap-2">
            <Image src={logoGram} alt="Mote" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold text-slate-900">Blaster</span>
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
                      ? 'bg-amber-100 text-[#1a3a2a] font-semibold'
                      : 'text-slate-600 hover:bg-amber-50 hover:text-[#1a3a2a]'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-amber-600' : 'text-slate-400'} />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-amber-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#1a3a2a] text-[#F5E642] flex items-center justify-center text-sm font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mb-3">
              {proActive ? (
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-[#1a3a2a]">
                    ⭐ Pro Plan
                  </span>
                  {user.proExpiresAt && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
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
