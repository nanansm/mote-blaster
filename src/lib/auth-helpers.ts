import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireUser() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export async function requireOwner() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!session || role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
