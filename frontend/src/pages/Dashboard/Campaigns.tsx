import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/axios';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from 'sonner';
import { Plus, MoreVertical, Play, Pause, Trash2 } from 'lucide-react';
import { Campaign } from '../../types';
import { cn } from '../../lib/utils';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-text-muted',
  PENDING: 'bg-info',
  RUNNING: 'bg-success',
  COMPLETED: 'bg-success',
  FAILED: 'bg-error',
  PAUSED: 'bg-warning',
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isFree = user?.plan === 'FREE';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });
      const response = await api.get(`/campaigns?${params}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      toast.success('Campaign deleted');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete campaign');
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/campaigns/${id}/start`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Campaign started');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start campaign');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this campaign?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStart = (id: string) => {
    startMutation.mutate(id);
  };

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  if (isFree && pagination.total >= 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Campaigns</h1>
            <p className="text-text-secondary">Manage your message campaigns</p>
          </div>
          <Button onClick={() => navigate('/dashboard/billing')} disabled>
            <Plus className="mr-2 h-4 w-4" />
            Upgrade for Unlimited
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Campaign Limit Reached</h3>
            <p className="text-text-secondary mb-6">
              Free plan allows up to 2 campaigns. Upgrade to Pro for unlimited campaigns.
            </p>
            <Button onClick={() => navigate('/dashboard/billing')}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Campaigns</h1>
          <p className="text-text-secondary">Manage your message campaigns</p>
        </div>
        <Button onClick={() => navigate('/dashboard/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">No Campaigns</h3>
            <p className="text-text-secondary mb-6">
              Create your first campaign to start sending messages.
            </p>
            <Button onClick={() => navigate('/dashboard/campaigns/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {campaigns.map((campaign: Campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <Badge className={cn('text-white', statusColors[campaign.status])}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-text-secondary">
                        Instance: {campaign.instance?.name} | Source: {campaign.contactSource}
                      </div>
                      <div className="text-sm text-text-secondary">
                        Sent: {campaign.sentCount} / {campaign.contactsCount} | Failed: {campaign.failedCount}
                      </div>
                      <div className="text-xs text-text-muted">
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => handleStart(campaign.id)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </Button>
                      )}
                      {campaign.status === 'RUNNING' && (
                        <Button size="sm" variant="outline" disabled>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/dashboard/campaigns/${campaign.id}`}>
                          View Details
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
