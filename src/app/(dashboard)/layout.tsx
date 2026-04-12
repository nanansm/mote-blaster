import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch fresh user data including proExpiresAt (not in better-auth session)
  const [dbUser] = await db
    .select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
    .from(users)
    .where(eq(users.id, session.user.id))

  const userWithPlan = {
    ...(session.user as { name: string; email: string; image?: string | null }),
    plan:         dbUser?.plan ?? 'free',
    proExpiresAt: dbUser?.proExpiresAt ?? null,
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={userWithPlan} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MobileHeader user={userWithPlan} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
