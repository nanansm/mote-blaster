import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, Send, Save } from 'lucide-react';
import { Instance, ContactData } from '../../types';

const stepSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  instanceId: z.string().min(1, 'Select a WhatsApp instance'),
});

const formSchema = stepSchema;

type FormData = z.infer<typeof formSchema>;

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [delayVariation, setDelayVariation] = useState(false);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [contactSource, setContactSource] = useState<'CSV' | 'GOOGLE_SHEETS'>('CSV');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);

  const { data: instances } = useQuery<Instance[]>({
    queryKey: ['instances'],
    queryFn: async () => {
      const response = await api.get('/instances');
      return response.data.instances;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(stepSchema),
  });

  const selectedInstance = instances?.find((i) => i.id === watch('instanceId'));

  // Step 2: Upload CSV
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/campaigns/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const contacts = response.data.preview;
      setContacts(contacts);
      toast.success(`Loaded ${response.data.totalCount} contacts`);
      event.target.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload CSV');
    }
  };

  // Step 2: Fetch Google Sheet
  const handleFetchSheet = async () => {
    if (!googleSheetUrl) {
      toast.error('Enter Google Sheet URL');
      return;
    }

    try {
      const response = await api.post('/campaigns/fetch-sheet', { url: googleSheetUrl });
      const contacts = response.data.preview;
      setContacts(contacts);
      toast.success(`Loaded ${response.data.totalCount} contacts from sheet`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch sheet');
    }
  };

  // Step 3: Preview message
  const previewMessage = contacts.length > 0
    ? renderTemplate(messageTemplate, {
        ...contacts[previewIndex],
        name: contacts[previewIndex]?.name || contacts[previewIndex]?.phone || '',
      })
    : '';

  // Step 4: Submit
  const onSubmit = async (data: FormData) => {
    if (contacts.length === 0) {
      toast.error('No contacts loaded');
      return;
    }

    // Create campaign with all contacts
    try {
      const campaignResponse = await api.post('/campaigns', {
        name: data.name,
        instanceId: data.instanceId,
        messageTemplate,
        contactSource,
        contacts,
      });

      toast.success('Campaign created');

      // Start campaign immediately if not draft
      if (messageTemplate) {
        await api.post(`/campaigns/${campaignResponse.data.campaign.id}/start`);
        toast.success('Campaign started!');
      }

      navigate('/dashboard/campaigns');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to create campaign';
      if (error.response?.data?.upgradeRequired) {
        toast.error(errorMsg);
        navigate('/dashboard/billing');
      } else {
        toast.error(errorMsg);
      }
    }
  };

  function renderTemplate(template: string, variables: Record<string, string>) {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    });
    return rendered.replace(/\{\{[^}]+\}\}/g, '');
  }

  const isStep1Valid = !!watch('name') && !!watch('instanceId') && selectedInstance?.status === 'CONNECTED';
  const isStep2Valid = contacts.length > 0;
  const isStep3Valid = messageTemplate.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Create Campaign</h1>
          <p className="text-text-secondary">Set up your WhatsApp blast campaign</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-primary text-white' : 'bg-border text-text-muted'
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div
                className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-border'}`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <Input
                    placeholder="e.g., Summer Sale 2024"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-status-error text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">WhatsApp Instance</label>
                  <select
                    {...register('instanceId')}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select an instance</option>
                    {instances?.map((instance) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.name} ({instance.status})
                      </option>
                    ))}
                  </select>
                  {errors.instanceId && (
                    <p className="text-status-error text-sm mt-1">{errors.instanceId.message}</p>
                  )}
                  {selectedInstance && selectedInstance.status !== 'CONNECTED' && (
                    <p className="text-status-warning text-sm mt-1">
                      Instance must be connected before creating a campaign
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contacts */}
            {step === 2 && (
              <div className="space-y-4">
                <CardHeader>
                  <CardTitle>Import Contacts</CardTitle>
                </CardHeader>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Source</label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={contactSource === 'CSV' ? 'default' : 'outline'}
                        onClick={() => setContactSource('CSV')}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV
                      </Button>
                      <Button
                        type="button"
                        variant={contactSource === 'GOOGLE_SHEETS' ? 'default' : 'outline'}
                        onClick={() => setContactSource('GOOGLE_SHEETS')}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Google Sheets
                      </Button>
                    </div>
                  </div>

                  {contactSource === 'CSV' ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-text-muted mb-4" />
                        <p className="text-sm text-text-secondary">
                          Click to upload a CSV file (max 5MB)
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Google Sheet URL</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={googleSheetUrl}
                          onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        />
                        <Button type="button" onClick={handleFetchSheet}>
                          Fetch
                        </Button>
                      </div>
                      <p className="text-xs text-text-muted">
                        Make sure sharing is set to "Anyone with link can view"
                      </p>
                    </div>
                  )}

                  {contacts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Preview ({contacts.length} total)
                        </span>
                        <select
                          value={previewIndex}
                          onChange={(e) => setPreviewIndex(Number(e.target.value))}
                          className="text-sm border rounded px-2 py-1"
                        >
                          {contacts.map((_, i) => (
                            <option key={i} value={i}>
                              Contact {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Card>
                        <CardContent className="p-4">
                          <pre className="text-sm overflow-auto">
                            {JSON.stringify(contacts[previewIndex], null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Message */}
            {step === 3 && (
              <div className="space-y-4">
                <CardHeader>
                  <CardTitle>Message Template</CardTitle>
                </CardHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Message Template
                    </label>
                    <Textarea
                      placeholder="Hello {{name}}, this is a test message for {{phone}}..."
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Use variables like {'{{name}'}, {'{{phone}'}, {'{{custom1}'} etc.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Preview (first contact)
                    </label>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{previewMessage || 'No message'}</p>
                      </CardContent>
                    </Card>
                    <div className="mt-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={delayVariation}
                          onChange={(e) => setDelayVariation(e.target.checked)}
                          className="rounded"
                        />
                        Add random delay variation (10-30 seconds)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <CardHeader>
                  <CardTitle>Review & Send</CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Campaign Name:</span>
                      <p className="text-sm">{watch('name')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">WhatsApp Instance:</span>
                      <p className="text-sm">{selectedInstance?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Contacts:</span>
                      <p className="text-sm">{contacts.length}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Delay Variation:</span>
                      <p className="text-sm">{delayVariation ? '10-30s random' : 'Fixed 10s'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Message Preview:</span>
                    <Card className="mt-1">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !isStep1Valid) ||
                    (step === 2 && !isStep2Valid) ||
                    (step === 3 && !isStep3Valid)
                  }
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      toast.info('Save as Draft not implemented in demo');
                      // Save as draft
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Now
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
