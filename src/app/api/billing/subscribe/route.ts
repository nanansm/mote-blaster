import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { xendit } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const user = session.user as any

    // Create Xendit customer
    const customer = await xendit.createCustomer({
      reference_id: user.id,
      email:        user.email,
      given_names:  user.name,
    }) as any

    // Create recurring plan
    const plan = await xendit.createSubscription({
      reference_id:      `mote-${user.id}`,
      customer_id:       customer.id,
      recurring_action:  'PAYMENT',
      currency:          'IDR',
      amount:            Number(process.env.XENDIT_PRO_PLAN_PRICE || 99000),
      payment_methods:   [{ type: 'QRIS' }],
      schedule:          { reference_id: `sched-${user.id}`, interval: 'MONTH', interval_count: 1 },
      success_return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
      failure_return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?failed=1`,
      metadata:          { userId: user.id },
    }) as any

    return Response.json({ paymentUrl: plan.actions?.find((a: any) => a.action === 'AUTH')?.url ?? plan.redirect_url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
