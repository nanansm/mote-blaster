import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/axios';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
 DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Subscription } from '../../types';

export default function Billing() {
  const { updatePlan } = useAuthStore();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const response = await api.get('/billing/plans');
      return response.data.plans;
    },
  });

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await api.get('/billing/subscription');
      return response.data.subscription;
    },
  });

  useEffect(() => {
    if (subscription?.status === 'ACTIVE') {
      updatePlan('PRO');
    }
  }, [subscription, updatePlan]);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/billing/subscribe', { planId: 'PRO' });
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create subscription');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post('/billing/cancel');
    },
    onSuccess: () => {
      toast.success('Subscription cancelled');
      updatePlan('FREE');
      setCancelDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'CANCELLED':
        return <Badge variant="error">Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge variant="error">Expired</Badge>;
      case 'UNPAID':
        return <Badge variant="warning">Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Billing</h1>
        <p className="text-text-secondary">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            {getStatusBadge(subscription?.status || 'NONE')}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-medium">Plan:</span>
                  <p className="text-xl font-bold">{subscription.planName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Amount:</span>
                  <p className="text-xl font-bold">
                    Rp {subscription.amount.toLocaleString('id-ID')}/month
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Current Period:</span>
                  <p className="text-sm">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <p>{subscription.status}</p>
                </div>
              </div>
              {subscription.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-4">You are currently on the Free plan.</p>
              <Button onClick={() => subscribeMutation.mutate()}>
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans comparison */}
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {plans?.map((plan: any) => (
          <Card
            key={plan.id}
            className={plan.id === 'PRO' ? 'border-primary' : ''}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name} Plan</CardTitle>
                </div>
                {plan.id === 'PRO' && (
                  <Badge variant="info">Recommended</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-text-muted">{plan.period}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.id === 'PRO' ? (
                subscription?.status === 'ACTIVE' ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => subscribeMutation.mutate()}
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                )
              ) : (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cancel subscription dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your Pro subscription? You'll lose access to Pro features at the end of your billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
