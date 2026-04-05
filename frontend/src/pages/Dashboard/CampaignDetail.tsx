import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
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
import { Download, ArrowLeft } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-text-muted',
  PENDING: 'bg-info',
  RUNNING: 'bg-success',
  COMPLETED: 'bg-success',
  FAILED: 'bg-error',
  PAUSED: 'bg-warning',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [logStatus, setLogStatus] = useState<string>('ALL');

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await api.get(`/campaigns/${id}`);
      return response.data.campaign;
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['campaign-logs', id, page, logStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(logStatus !== 'ALL' && { status: logStatus }),
      });
      const response = await api.get(`/campaigns/${id}/logs?${params}`);
      return response.data;
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/campaigns/${id}/export`, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${id}-report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    },
    onError: () => {
      toast.error('Failed to download report');
    },
  });

  if (campaignLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Campaign not found</h2>
        <Button onClick={() => navigate('/dashboard/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
            </div>
            <p className="text-text-secondary">
              Instance: {campaign.instance?.name} | Source: {campaign.contactSource}
            </p>
          </div>
        </div>
        <Button onClick={() => exportMutation.mutate()}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.contactsCount}</div>
            <p className="text-sm text-text-muted">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">{campaign.sentCount}</div>
            <p className="text-sm text-text-muted">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">{campaign.failedCount}</div>
            <p className="text-sm text-text-muted">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {campaign.contactsCount > 0
                ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.contactsCount) * 100)
                : 0}%
            </div>
            <p className="text-sm text-text-muted">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Message logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Message Logs</CardTitle>
            <Select value={logStatus} onValueChange={setLogStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logsData?.logs?.length === 0 ? (
            <p className="text-center py-8 text-text-muted">No logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Phone</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Sent At</th>
                    <th className="text-left py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData?.logs?.map((log: any) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-2">{log.contactPhone}</td>
                      <td className="py-2">{log.contactName || '-'}</td>
                      <td className="py-2">
                        <Badge className={statusColors[log.status]}>{log.status}</Badge>
                      </td>
                      <td className="py-2">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-2 text-status-error">{log.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {logsData?.pagination && logsData.pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm">
                Page {logsData.pagination.page} of {logsData.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === logsData.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
