import type { User } from '@/lib/db/schema'

export function isProActive(user: Pick<User, 'plan' | 'proExpiresAt'>): boolean {
  return (
    user.plan === 'pro' &&
    user.proExpiresAt !== null &&
    user.proExpiresAt !== undefined &&
    new Date(user.proExpiresAt) > new Date()
  )
}
