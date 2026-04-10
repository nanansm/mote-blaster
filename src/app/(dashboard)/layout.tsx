import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={session.user as any} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MobileHeader user={session.user as any} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
