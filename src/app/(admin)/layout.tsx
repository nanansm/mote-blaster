import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || (session.user as any).role !== 'owner') redirect('/admin-login')
  return (
    <div className="flex h-screen">
      <AdminSidebar email={(session.user as any).email} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  )
}
