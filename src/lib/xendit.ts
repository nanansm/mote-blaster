const XENDIT_API = 'https://api.xendit.co'
const auth = () => `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString('base64')}`
const headers = () => ({ 'Authorization': auth(), 'Content-Type': 'application/json' })

async function xFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${XENDIT_API}${path}`, { ...init, headers: { ...headers(), ...init?.headers } })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || `Xendit ${res.status}`)
  return body as T
}

export const xendit = {
  createCustomer:     (d: unknown) => xFetch('/customers', { method: 'POST', body: JSON.stringify(d) }),
  createSubscription: (d: unknown) => xFetch('/recurring/plans', { method: 'POST', body: JSON.stringify(d) }),
  cancelSubscription: (id: string) => xFetch(`/recurring/plans/${id}/deactivate`, { method: 'POST' }),
  verifyToken:        (t: string)  => t === process.env.XENDIT_WEBHOOK_TOKEN,
}
