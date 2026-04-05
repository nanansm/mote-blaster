import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/axios';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from 'sonner';
import { Plus, Smartphone, Trash2, QrCode, RefreshCw } from 'lucide-react';
import { Instance } from '../../types';

export default function WAConnection() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isFree = user?.plan === 'FREE';

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: instances, isLoading } = useQuery<Instance[]>({
    queryKey: ['instances'],
    queryFn: async () => {
      const response = await api.get('/instances');
      return response.data.instances;
    },
  });

  // Connect instance mutation
  const connectMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await api.post(`/instances/${instanceId}/connect`);
      return response.data;
    },
    onSuccess: (data, _instanceId) => {
      setSelectedInstance(data.instance);
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrModalOpen(true);
      }
      toast.success('Session started. Scan the QR code to connect.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to connect instance');
    },
  });

  // Delete instance mutation
  const deleteMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      await api.delete(`/instances/${instanceId}`);
    },
    onSuccess: () => {
      toast.success('Instance deleted');
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete instance');
    },
  });

  // Create instance mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/instances', { name });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Instance created');
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create instance');
    },
  });

  // Get QR code polling
  useEffect(() => {
    if (!selectedInstance || !qrModalOpen) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/instances/${selectedInstance.id}/qr`);
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
        }
      } catch (e) {
        console.error('Failed to fetch QR:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedInstance, qrModalOpen]);

  const handleConnect = (instance: Instance) => {
    connectMutation.mutate(instance.id);
  };

  const handleDelete = (instance: Instance) => {
    if (window.confirm(`Delete instance "${instance.name}"? This will disconnect the WhatsApp session.`)) {
      deleteMutation.mutate(instance.id);
    }
  };

  const handleCreateInstance = () => {
    const name = prompt('Enter instance name:');
    if (name) {
      createMutation.mutate(name);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge variant="success">Connected</Badge>;
      case 'CONNECTING':
        return <Badge variant="warning">Connecting...</Badge>;
      case 'QR_CODE':
        return <Badge variant="info">QR Ready</Badge>;
      case 'ERROR':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="default">Disconnected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">WhatsApp Connections</h1>
          <p className="text-text-secondary">Manage your WhatsApp instances</p>
        </div>
        <Button
          onClick={handleCreateInstance}
          disabled={isFree && instances && instances.length >= 1}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Instance
        </Button>
      </div>

      {isFree && instances && instances.length >= 1 && (
        <Card className="border-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">
              Free plan is limited to 1 WhatsApp instance. Upgrade to Pro for up to 5 instances.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : instances && instances.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                  {getStatusBadge(instance.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instance.phoneNumber && (
                    <p className="text-sm text-text-secondary">
                      Phone: {instance.phoneNumber}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleConnect(instance)}
                      disabled={connectMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {instance.status === 'CONNECTED' ? 'Reconnect' : 'Connect'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInstance(instance);
                        setQrModalOpen(true);
                      }}
                      disabled={instance.status !== 'QR_CODE'}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Show QR
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(instance)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="mx-auto h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium mb-2">No WhatsApp Instances</h3>
            <p className="text-text-secondary mb-6">
              Create your first instance to start sending messages
            </p>
            <Button onClick={handleCreateInstance}>
              <Plus className="mr-2 h-4 w-4" />
              Add Instance
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Open WhatsApp on your phone and scan this QR code to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="max-w-full rounded" />
            ) : (
              <Skeleton className="h-64 w-64" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
